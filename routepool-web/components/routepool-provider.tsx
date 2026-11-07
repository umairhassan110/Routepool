"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { SEED_DATA, DEFAULT_ROUTE_ID, DEMO_DRIVER_ID, DEMO_PASSENGER_ID } from "@/lib/seed";
import { interpolateRoute, uid, validateBooking, validateRoute } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { createRemoteBooking, createRemoteRoute, getRemoteData, setRemoteTrip, subscribeRemoteTrips, subscribeRemoteBookings, updateRemoteAttendance, updateRemoteBooking } from "@/lib/repository";
import type { AppData, AttendanceStatus, BookingDraft, Profile, Role, RouteDraft, TripStatus } from "@/lib/types";

const STORAGE_KEY = "routepool.pk.demo.v1";
const cloneSeed = (): AppData => JSON.parse(JSON.stringify(SEED_DATA));

interface PoolContext {
  data: AppData;
  selectedRouteId: string;
  setSelectedRouteId: (id: string) => void;
  role: Role;
  setRole: (role: Role) => void;
  profile: Profile | null;
  mode: "demo" | "supabase";
  hydrated: boolean;
  simulating: boolean;
  simulationProgress: number;
  notice: string | null;
  clearNotice: () => void;
  notify: (message: string) => void;
  bookRoute: (routeId: string, draft: BookingDraft) => Promise<boolean>;
  publishRoute: (draft: RouteDraft) => Promise<boolean>;
  setTripStatus: (routeId: string, status: TripStatus) => Promise<void>;
  setAttendance: (bookingId: string, status: AttendanceStatus) => Promise<void>;
  decideBooking: (bookingId: string, status: "approved" | "rejected") => Promise<void>;
  startSimulation: () => void;
  stopSimulation: () => void;
  sendSOS: () => void;
  refreshSession: () => Promise<void>;
  resetDemo: () => void;
}

const Context = createContext<PoolContext | null>(null);
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "The action could not be completed. Please try again.";

