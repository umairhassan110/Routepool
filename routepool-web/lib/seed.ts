import type {
  ActiveTrip,
  AppData,
  Booking,
  Coordinates,
  Route,
  SafetyEvent,
} from "./types";

export const DEMO_DRIVER_ID = "11111111-1111-4111-8111-111111111111";
export const DEMO_PASSENGER_ID = "22222222-2222-4222-8222-222222222222";
export const DEMO_PARENT_ID = "33333333-3333-4333-8333-333333333333";
export const DEFAULT_ROUTE_ID = "44444444-4444-4444-8444-444444444444";

const DEMO_DRIVER_PHONE = "+92 300 1112233";
const DEMO_PASSENGER_PHONE = "+92 333 4567890";
const DEMO_PARENT_PHONE = "+92 300 7654321";
const SEEDED_AT = "2026-11-01T07:30:00.000Z";

export const ROUTE_POINTS: Coordinates[] = [
  [33.6844, 73.0529], // I-8/3
  [33.6718, 73.0237], // I-9
  [33.6897, 73.0322], // G-9
  [33.6909, 72.9947], // Kashmir Highway
  [33.6427, 72.9908], // NUST H-12
];

const G10_FAST_POINTS: Coordinates[] = [
  [33.6918, 73.0162],
  [33.7045, 73.0356],
  [33.6606, 73.0068],
  [33.6498, 72.9891],
];

const SADDAR_MYU_POINTS: Coordinates[] = [
  [33.5973, 73.0479],
  [33.6132, 73.0658],
  [33.6592, 73.0917],
  [33.6758, 73.0824],
];

const BAHRIA_BLUE_AREA_POINTS: Coordinates[] = [
  [33.5512, 73.1234],
  [33.5812, 73.1613],
  [33.6245, 73.1084],
  [33.7125, 73.0687],
];

const F11_COMSATS_POINTS: Coordinates[] = [
  [33.7015, 72.9786],
  [33.7158, 72.9737],
  [33.6698, 72.9971],
  [33.6519, 73.0167],
];

const PWD_AIR_UNIVERSITY_POINTS: Coordinates[] = [
  [33.5224, 73.1463],
  [33.5488, 73.1451],
  [33.6042, 73.0733],
  [33.7054, 73.0549],
];

const baseRoute = (
  route: Omit<Route, "driver_name" | "driver_phone" | "vehicle_plate" | "rating" | "trips_count" | "verified" | "color"> &
    Pick<Route, "driver_name" | "driver_phone" | "vehicle_plate" | "rating" | "trips_count" | "verified" | "color">,
): Route => route;

export const DEFAULT_ROUTE: Route = baseRoute({
  id: DEFAULT_ROUTE_ID,
  driver_id: DEMO_DRIVER_ID,
  vehicle_type: "Toyota HiAce 14-Seater AC Van",
  origin: "I-8/3",
  destination: "NUST H-12",
  waypoints: ["I-9", "G-9", "Kashmir Highway"],
  pickup_time: "07:30:00",
  drop_time: "16:00:00",
  total_seats: 14,
  available_seats: 4,
  monthly_fare_pkr: 8500,
  is_active: true,
  driver_name: "Muhammad Usman",
  driver_phone: DEMO_DRIVER_PHONE,
  vehicle_plate: "ICT-24-713",
  rating: 4.9,
  trips_count: 128,
  verified: true,
  coordinates: ROUTE_POINTS,
  color: "#10B981",
});

