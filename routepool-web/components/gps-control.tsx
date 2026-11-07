"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair, Radio, Square } from "lucide-react";
import { updateRemoteCoordinates } from "@/lib/repository";
import { useRoutePool } from "./routepool-provider";
import type { ActiveTrip, Route } from "@/lib/types";

export function GPSControl({ route, trip }: { route: Route; trip?: ActiveTrip }) {
  const { mode, profile, notify } = useRoutePool();
  const [sharing, setSharing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState("");
  const tripRef = useRef(trip);
  const lastSent = useRef(0);
  const sending = useRef(false);
  const eligible = mode === "supabase" && profile?.role === "driver" && profile.id === route.driver_id && trip?.status === "in_progress";
  useEffect(() => { tripRef.current = trip; }, [trip]);
  useEffect(() => { if (!eligible) setSharing(false); }, [eligible]);
  useEffect(() => {
    if (!sharing || !eligible) return;
    if (!navigator.geolocation) { notify("This browser cannot provide location. GPS sharing is off."); return; }
    const watch = navigator.geolocation.watchPosition(async (position) => {
      const current = tripRef.current;
      if (!current || current.status !== "in_progress" || sending.current || Date.now() - lastSent.current < 5000) return;
      sending.current = true;
      try {
        await updateRemoteCoordinates(current, [position.coords.latitude, position.coords.longitude]);
        lastSent.current = Date.now();
        setLastUpdate(new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      } catch (error) { setSharing(false); notify(error instanceof Error ? error.message : "GPS update failed. Sharing stopped."); }
      finally { sending.current = false; }
    }, (error) => { setSharing(false); notify(`Location sharing stopped: ${error.message}. Check HTTPS and browser location permission.`); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 });
    return () => navigator.geolocation.clearWatch(watch);
  }, [sharing, eligible, notify, route.id]);

  if (mode === "demo") return <div className="gps-control"><Crosshair size={16}/><span>Demo GPS uses the route simulation. Your device location is never requested.</span></div>;
  return <div className="gps-control"><Radio size={17}/><div><strong>{sharing && eligible ? "This device is sharing GPS" : "Device GPS is off"}</strong><p>{lastUpdate && sharing && eligible ? `Last successful update: ${lastUpdate}` : "Share only when you are the driver and a trip is active. HTTPS and browser permission are required."}</p></div><button className="btn-secondary" disabled={!eligible} onClick={() => setSharing(!sharing)}>{sharing && eligible ? <Square size={14}/> : <Crosshair size={14}/>} {sharing && eligible ? "Stop GPS" : "Share device GPS"}</button></div>;
}
