import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(new URL("../supabase/migrations/001_routepool.sql", import.meta.url), "utf8");
const provider = readFileSync(new URL("../components/routepool-provider.tsx", import.meta.url), "utf8");

describe("source integration safeguards", () => {
  it("retains Supabase public routes for a signed-out configured session", () => {
    expect(provider).toContain("setData({ routes: remote.routes, bookings: [], trips: [], events: [] })");
  });
  it("requires approved booking and verified auth phone in parent authorization", () => {
    const parentHelper = sql.split("function public.is_parent_for_booking")[1].split("$$;")[0];
    expect(parentHelper).toContain("b.status = 'approved'");
    expect(parentHelper).toContain("public.current_verified_phone()");
    expect(sql).toContain("phone_confirmed_at is not null");
  });
  it("uses a restricted attendance RPC instead of an open booking-update policy", () => {
    expect(provider).toContain("await updateRemoteAttendance(booking, status)");
    expect(sql).toContain("function public.set_booking_attendance");
    expect(sql).toMatch(/grant update\s*\(full_name, phone\)/i);
  });
});
