import type {
  BookingDraft,
  Coordinates,
  Route,
  RouteDraft,
} from "./types";

export function formatFare(amount: number): string {
  if (!Number.isFinite(amount)) return "PKR 0/month";
  return `PKR ${Math.round(amount).toLocaleString("en-US")}/month`;
}

export function formatTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!match) return value;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] === undefined ? 0 : Number(match[3]);
  if (
    !Number.isInteger(hours) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) return value;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${String(displayHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function normalizePhone(value: string): string {
  const raw = value.trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0092")) return `+${digits.slice(2)}`;
  if (digits.startsWith("92")) return `+${digits}`;
  if (digits.startsWith("0")) return `+92${digits.slice(1)}`;
  return `+${digits}`;
}

export function isPakistaniPhone(value: string): boolean {
  const normalized = normalizePhone(value).replace(/\D/g, "");
  return /^923\d{9}$/.test(normalized);
}

function includesText(value: string, search: string): boolean {
  return value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
}

function isValidTime(value: string): boolean {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] === undefined ? 0 : Number(match[3]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59;
}

export function filterRoutes(
  routes: Route[],
  pickup: string,
  destination: string,
  filters: string[],
): Route[] {
  const normalizedFilters = filters.map((filter) => filter.trim().toLocaleLowerCase());
  return routes.filter((route) => {
    const pickupMatches =
      !pickup.trim() ||
      includesText(route.origin, pickup) ||
      route.waypoints.some((waypoint) => includesText(waypoint, pickup));
    const destinationMatches =
      !destination.trim() ||
      includesText(route.destination, destination) ||
      route.waypoints.some((waypoint) => includesText(waypoint, destination));
    if (!pickupMatches || !destinationMatches) return false;

    return normalizedFilters.every((filter) => {
      const vehicle = route.vehicle_type.toLocaleLowerCase();
      if (filter === "ac van") return vehicle.includes("van") && /\bac\b/.test(vehicle);
      if (filter === "car") return /\bcar\b/.test(vehicle) || (!vehicle.includes("van") && /sedan|honda city|toyota corolla|suzuki alto/.test(vehicle));
      if (filter === "under pkr 10,000") return route.monthly_fare_pkr < 10000;
      return false;
    });
  });
}

export function validateBooking(draft: BookingDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.passenger_name.trim()) errors.passenger_name = "Passenger name is required.";
  else if (draft.passenger_name.trim().length < 2) {
    errors.passenger_name = "Enter the passenger's full name.";
  }
  if (!isPakistaniPhone(draft.passenger_phone)) {
    errors.passenger_phone = "Enter a valid Pakistani mobile number.";
  }
  if (!isPakistaniPhone(draft.parent_phone)) {
    errors.parent_phone = "Enter a valid parent Pakistani mobile number.";
  }
  if (!draft.boarding_point.trim()) errors.boarding_point = "Choose a boarding point.";
  return errors;
}

export function validateRoute(draft: RouteDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.origin.trim()) errors.origin = "Origin is required.";
  if (!draft.destination.trim()) errors.destination = "Destination is required.";
  if (!draft.vehicle_type.trim()) errors.vehicle_type = "Vehicle type is required.";
  if (!isValidTime(draft.pickup_time)) {
    errors.pickup_time = "Use a valid pickup time.";
  }
  if (!isValidTime(draft.drop_time)) {
    errors.drop_time = "Use a valid drop time.";
  }
  if (!Number.isInteger(draft.total_seats) || draft.total_seats < 1 || draft.total_seats > 100) {
    errors.total_seats = "Seats must be a whole number from 1 to 100.";
  }
  if (!Number.isFinite(draft.monthly_fare_pkr) || draft.monthly_fare_pkr <= 0) {
    errors.monthly_fare_pkr = "Monthly fare must be greater than zero.";
  }
  return errors;
}

export function interpolateRoute(points: Coordinates[], progress: number): Coordinates {
  if (points.length === 0) return [0, 0];
  if (points.length === 1) return points[0];

  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const segmentCount = points.length - 1;
  const scaled = clamped * segmentCount;
  const segment = Math.min(segmentCount - 1, Math.floor(scaled));
  const segmentProgress = scaled - segment;
  const [startLat, startLng] = points[segment];
  const [endLat, endLng] = points[segment + 1];
  return [
    startLat + (endLat - startLat) * segmentProgress,
    startLng + (endLng - startLng) * segmentProgress,
  ];
}

export function uid(): string {
  const cryptoObject = globalThis.crypto;
  if (cryptoObject?.randomUUID) return cryptoObject.randomUUID();

  const bytes = new Uint8Array(16);
  if (cryptoObject?.getRandomValues) {
    cryptoObject.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
