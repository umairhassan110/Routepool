import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "./supabase";
import type {
  ActiveTrip,
  AttendanceStatus,
  Booking,
  BookingDraft,
  BookingStatus,
  Coordinates,
  Profile,
  Route,
  RouteDraft,
  TripStatus,
} from "./types";
import { normalizePhone, uid, validateBooking, validateRoute } from "./utils";

const ROUTE_COLUMNS =
  "id,driver_id,vehicle_type,origin,destination,waypoints,pickup_time,drop_time,total_seats,available_seats,monthly_fare_pkr,is_active,coordinates,driver:users!routes_driver_id_fkey(full_name)";
const BOOKING_COLUMNS =
  "id,route_id,passenger_id,passenger_name,passenger_phone,parent_phone,status,boarding_point,attendance,created_at";
const TRIP_COLUMNS = "id,route_id,status,current_lat,current_lng,updated_at";

const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = ["waiting", "boarded", "dropped"];

 type RemoteRouteRow = {
  id: string;
  driver_id: string;
  vehicle_type: string;
  origin: string;
  destination: string;
  waypoints: string[] | null;
  pickup_time: string;
  drop_time: string;
  total_seats: number;
  available_seats: number;
  monthly_fare_pkr: number | string;
  is_active: boolean;
  coordinates?: unknown;
  driver?: { full_name?: string | null } | null;
  driver_name?: string | null;
};

type RemoteBookingRow = {
  id: string;
  route_id: string;
  passenger_id: string;
  passenger_name?: string | null;
  passenger_phone?: string | null;
  parent_phone: string;
  status: BookingStatus;
  boarding_point: string;
  attendance?: AttendanceStatus | null;
  created_at: string;
};

type RemoteTripRow = {
  id: string;
  route_id: string;
  status: TripStatus;
  current_lat: number | string;
  current_lng: number | string;
  updated_at: string;
};

type RemoteProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: "driver" | "commuter" | "parent";
  cnic: string | null;
};

type RemoteContext = {
  client: SupabaseClient;
  userId: string;
  profile: Profile;
};

function clientOrThrow(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before using remote data.",
    );
  }
  return supabase;
}

function errorMessage(operation: string, error: unknown): Error {
  let message: string | undefined;
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "object" && error !== null) {
    const candidate = error as {
      message?: unknown;
      error_description?: unknown;
      details?: unknown;
      hint?: unknown;
    };
    if (typeof candidate.message === "string") message = candidate.message;
    else if (typeof candidate.error_description === "string") message = candidate.error_description;
    else if (typeof candidate.details === "string") message = candidate.details;
    else if (typeof candidate.hint === "string") message = candidate.hint;
    else {
      try {
        message = JSON.stringify(error);
      } catch {
        message = undefined;
      }
    }
  } else if (typeof error === "string") {
    message = error;
  }
  return new Error(`Remote ${operation} failed: ${message || "unknown Supabase error"}`);
}

function rowError(operation: string, error: unknown): never {
  throw errorMessage(operation, error ?? { message: "unknown Supabase error" });
}

function toProfile(row: RemoteProfileRow): Profile {
  return {
    id: row.id,
    full_name: row.full_name ?? "",
    phone: row.phone ?? "",
    role: row.role,
    cnic: row.cnic ?? "",
  };
}

function isCoordinate(value: unknown): value is Coordinates {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    value[0] >= -90 &&
    value[0] <= 90 &&
    value[1] >= -180 &&
    value[1] <= 180
  );
}