const ROUTES: Route[] = [
  DEFAULT_ROUTE,
  baseRoute({
    id: "55555555-5555-4555-8555-555555555555",
    driver_id: "66666666-6666-4666-8666-666666666666",
    vehicle_type: "AC Van",
    origin: "G-10/2",
    destination: "FAST NUCES Islamabad",
    waypoints: ["G-9", "F-10", "Kashmir Highway"],
    pickup_time: "07:20:00",
    drop_time: "16:15:00",
    total_seats: 12,
    available_seats: 7,
    monthly_fare_pkr: 9200,
    is_active: true,
    driver_name: "Hamza Khalid",
    driver_phone: "+92 301 2223344",
    vehicle_plate: "ICT-19-482",
    rating: 4.8,
    trips_count: 96,
    verified: true,
    coordinates: G10_FAST_POINTS,
    color: "#0EA5E9",
  }),
  baseRoute({
    id: "77777777-7777-4777-8777-777777777777",
    driver_id: "88888888-8888-4888-8888-888888888888",
    vehicle_type: "Car",
    origin: "Saddar Rawalpindi",
    destination: "MYU (Muslim Youth University)",
    waypoints: ["Committee Chowk", "Faizabad", "Blue Area"],
    pickup_time: "07:00:00",
    drop_time: "16:30:00",
    total_seats: 4,
    available_seats: 2,
    monthly_fare_pkr: 7800,
    is_active: true,
    driver_name: "Areeb Shah",
    driver_phone: "+92 333 3456789",
    vehicle_plate: "RIL-21-906",
    rating: 4.7,
    trips_count: 74,
    verified: true,
    coordinates: SADDAR_MYU_POINTS,
    color: "#F59E0B",
  }),
  baseRoute({
    id: "99999999-9999-4999-8999-999999999999",
    driver_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    vehicle_type: "AC Van",
    origin: "Bahria Town Phase 7",
    destination: "Blue Area",
    waypoints: ["Koral Chowk", "Islamabad Expressway", "F-8"],
    pickup_time: "07:10:00",
    drop_time: "17:00:00",
    total_seats: 14,
    available_seats: 5,
    monthly_fare_pkr: 9800,
    is_active: true,
    driver_name: "Sana Tariq",
    driver_phone: "+92 312 4567812",
    vehicle_plate: "ICT-26-184",
    rating: 4.9,
    trips_count: 112,
    verified: true,
    coordinates: BAHRIA_BLUE_AREA_POINTS,
    color: "#8B5CF6",
  }),
  baseRoute({
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    driver_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    vehicle_type: "Car",
    origin: "F-11 Markaz",
    destination: "COMSATS Islamabad",
    waypoints: ["G-11", "Golra Mor", "H-12"],
    pickup_time: "07:40:00",
    drop_time: "16:10:00",
    total_seats: 4,
    available_seats: 1,
    monthly_fare_pkr: 6700,
    is_active: true,
    driver_name: "Bilal Ahmed",
    driver_phone: "+92 300 9876543",
    vehicle_plate: "ICT-20-311",
    rating: 4.6,
    trips_count: 61,
    verified: true,
    coordinates: F11_COMSATS_POINTS,
    color: "#EF4444",
  }),
  baseRoute({
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    driver_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    vehicle_type: "AC Van",
    origin: "PWD Housing Society",
    destination: "Air University",
    waypoints: ["Khanna Pul", "Faizabad", "Peshawar Road"],
    pickup_time: "06:50:00",
    drop_time: "16:45:00",
    total_seats: 10,
    available_seats: 6,
    monthly_fare_pkr: 8900,
    is_active: true,
    driver_name: "Maham Javaid",
    driver_phone: "+92 345 3210987",
    vehicle_plate: "ICT-23-552",
    rating: 4.8,
    trips_count: 83,
    verified: true,
    coordinates: PWD_AIR_UNIVERSITY_POINTS,
    color: "#14B8A6",
  }),
];

const DEMO_BOOKING: Booking = {
  id: "12121212-1212-4212-8212-121212121212",
  route_id: DEFAULT_ROUTE_ID,
  passenger_id: DEMO_PASSENGER_ID,
  passenger_name: "Ayesha Ahmed",
  passenger_phone: DEMO_PASSENGER_PHONE,
  parent_phone: DEMO_PARENT_PHONE,
  status: "approved",
  boarding_point: "I-8/3 Gate",
  attendance: "waiting",
  created_at: SEEDED_AT,
};

const DEMO_TRIP: ActiveTrip = {
  id: "13131313-1313-4313-8313-131313131313",
  route_id: DEFAULT_ROUTE_ID,
  status: "in_progress",
  current_lat: 33.6822,
  current_lng: 73.0505,
  updated_at: SEEDED_AT,
  progress: 0.08,
};

const DEMO_EVENTS: SafetyEvent[] = [
  {
    id: "14141414-1414-4414-8414-141414141414",
    title: "Trip departed",
    detail: "Muhammad Usman's van left the I-8/3 pickup point.",
    time: "07:30 AM",
    type: "info",
  },
  {
    id: "15151515-1515-4515-8515-151515151515",
    title: "Van arrived at I-8/3 Gate",
    detail: "The scheduled pickup geofence was reached.",
    time: "07:32 AM",
    type: "arrival",
  },
  {
    id: "16161616-1616-4616-8616-161616161616",
    title: "Trip arrival scheduled",
    detail: "NUST H-12 campus drop is scheduled for 08:05 AM.",
    time: "08:05 AM",
    type: "safe",
  },
];

export const SEED_DATA: AppData = {
  routes: ROUTES,
  bookings: [DEMO_BOOKING],
  trips: [DEMO_TRIP],
  events: DEMO_EVENTS,
};

export { DEMO_BOOKING, DEMO_TRIP, DEMO_EVENTS };
