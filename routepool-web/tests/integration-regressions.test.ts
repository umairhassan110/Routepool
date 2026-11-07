import { describe, expect, it } from "vitest";
import { SEED_DATA, DEFAULT_ROUTE_ID } from "../lib/seed";
import { filterRoutes, formatFare, interpolateRoute, validateRoute } from "../lib/utils";

describe("route publishing and search integration", () => {
  it("matches the full HiAce description with the AC Van filter", () => {
    const matching = filterRoutes(SEED_DATA.routes, "I-8", "NUST", ["AC Van", "Under PKR 10,000"]);
    expect(matching.map((route) => route.id)).toContain(DEFAULT_ROUTE_ID);
  });
  it("treats Under PKR 10,000 as a strict upper bound", () => {
    const route = { ...SEED_DATA.routes[0], monthly_fare_pkr: 10000 };
    expect(filterRoutes([route], "", "", ["Under PKR 10,000"])).toEqual([]);
    expect(formatFare(route.monthly_fare_pkr)).toBe("PKR 10,000/month");
  });
  it("validates a published route with a detailed vehicle description", () => {
    const route = SEED_DATA.routes[0];
    expect(validateRoute({ ...route, coordinates: route.coordinates })).toEqual({});
  });
  it("clamps simulation movement at the route destination", () => {
    const points = SEED_DATA.routes[0].coordinates;
    expect(interpolateRoute(points, 2)).toEqual(points[points.length - 1]);
    expect(interpolateRoute(points, -1)).toEqual(points[0]);
  });
});