function parseCoordinates(value: unknown): Coordinates[] {
  let source = value;
  if (typeof source === "string") {
    try {
      source = JSON.parse(source);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(source)) return [];
  const coordinates: Coordinates[] = [];
  for (const point of source) {
    if (!isCoordinate(point)) return [];
    coordinates.push([point[0], point[1]]);
  }
  return coordinates;
}

function coordinatesForDraft(value: RouteDraft["coordinates"]): Coordinates[] {
  if (value === undefined) return [];
  const parsed = parseCoordinates(value);
  if (!Array.isArray(value) || parsed.length !== value.length) {
    throw new Error("Route coordinates must be finite [latitude, longitude] pairs within valid bounds.");
  }
  return parsed;
}

function toRoute(row: RemoteRouteRow): Route {
  const monthlyFare = Number(row.monthly_fare_pkr);
  return {
    id: row.id,
    driver_id: row.driver_id,
    vehicle_type: row.vehicle_type,
    origin: row.origin,
    destination: row.destination,
    waypoints: row.waypoints ?? [],
    pickup_time: row.pickup_time,
    drop_time: row.drop_time,
    total_seats: Number(row.total_seats),
    available_seats: Number(row.available_seats),
    monthly_fare_pkr: Number.isFinite(monthlyFare) ? monthlyFare : 0,
    is_active: Boolean(row.is_active),
    driver_name: row.driver_name ?? row.driver?.full_name ?? "RoutePool driver",
    driver_phone: "",
    vehicle_plate: "",
    rating: 0,
    trips_count: 0,
    verified: false,
    coordinates: parseCoordinates(row.coordinates),
    color: "#10B981",
  };
}

function toBooking(row: RemoteBookingRow, fallback?: Partial<Booking>): Booking {
  return {
    id: row.id,
    route_id: row.route_id,
    passenger_id: row.passenger_id,
    passenger_name: row.passenger_name ?? fallback?.passenger_name ?? "Passenger",
    passenger_phone: row.passenger_phone ?? fallback?.passenger_phone ?? "",
    parent_phone: row.parent_phone,
    status: row.status,
    boarding_point: row.boarding_point,
    attendance: row.attendance ?? "waiting",
    created_at: row.created_at,
  };
}

function toTrip(row: RemoteTripRow): ActiveTrip {
  return {
    id: row.id,
    route_id: row.route_id,
    status: row.status,
    current_lat: Number(row.current_lat),
    current_lng: Number(row.current_lng),
    updated_at: row.updated_at,
    progress: 0,
  };
}

async function requireContext(): Promise<RemoteContext> {
  const client = clientOrThrow();
  const profile = await getRemoteProfile();
  if (!profile) {
    throw new Error("Remote session required. Sign in before using this remote operation.");
  }
  return { client, userId: profile.id, profile };
}

export async function getRemoteProfile(): Promise<Profile | null> {
  const client = clientOrThrow();
  let sessionResult;
  try {
    sessionResult = await client.auth.getSession();
  } catch (error) {
    throw errorMessage("session lookup", error);
  }
  if (sessionResult.error) rowError("session lookup", sessionResult.error);
  const userId = sessionResult.data.session?.user.id;
  if (!userId) return null;

  const { data, error } = await client
    .from("users")
    .select("id,full_name,phone,role,cnic")
    .eq("id", userId)
    .maybeSingle();
  if (error) rowError("profile lookup", error);
  return data ? toProfile(data as RemoteProfileRow) : null;
}

export async function getRemoteData(): Promise<{
  routes: Route[];
  bookings: Booking[];
  trips: ActiveTrip[];
  profile: Profile | null;
}> {
  const profile = await getRemoteProfile();
  const client = clientOrThrow();
  const routesResult = await client.rpc("list_public_routes");
  if (routesResult.error) rowError("public route query", routesResult.error);

  // Anonymous users may search routes, but must never trigger private table queries.
  if (!profile) {
    return {
      routes: ((routesResult.data ?? []) as RemoteRouteRow[]).map(toRoute),
      bookings: [],
      trips: [],
      profile: null,
    };
  }

  const [bookingsResult, tripsResult] = await Promise.all([
    client.from("bookings").select(BOOKING_COLUMNS).order("created_at", { ascending: false }),
    client.from("active_trips").select(TRIP_COLUMNS).order("updated_at", { ascending: false }),
  ]);
  if (bookingsResult.error) rowError("booking query", bookingsResult.error);
  if (tripsResult.error) rowError("trip query", tripsResult.error);

  const routesById = new Map<string, Route>();
  for (const row of (routesResult.data ?? []) as RemoteRouteRow[]) {
    const route = toRoute(row);
    routesById.set(route.id, route);
  }

  // The public RPC deliberately omits inactive routes. RLS permits a driver to read
  // their own routes, so merge those rows without widening public route visibility.
  if (profile.role === "driver") {
    const ownRoutesResult = await client
      .from("routes")
      .select(ROUTE_COLUMNS)
      .eq("driver_id", profile.id);
    if (ownRoutesResult.error) rowError("owned route query", ownRoutesResult.error);
    for (const row of (ownRoutesResult.data ?? []) as RemoteRouteRow[]) {
      const route = toRoute(row);
      if (!routesById.has(route.id)) routesById.set(route.id, route);
    }
  }

  return {
    routes: Array.from(routesById.values()),
    bookings: ((bookingsResult.data ?? []) as RemoteBookingRow[]).map((row) => toBooking(row)),
    trips: ((tripsResult.data ?? []) as RemoteTripRow[]).map(toTrip),
    profile,
  };
}

export async function createRemoteBooking(
  routeId: string,
  draft: BookingDraft,
): Promise<Booking> {
  const errors = validateBooking(draft);
  if (Object.keys(errors).length > 0) {
    throw new Error(`Booking validation failed: ${Object.values(errors).join(" ")}`);
  }
  const { client, userId, profile } = await requireContext();
  if (profile.role !== "commuter" && profile.role !== "parent") {
    throw new Error("Only commuter or parent profiles can create a booking.");
  }

  const passengerName = draft.passenger_name.trim();
  const passengerPhone = normalizePhone(draft.passenger_phone);
  const parentPhone = normalizePhone(draft.parent_phone);
  const { data, error } = await client
    .from("bookings")
    .insert({
      route_id: routeId,
      passenger_id: userId,
      passenger_name: passengerName,
      passenger_phone: passengerPhone,
      parent_phone: parentPhone,
      status: "pending",
      attendance: "waiting",
      boarding_point: draft.boarding_point.trim(),
    })
    .select(BOOKING_COLUMNS)
    .single();
  if (error) rowError("booking creation", error);
  return toBooking(data as RemoteBookingRow, {
    passenger_name: passengerName || profile.full_name,
    passenger_phone: passengerPhone,
  });
}

export async function createRemoteRoute(draft: RouteDraft): Promise<Route> {
  const errors = validateRoute(draft);
  if (Object.keys(errors).length > 0) {
    throw new Error(`Route validation failed: ${Object.values(errors).join(" ")}`);
  }
  const routeCoordinates = coordinatesForDraft(draft.coordinates);
  const { client, userId, profile } = await requireContext();
  if (profile.role !== "driver") {
    throw new Error("Only a driver profile can publish a route.");
  }

  const { data, error } = await client
    .from("routes")
    .insert({
      driver_id: userId,
      vehicle_type: draft.vehicle_type.trim(),
      origin: draft.origin.trim(),
      destination: draft.destination.trim(),
      waypoints: draft.waypoints.map((waypoint) => waypoint.trim()).filter(Boolean),
      pickup_time: draft.pickup_time,
      drop_time: draft.drop_time,
      total_seats: draft.total_seats,
      available_seats: draft.total_seats,
      monthly_fare_pkr: draft.monthly_fare_pkr,
      coordinates: routeCoordinates,
      is_active: true,
    })
    .select(ROUTE_COLUMNS)
    .single();
  if (error) rowError("route creation", error);
  return toRoute(data as RemoteRouteRow);
}

export async function setRemoteTrip(
  route: Route,
  status: TripStatus,
  coords: Coordinates,
): Promise<ActiveTrip> {
  const { client, userId, profile } = await requireContext();
  if (profile.role !== "driver" || route.driver_id !== userId) {
    throw new Error("Only the route's authenticated driver can start or end this trip.");
  }
  if (!Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) {
    throw new Error("Trip coordinates must contain finite latitude and longitude values.");
  }

  const existing = await client
    .from("active_trips")
    .select("id,current_lat,current_lng")
    .eq("route_id", route.id)
    .maybeSingle();
  if (existing.error) rowError("trip lookup", existing.error);

  const savedCoords: Coordinates =
    status === "in_progress" || !existing.data
      ? coords
      : [Number(existing.data.current_lat), Number(existing.data.current_lng)];
  const { data, error } = await client
    .from("active_trips")
    .upsert(
      {
        id: existing.data?.id ?? uid(),
        route_id: route.id,
        status,
        current_lat: savedCoords[0],
        current_lng: savedCoords[1],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "route_id" },
    )
    .select(TRIP_COLUMNS)
    .single();
  if (error) rowError("trip update", error);
  return toTrip(data as RemoteTripRow);
}

export async function updateRemoteCoordinates(
  trip: ActiveTrip,
  coords: Coordinates,
): Promise<void> {
  const { client, userId, profile } = await requireContext();
  if (profile.role !== "driver") {
    throw new Error("Only a driver profile can stream trip coordinates.");
  }
  if (trip.status !== "in_progress") {
    throw new Error("Coordinates can only be updated while a trip is in progress.");
  }
  if (!Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) {
    throw new Error("Trip coordinates must contain finite latitude and longitude values.");
  }

  const { data: routeRow, error: routeError } = await client
    .from("routes")
    .select("driver_id")
    .eq("id", trip.route_id)
    .maybeSingle();
  if (routeError) rowError("trip route authorization", routeError);
  if (!routeRow || routeRow.driver_id !== userId) {
    throw new Error("The authenticated driver does not own this trip route.");
  }

  const { data, error } = await client
    .from("active_trips")
    .update({ current_lat: coords[0], current_lng: coords[1], updated_at: new Date().toISOString() })
    .eq("id", trip.id)
    .eq("route_id", trip.route_id)
    .eq("status", "in_progress")
    .select("id")
    .maybeSingle();
  if (error) rowError("coordinate update", error);
  if (!data) throw new Error("Remote coordinate update affected no in-progress trip.");
}

export async function updateRemoteBooking(
  booking: Booking,
  status: BookingStatus,
): Promise<void> {
  const { client, profile } = await requireContext();
  if (status === "pending") {
    throw new Error("Remote booking decisions must be approved or rejected, not reset to pending.");
  }
  if (profile.role !== "driver") {
    throw new Error("Only an authenticated driver can approve or reject bookings.");
  }

  const { data, error } = await client.rpc("approve_booking", {
    p_booking_id: booking.id,
    p_approved: status === "approved",
  });
  if (error) rowError("booking decision", error);
  if (!data) throw new Error("Remote booking decision returned no booking record.");
}

export async function updateRemoteAttendance(
  booking: Booking,
  status: AttendanceStatus,
): Promise<void> {
  if (!ATTENDANCE_STATUSES.includes(status)) {
    throw new Error("Invalid attendance status.");
  }
  const { client, profile } = await requireContext();
  if (profile.role !== "driver") {
    throw new Error("Only an authenticated driver can update attendance.");
  }
  const { data, error } = await client.rpc("set_booking_attendance", {
    p_booking_id: booking.id,
    p_attendance: status,
  });
  if (error) rowError("attendance update", error);
  if (!data) throw new Error("Remote attendance update returned no booking record.");
}

export function subscribeRemoteTrips(callback: (trip: ActiveTrip) => void): () => void {
  const client = clientOrThrow();
  const channel = client
    .channel(`routepool-active-trips-${uid()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "active_trips" },
      (payload) => {
        if (payload.eventType === "DELETE") return;
        const row = payload.new as unknown as RemoteTripRow;
        if (row?.id && row.route_id && row.status) callback(toTrip(row));
      },
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

export function subscribeRemoteBookings(callback: (booking: Booking) => void): () => void {
  const client = clientOrThrow();
  const channel = client
    .channel(`routepool-bookings-${uid()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "bookings" },
      (payload) => {
        // Realtime payloads are not trusted as an authorization boundary. Fetch the
        // row through RLS so private passenger/parent fields are only delivered when
        // the current session is authorized to see the booking.
        if (payload.eventType === "DELETE") return;
        const row = payload.new as { id?: unknown };
        if (typeof row?.id !== "string") return;
        void (async () => {
          try {
            const { data, error } = await client
              .from("bookings")
              .select(BOOKING_COLUMNS)
              .eq("id", row.id as string)
              .maybeSingle();
            if (error || !data) return;
            callback(toBooking(data as RemoteBookingRow));
          } catch {
            // A concurrent delete or an RLS denial simply means there is no
            // authorized booking row to deliver to this subscriber.
          }
        })();
      },
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