export function RoutePoolProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(cloneSeed);
  const [selectedRouteId, selectRoute] = useState(DEFAULT_ROUTE_ID);
  const [role, setRole] = useState<Role>("parent");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mode, setMode] = useState<"demo" | "supabase">("demo");
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const dataRef = useRef(data);
  const selectedRef = useRef(selectedRouteId);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mutationLock = useRef(false);
  const notify = useCallback((message: string) => setNotice(message), []);
  const stopSimulation = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setSimulating(false);
  }, []);

  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { selectedRef.current = selectedRouteId; }, [selectedRouteId]);

  const refreshSession = useCallback(async () => {
    if (!supabase) return;
    try {
      const remote = await getRemoteData();
      if (remote.profile) {
        stopSimulation();
        setProfile(remote.profile);
        setMode("supabase");
        setRole(remote.profile.role);
        setData({ ...remote, events: [] });
        selectRoute((current) => remote.routes.some((r) => r.id === current) ? current : remote.routes[0]?.id ?? "");
      } else {
        setProfile(null);
        stopSimulation();
        setMode("supabase");
        setData({ routes: remote.routes, bookings: [], trips: [], events: [] });
        selectRoute((current) => remote.routes.some((r) => r.id === current) ? current : remote.routes[0]?.id ?? "");
      }
    } catch (error) { notify(`Supabase unavailable: ${errorMessage(error)} Demo data is still available.`); }
  }, [notify, stopSimulation]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.routes) && Array.isArray(parsed.bookings) && Array.isArray(parsed.trips) && Array.isArray(parsed.events)) {
          setData(parsed);
          if (!parsed.routes.some((r: { id: string }) => r.id === DEFAULT_ROUTE_ID)) selectRoute(parsed.routes[0]?.id ?? "");
        }
      }
    } catch { notify("Your browser could not restore the last demo session. A fresh sample is ready."); }
    setHydrated(true);
    void refreshSession();
    const subscription = supabase?.auth.onAuthStateChange(() => { setTimeout(() => { void refreshSession(); }, 0); });
    return () => { subscription?.data.subscription.unsubscribe(); stopSimulation(); };
  }, [notify, refreshSession, stopSimulation]);

  useEffect(() => {
    if (!hydrated || mode !== "demo") return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* A restricted browser still supports the in-memory demo. */ }
  }, [data, hydrated, mode]);

  useEffect(() => {
    if (mode !== "supabase") return;
    const stopTrips = subscribeRemoteTrips((trip) => {
      setData((current) => ({ ...current, trips: current.trips.some((t) => t.id === trip.id) ? current.trips.map((t) => t.id === trip.id ? trip : t) : [...current.trips, trip] }));
    });
    const stopBookings = subscribeRemoteBookings((booking) => {
      setData((current) => {
        const previous = current.bookings.find((item) => item.id === booking.id);
        const newEvent = previous && previous.attendance !== booking.attendance && booking.attendance !== "waiting" ? {
          id: uid(), title: booking.attendance === "boarded" ? "Student Boarded successfully" : "Student Dropped safely at Campus Main Gate", detail: `${booking.passenger_name} · Driver-confirmed attendance update`, time: new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }), type: booking.attendance === "boarded" ? "boarding" as const : "safe" as const,
        } : null;
        return { ...current, bookings: previous ? current.bookings.map((item) => item.id === booking.id ? booking : item) : [...current.bookings, booking], events: newEvent ? [...current.events, newEvent] : current.events };
      });
    });
    return () => { stopTrips(); stopBookings(); };
  }, [mode]);

  const setSelectedRouteId = (id: string) => { stopSimulation(); selectRoute(id); setSimulationProgress(0); };

  async function bookRoute(routeId: string, draft: BookingDraft) {
    if (mutationLock.current) return false;
    const errors = validateBooking(draft);
    if (Object.keys(errors).length) { notify(Object.values(errors)[0]); return false; }
    mutationLock.current = true;
    try {
      const route = dataRef.current.routes.find((r) => r.id === routeId);
      if (!route?.is_active || route.available_seats < 1) throw new Error("This route has no seats available. Try another route.");
      if (mode === "supabase") {
        const booking = await createRemoteBooking(routeId, draft);
        setData((d) => ({ ...d, bookings: [...d.bookings, booking] }));
      } else {
        if (dataRef.current.bookings.some((b) => b.route_id === routeId && b.passenger_phone === draft.passenger_phone && b.status !== "rejected")) throw new Error("A request for this passenger and route already exists. Check My rides.");
        setData((d) => ({ ...d, bookings: [...d.bookings, { ...draft, id: uid(), route_id: routeId, passenger_id: DEMO_PASSENGER_ID, status: "pending", attendance: "waiting", created_at: new Date().toISOString() }] }));
      }
      notify(mode === "demo" ? "Seat requested in demo mode. Switch to Driver to approve it, or check My rides." : "Monthly seat requested. Your driver will review the booking.");
      return true;
    } catch (error) { notify(errorMessage(error)); return false; }
    finally { mutationLock.current = false; }
  }

  async function publishRoute(draft: RouteDraft) {
    if (mutationLock.current) return false;
    const errors = validateRoute(draft);
    if (Object.keys(errors).length) { notify(Object.values(errors)[0]); return false; }
    mutationLock.current = true;
    try {
      const route = mode === "supabase" ? await createRemoteRoute(draft) : {
        ...draft, id: uid(), driver_id: DEMO_DRIVER_ID, driver_name: "Muhammad Usman", driver_phone: "+92 300 1234567", vehicle_plate: "ICT-283", rating: 4.9, trips_count: 128, verified: true, available_seats: draft.total_seats, is_active: true, coordinates: draft.coordinates ?? [], color: "#10B981",
      };
      setData((d) => ({ ...d, routes: [...d.routes, route] }));
      selectRoute(route.id);
      notify(mode === "demo" ? "Route published to your local demo. It is now searchable." : "Your route is published and ready for bookings.");
      return true;
    } catch (error) { notify(errorMessage(error)); return false; }
    finally { mutationLock.current = false; }
  }

  async function setTripStatus(routeId: string, status: TripStatus) {
    if (mutationLock.current) return;
    mutationLock.current = true;
    try {
      const route = dataRef.current.routes.find((r) => r.id === routeId);
      if (!route) throw new Error("Select a route first.");
      if (selectedRef.current === routeId) stopSimulation();
      const existing = dataRef.current.trips.find((t) => t.route_id === routeId);
      let point: [number, number] = existing ? [existing.current_lat, existing.current_lng] : route.coordinates[0] ?? [33.6685, 73.0747];
      if (mode === "supabase" && status === "in_progress") {
        if (profile?.role !== "driver" || profile.id !== route.driver_id) throw new Error("Only this route's authenticated driver can start the trip.");
        if (!navigator.geolocation) throw new Error("Device location is required to start a real trip. Use an HTTPS browser with GPS support.");
        point = await new Promise<[number, number]>((resolve, reject) => navigator.geolocation.getCurrentPosition(
          (location) => resolve([location.coords.latitude, location.coords.longitude]),
          (error) => reject(new Error(`Cannot start live trip: ${error.message}. Check device location permission.`)),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
        ));
      }
      const trip = mode === "supabase" ? await setRemoteTrip(route, status, point as [number, number]) : {
        id: existing?.id ?? uid(), route_id: routeId, status, current_lat: point[0], current_lng: point[1], progress: status === "completed" ? 1 : 0, updated_at: new Date().toISOString(),
      };
      setData((d) => ({ ...d, trips: [...d.trips.filter((t) => t.route_id !== routeId), trip] }));
      notify(status === "in_progress" ? `${mode === "demo" ? "Demo trip" : "Trip"} started. GPS updates are allowed only while the trip is active.` : "Trip ended. Location streaming is now stopped.");
    } catch (error) { notify(errorMessage(error)); }
    finally { mutationLock.current = false; }
  }

  async function setAttendance(bookingId: string, status: AttendanceStatus) {
    const booking = dataRef.current.bookings.find((b) => b.id === bookingId);
    if (!booking || booking.status !== "approved") return;
    if (status === "dropped" && booking.attendance === "waiting") { notify("Mark the student Boarded before marking Dropped."); return; }
    try {
      if (mode === "supabase") {
        await updateRemoteAttendance(booking, status);
      }
      setData((d) => ({ ...d, bookings: d.bookings.map((b) => b.id === bookingId ? { ...b, attendance: status } : b) }));
      notify(`${booking.passenger_name} marked ${status}. ${mode === "demo" ? "Saved locally in demo mode." : ""}`);
    } catch (error) { notify(errorMessage(error)); }
  }

  async function decideBooking(bookingId: string, status: "approved" | "rejected") {
    if (mutationLock.current) return;
    mutationLock.current = true;
    try {
      const booking = dataRef.current.bookings.find((b) => b.id === bookingId);
      if (!booking || booking.status !== "pending") throw new Error("Only pending requests can be reviewed.");
      const route = dataRef.current.routes.find((r) => r.id === booking.route_id);
      if (!route || (status === "approved" && route.available_seats < 1)) throw new Error("No seats remain on this route.");
      if (mode === "supabase") { await updateRemoteBooking(booking, status); await refreshSession(); }
      else setData((d) => ({ ...d, routes: d.routes.map((r) => r.id === booking.route_id && status === "approved" ? { ...r, available_seats: Math.max(0, r.available_seats - 1) } : r), bookings: d.bookings.map((b) => b.id === bookingId ? { ...b, status } : b) }));
      notify(`Booking ${status}. ${status === "approved" ? "The monthly seat is confirmed." : "The seat remains available."}`);
    } catch (error) { notify(errorMessage(error)); }
    finally { mutationLock.current = false; }
  }

  function startSimulation() {
    if (simulating || intervalRef.current) return;
    if (mode !== "demo") { notify("Route simulation is demo-only. Sign out to try the sample route; live locations come from your driver's active trip."); return; }
    const routeId = selectedRef.current;
    const route = dataRef.current.routes.find((r) => r.id === routeId);
    if (!route || route.coordinates.length < 2) { notify("This route has no mapped coordinates. Choose one of the sample routes."); return; }
    const routePoints = route.coordinates;
    const started = Date.now();
    const tripId = dataRef.current.trips.find((t) => t.route_id === routeId)?.id ?? uid();
    const emitted = new Set<string>();
    setSimulating(true);
    setSimulationProgress(0);
    setData((d) => ({ ...d, events: d.events.filter((e) => !e.id.startsWith("simulation-")) }));
    notify("Simulation running. This is a sample journey, not a live GPS feed.");
    intervalRef.current = setInterval(() => {
      const progress = Math.min((Date.now() - started) / 36000, 1);
      const coords = interpolateRoute(routePoints, progress);
      setSimulationProgress(progress);
      const pending = [
        { key: "arrival", at: 0.08, title: "Van arrived at I-8/3 Gate (07:32 AM)", detail: "Pickup geofence reached · I-8/3, Islamabad", time: "07:32 AM", type: "arrival" as const },
        { key: "boarding", at: 0.23, title: "Student Boarded successfully (07:35 AM)", detail: "Ayesha Ahmed is safely on board", time: "07:35 AM", type: "boarding" as const },
        { key: "drop", at: 1, title: "Student Dropped safely at Campus Main Gate (08:05 AM)", detail: "NUST H-12 destination reached", time: "08:05 AM", type: "safe" as const },
      ].filter((event) => progress >= event.at && !emitted.has(event.key));
      pending.forEach((event) => emitted.add(event.key));
      setData((d) => ({
        ...d,
        trips: [...d.trips.filter((t) => t.route_id !== routeId), { id: tripId, route_id: routeId, status: progress >= 1 ? "completed" : "in_progress", current_lat: coords[0], current_lng: coords[1], progress, updated_at: new Date().toISOString() }],
        events: [...d.events, ...pending.map((event) => ({ id: `simulation-${event.key}`, title: event.title, detail: event.detail, time: event.time, type: event.type }))],
        bookings: d.bookings.map((b) => b.route_id === routeId && b.status === "approved" ? { ...b, attendance: progress >= 1 ? "dropped" : progress >= 0.23 ? "boarded" : "waiting" } : b),
      }));
      if (progress >= 1) { stopSimulation(); notify("Sample journey completed. Student dropped safely at campus; location streaming stopped."); }
    }, 350);
  }

  function sendSOS() {
    const trip = dataRef.current.trips.find((t) => t.route_id === selectedRef.current);
    const coords = trip ? `${trip.current_lat.toFixed(5)}, ${trip.current_lng.toFixed(5)}` : "Location not available";
    setData((d) => ({ ...d, events: [...d.events, { id: uid(), title: "Mock emergency location broadcast", detail: `${coords} · In-app demonstration only. No emergency service was contacted.`, time: new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }), type: "sos" }] }));
    notify(`Mock SOS recorded at ${coords}. No calls, SMS or emergency dispatch were sent.`);
  }

  function resetDemo() {
    if (mode !== "demo") { notify("Remote data cannot be reset from this demo control."); return; }
    stopSimulation();
    setData(cloneSeed());
    selectRoute(DEFAULT_ROUTE_ID);
    setSimulationProgress(0);
    notify("Demo reset. The original sample routes and bookings are restored.");
  }

  return <Context.Provider value={{ data, selectedRouteId, setSelectedRouteId, role, setRole, profile, mode, hydrated, simulating, simulationProgress, notice, clearNotice: () => setNotice(null), notify, bookRoute, publishRoute, setTripStatus, setAttendance, decideBooking, startSimulation, stopSimulation, sendSOS, refreshSession, resetDemo }}>{children}</Context.Provider>;
}

export function useRoutePool() {
  const context = useContext(Context);
  if (!context) throw new Error("useRoutePool must be used within RoutePoolProvider");
  return context;
}
