export type Role = "driver" | "commuter" | "parent";
export type BookingStatus = "pending" | "approved" | "rejected";
export type AttendanceStatus = "waiting" | "boarded" | "dropped";
export type TripStatus = "scheduled" | "in_progress" | "completed";
export type Coordinates = [number, number];

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  role: Role;
  cnic: string;
}

export interface Route {
  id: string;
  driver_id: string;
  vehicle_type: string;
  origin: string;
  destination: string;
  waypoints: string[];
  pickup_time: string;
  drop_time: string;
  total_seats: number;
  available_seats: number;
  monthly_fare_pkr: number;
  is_active: boolean;
  driver_name: string;
  driver_phone: string;
  vehicle_plate: string;
  rating: number;
  trips_count: number;
  verified: boolean;
  coordinates: Coordinates[];
  color: string;
}

export interface Booking {
  id: string;
  route_id: string;
  passenger_id: string;
  passenger_name: string;
  passenger_phone: string;
  parent_phone: string;
  status: BookingStatus;
  boarding_point: string;
  attendance: AttendanceStatus;
  created_at: string;
}

export interface ActiveTrip {
  id: string;
  route_id: string;
  status: TripStatus;
  current_lat: number;
  current_lng: number;
  updated_at: string;
  progress: number;
}

export interface SafetyEvent {
  id: string;
  title: string;
  detail: string;
  time: string;
  type: "arrival" | "boarding" | "safe" | "info" | "sos";
}

export interface RouteDraft {
  origin: string;
  destination: string;
  waypoints: string[];
  vehicle_type: string;
  pickup_time: string;
  drop_time: string;
  total_seats: number;
  monthly_fare_pkr: number;
  coordinates?: Coordinates[];
}

export interface BookingDraft {
  passenger_name: string;
  passenger_phone: string;
  parent_phone: string;
  boarding_point: string;
}

export interface AppData {
  routes: Route[];
  bookings: Booking[];
  trips: ActiveTrip[];
  events: SafetyEvent[];
}
