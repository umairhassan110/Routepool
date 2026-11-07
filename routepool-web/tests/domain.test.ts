import { describe, expect, it } from "vitest";

import {
  DEFAULT_ROUTE_ID,
  DEMO_PASSENGER_ID,
  ROUTE_POINTS,
  SEED_DATA,
} from "../lib/seed";
import {
  filterRoutes,
  formatFare,
  formatTime,
  initials,
  interpolateRoute,
  isPakistaniPhone,
  normalizePhone,
  uid,
  validateBooking,
  validateRoute,
} from "../lib/utils";

describe("RoutePool seed data", () => {
  it("contains the requested default Islamabad route and approved sample child", () => {
    const route = SEED_DATA.routes.find((candidate) => candidate.id === DEFAULT_ROUTE_ID);
    const booking = SEED_DATA.bookings.find(
      (candidate) => candidate.passenger_id === DEMO_PASSENGER_ID,
    );

    expect(route).toMatchObject({
      driver_name: "Muhammad Usman",
      vehicle_type: "Toyota HiAce 14-Seater AC Van",
      origin: "I-8/3",
      destination: "NUST H-12",
      pickup_time: "07:30:00",
      drop_time: "16:00:00",
      monthly_fare_pkr: 8500,
      total_seats: 14,
      available_seats: 4,
    });
    expect(route?.waypoints).toEqual(["I-9", "G-9", "Kashmir Highway"]);
    expect(booking).toMatchObject({
      passenger_name: "Ayesha Ahmed",
      status: "approved",
      route_id: DEFAULT_ROUTE_ID,
    });
    expect(SEED_DATA.trips[0]).toMatchObject({
      route_id: DEFAULT_ROUTE_ID,
      status: "in_progress",
      progress: 0.08,
    });
    expect(ROUTE_POINTS).toHaveLength(5);
  });

  it("uses stable UUID-shaped identifiers", () => {
    const ids = [
      ...SEED_DATA.routes.map((route) => route.id),
      ...SEED_DATA.bookings.map((booking) => booking.id),
      ...SEED_DATA.trips.map((trip) => trip.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    }
  });
});

describe("domain utilities", () => {
  it("formats Pakistan fare and 24-hour times", () => {
    expect(formatFare(8500)).toBe("PKR 8,500/month");
    expect(formatFare(10000)).toBe("PKR 10,000/month");
    expect(formatTime("07:30:00")).toBe("07:30 AM");
    expect(formatTime("16:00:00")).toBe("04:00 PM");
    expect(formatTime("00:05:00")).toBe("12:05 AM");
  });

  it("normalizes phones and validates Pakistani mobile numbers", () => {
    expect(normalizePhone("0300-1112233")).toBe("+923001112233");
    expect(normalizePhone("0092 300 1112233")).toBe("+923001112233");
    expect(isPakistaniPhone("+92 300 1112233")).toBe(true);
    expect(isPakistaniPhone("0300 1112233")).toBe(true);
    expect(isPakistaniPhone("+1 202 555 0100")).toBe(false);
  });

  it("filters routes with pure AND semantics", () => {
    const acUnderTen = filterRoutes(SEED_DATA.routes, "", "", ["AC Van", "Under PKR 10,000"]);
    expect(acUnderTen.length).toBeGreaterThan(0);
    expect(acUnderTen.every((route) => /\bAC\b/.test(route.vehicle_type) && route.vehicle_type.includes("Van") && route.monthly_fare_pkr < 10000)).toBe(true);

    const nustMatch = filterRoutes(SEED_DATA.routes, "I-8", "NUST", []);
    expect(nustMatch.map((route) => route.id)).toEqual([DEFAULT_ROUTE_ID]);
    expect(filterRoutes(SEED_DATA.routes, "", "", ["AC Van", "Car"])).toEqual([]);
  });

  it("returns field-level booking and route validation errors", () => {
    expect(validateBooking({
      passenger_name: "",
      passenger_phone: "0300",
      parent_phone: "",
      boarding_point: "",
    })).toMatchObject({
      passenger_name: expect.any(String),
      passenger_phone: expect.any(String),
      parent_phone: expect.any(String),
      boarding_point: expect.any(String),
    });

    expect(validateRoute({
      origin: "",
      destination: "",
      waypoints: [],
      vehicle_type: "",
      pickup_time: "7am",
      drop_time: "16:00:00",
      total_seats: 0,
      monthly_fare_pkr: 0,
    })).toMatchObject({
      origin: expect.any(String),
      destination: expect.any(String),
      vehicle_type: expect.any(String),
      pickup_time: expect.any(String),
      total_seats: expect.any(String),
      monthly_fare_pkr: expect.any(String),
    });
  });

  it("interpolates along route segments and clamps progress", () => {
    expect(interpolateRoute([[0, 0], [10, 10]], 0.25)).toEqual([2.5, 2.5]);
    expect(interpolateRoute([[0, 0], [10, 10], [20, 0]], 0.5)).toEqual([10, 10]);
    expect(interpolateRoute([[0, 0], [10, 10]], -1)).toEqual([0, 0]);
    expect(interpolateRoute([[0, 0], [10, 10]], 2)).toEqual([10, 10]);
  });

  it("creates standards-valid UUIDs and readable initials", () => {
    expect(uid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(initials("Ayesha Ahmed")).toBe("AA");
    expect(initials("  Muhammad   Usman  ")).toBe("MU");
    expect(initials("")).toBe("");
  });
});
