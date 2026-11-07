"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, BellRing, BusFront, CalendarDays, Check, CheckCheck, ChevronDown, Clock3, Compass, GraduationCap, Info, MapPin, Navigation, Phone, Play, Radio, Route as RouteIcon, ShieldCheck, ShieldAlert, Square, Star, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useRoutePool } from "./routepool-provider";
import { formatFare, formatTime, initials } from "@/lib/utils";
import type { Coordinates, SafetyEvent } from "@/lib/types";

const Map = dynamic(() => import("./route-map"), { ssr: false, loading: () => <div className="map-loading"><Compass size={30}/><span>Finding your route…</span></div> });
const eventIcons = { arrival: MapPin, boarding: BusFront, safe: ShieldCheck, info: Radio, sos: ShieldAlert };

function SafetyItem({ event, last }: { event: SafetyEvent; last: boolean }) {
  const Icon = eventIcons[event.type];
  return <li className={`safety-item ${event.type} ${last ? "last" : ""}`}><div className="event-icon"><Icon size={16}/></div><div><div className="event-title-row"><h4>{event.title.replace(/\s*\([^)]*\)$/, "")}</h4><span>{event.time}</span></div><p>{event.detail}</p></div></li>;
}

export function TrackingScreen() {
  const { data, selectedRouteId, setSelectedRouteId, mode, profile, simulating, simulationProgress, startSimulation, stopSimulation, sendSOS, notify } = useRoutePool();
  const [details, showDetails] = useState(false);
  const [contact, showContact] = useState(false);
  const [sos, showSOS] = useState(false);
  const [expandedEvents, expandEvents] = useState(false);
  const route = data.routes.find((r) => r.id === selectedRouteId) ?? data.routes[0];
  const trip = data.trips.find((t) => t.route_id === route?.id);
  const passenger = data.bookings.find((b) => b.route_id === route?.id && b.status === "approved");
  const position: Coordinates = trip ? [trip.current_lat, trip.current_lng] : route?.coordinates[0] ?? [33.6844, 73.0479];
  const progress = simulating ? simulationProgress : trip?.progress ?? 0;
  const active = trip?.status === "in_progress";
  const complete = trip?.status === "completed";
  const droppedSafely = passenger?.attendance === "dropped" || (mode === "demo" && !!complete);
  const childName = passenger?.passenger_name ?? (mode === "demo" ? "Ayesha Ahmed" : profile?.full_name ?? "Your passenger");
  const eta = complete ? 0 : Math.max(1, Math.round(27 * (1 - progress)));
  const events = expandedEvents ? data.events : data.events.slice(-4);
  const day = new Intl.DateTimeFormat("en-PK", { weekday: "short", day: "numeric", month: "short" }).format(new Date());

  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { showDetails(false); showContact(false); showSOS(false); } };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);

  if (!route) return <><div className="page-heading"><div><p className="eyebrow">PARENT SAFETY RADAR</p><h1>Live tracking</h1><p>Your journey will appear here once a route is available.</p></div></div><div className="empty-state panel"><Navigation size={34}/><h2>No route to track yet</h2><p>Find a monthly ride and request a seat. Approved passengers can access their driver’s active trip.</p><Link href="/search" className="btn-primary">Find a route <ArrowRight size={17}/></Link></div></>;

  if (mode === "supabase" && !passenger && profile?.role !== "driver") return <><div className="page-heading"><div><p className="eyebrow">PARENT SAFETY RADAR</p><h1>Live tracking<span className="heading-dot">.</span></h1><p>Private trip updates for your approved monthly ride.</p></div></div><div className="empty-state panel"><ShieldCheck size={35}/><h2>{profile ? "No approved journey to track yet" : "Sign in for private live tracking"}</h2><p>{profile ? "An approved booking is required. Parents must also verify the phone number used as the booking's parent contact." : "Public routes are searchable without an account. Bookings and vehicle locations are visible only to authorized signed-in users."}</p><Link href={profile ? "/search" : "/account"} className="btn-primary">{profile ? "Find a route" : "Sign in"}<ArrowRight size={16}/></Link>{profile && <Link href="/account" className="text-button">Verify parent contact <ArrowRight size={14}/></Link>}</div></>;

  return <>
    <div className="page-heading"><div><p className="eyebrow">A SAFER JOURNEY, TOGETHER</p><h1>Live tracking<span className="heading-dot">.</span></h1><p>A little peace of mind, every morning.</p></div><div className="heading-actions"><div className="date-pill"><CalendarDays size={15}/><span>Today, {day}</span></div><span className="status-pill demo-pill"><span className="tiny-dot"/>{mode === "demo" ? "Demo mode" : "Connected"}</span></div></div>

    <section className="child-card panel" aria-label="Tracked passenger">
      <div className="child-avatar"><GraduationCap size={30}/><span className="child-check"><Check size={10}/></span></div>
      <div className="child-info"><p className="eyebrow">YOU’RE KEEPING AN EYE ON</p><h2>{childName}</h2><p>{route.destination.split(",")[0]} <span>·</span> {mode === "demo" ? "Sample student" : "Approved passenger"}</p></div>
      <div className="child-ride"><span className="journey-label"><BusFront size={16}/>{route.vehicle_type.includes("Van") ? "Morning campus ride" : "Monthly pick & drop"}</span><span className="route-mini">{route.origin.split(",")[0]} <ArrowRight size={13}/> {route.destination.split(",")[0]}</span></div>
      <label className="route-select-wrap"><span className="sr-only">Choose tracked route</span><select aria-label="Choose tracked route" value={route.id} onChange={(event) => setSelectedRouteId(event.target.value)}>{data.routes.map((item) => <option key={item.id} value={item.id}>{item.origin.split(",")[0]} → {item.destination.split(",")[0]}</option>)}</select><ChevronDown size={15}/></label>
    </section>

    <div className="tracking-grid">
      <div className="tracking-left">
        <section className="live-map-panel panel">
          <div className="panel-heading"><div className="map-title"><span className="icon-tile"><RouteIcon size={18}/></span><div><h2>Your ride, on the map</h2><p>{route.origin.split(",")[0]} to {route.destination.split(",")[0]}</p></div></div><span className={`status-pill ${active ? "live-pill" : "neutral-pill"}`}><span className="tiny-dot"/>{active ? mode === "demo" ? "Demo live" : "Trip active" : complete ? "Completed" : "Scheduled"}</span></div>
          <Map key={route.id} route={route} position={position} moving={simulating} active={!!active} demo={mode === "demo"}/>
          <div className="map-driver"><span className="avatar driver-avatar">{initials(route.driver_name)}</span><div className="map-driver-name"><h3>{route.driver_name}<ShieldCheck size={14}/></h3><p>{route.vehicle_type}<span>·</span>{route.vehicle_plate || "Monthly ride"}</p></div><button className="btn-icon-outline" aria-label="Contact driver" onClick={() => showContact(true)}><Phone size={16}/></button></div>
        </section>

        <section className="trip-timeline panel"><div className="section-heading"><h2>Today’s journey</h2><button className="text-button" onClick={() => showDetails(true)}>Trip details <ArrowRight size={14}/></button></div><div className="journey-stops"><div className={`journey-stop ${progress > 0 ? "done" : ""}`}><div className="stop-dot"><Check size={12}/></div><span className="stop-time">{formatTime(route.pickup_time)}</span><h3>Home pickup</h3><p>{route.origin.split(",")[0]}</p></div><div className={`journey-stop ${progress >= 0.23 ? "done" : "current"}`}><div className="stop-dot">{progress >= 0.23 ? <Check size={12}/> : <BusFront size={12}/>}</div><span className="stop-time">{active ? "In progress" : complete ? "Completed" : "Scheduled"}</span><h3>{complete ? "Ride completed" : "On the way"}</h3><p>{route.waypoints[0] ?? "Direct route"}</p></div><div className={`journey-stop ${complete ? "done" : ""}`}><div className="stop-dot">{complete ? <Check size={12}/> : <MapPin size={12}/>}</div><span className="stop-time">{mode === "demo" ? "08:05 AM" : "Destination"}</span><h3>Campus drop-off</h3><p>{route.destination.split(",")[0]}</p></div></div></section>
      </div>

      <aside className="tracking-right">
        <section className="eta-card"><div className="eta-top"><span className="eta-icon"><Navigation size={20}/></span><span>{droppedSafely ? "ARRIVED SAFELY" : complete ? "TRIP ENDED" : active ? mode === "demo" ? "ESTIMATED ARRIVAL" : "ACTIVE TRIP LOCATION" : "NEXT JOURNEY"}</span><span className="signal"><i/><i/><i/></span></div><div className="eta-number">{droppedSafely ? <><CheckCheck size={38}/><span>At destination</span></> : complete ? <><CheckCheck size={38}/><span>Trip ended</span></> : active && mode === "demo" ? <><strong>{eta}</strong><span>minutes</span></> : active ? <><Radio size={32}/><span>Location active</span></> : <><strong>{formatTime(route.pickup_time).split(" ")[0]}</strong><span>{formatTime(route.pickup_time).split(" ")[1]}</span></>}</div><p>{droppedSafely ? "Student drop-off confirmed" : complete ? "Location streaming stopped" : active ? mode === "demo" ? `until ${route.destination.split(",")[0]}` : `${position[0].toFixed(5)}, ${position[1].toFixed(5)}` : `Pickup from ${route.origin.split(",")[0]}`}</p>{mode === "demo" && <div className="eta-progress"><span style={{ width: `${Math.max(3, progress * 100)}%` }}/></div>}<div className="eta-bottom"><span>{complete ? "Journey ended" : mode === "demo" ? `${Math.round(progress * 100)}% of journey` : active ? "Driver location update" : "Waiting for driver"}</span><span>{mode === "demo" ? "Simulated estimate" : "Authorized trip data"}</span></div></section>

        <section className="safety-panel panel"><div className="section-heading"><h2>Safety updates</h2><span className="soft-icon"><BellRing size={16}/></span></div><p className="safety-caption">The little updates that mean a lot.</p><ol className="safety-stream">{events.map((event, index) => <SafetyItem key={event.id} event={event} last={index === events.length - 1}/>)}</ol>{!events.length && <div className="safety-empty"><Radio size={20}/><p>Updates appear as your trip progresses.</p></div>}<button className="safety-all" onClick={() => expandEvents(!expandedEvents)}>{expandedEvents ? "Show latest updates" : "View all updates"}<ArrowRight size={14}/></button></section>

        <section className="simulation-panel"><div className="simulation-heading"><Play size={15}/><h3>Take it for a test ride</h3><span>DEMO</span></div><p>Watch the van move and see safety alerts arrive, stop by stop.</p><button className="btn-secondary simulation-button" disabled={mode !== "demo"} onClick={simulating ? stopSimulation : startSimulation}>{simulating ? <Square size={15}/> : <Play size={15}/>} {simulating ? "Pause simulation" : "Simulate Route Movement"}</button></section>
      </aside>
    </div>

    <section className="safety-bottom"><div className="privacy-notice"><span className="privacy-icon"><ShieldCheck size={21}/></span><div><h3>Safety on. Privacy respected.</h3><p>GPS streaming active ONLY during active trip duration.</p></div><Link href="/help" aria-label="Read location privacy details"><Info size={17}/></Link></div><button className="sos-button" onClick={() => showSOS(true)}><ShieldAlert size={20}/><span>Emergency SOS<small>Mock location broadcast</small></span><ArrowRight size={17}/></button></section>

    {(details || contact || sos) && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { showDetails(false); showContact(false); showSOS(false); } }}><div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="tracking-dialog-title"><button autoFocus className="modal-close icon-button" aria-label="Close dialog" onClick={() => { showDetails(false); showContact(false); showSOS(false); }}><X size={20}/></button>
      {details && <><span className="dialog-icon"><RouteIcon size={23}/></span><p className="eyebrow">YOUR EVERYDAY ROUTE</p><h2 id="tracking-dialog-title">From home to campus</h2><p className="muted">{route.origin} → {route.destination}</p><div className="detail-list"><p><span>Driver</span><strong>{route.driver_name}</strong></p><p><span>Vehicle</span><strong>{route.vehicle_type}</strong></p><p><span>Pickup / return</span><strong>{formatTime(route.pickup_time)} / {formatTime(route.drop_time)}</strong></p><p><span>Monthly fare</span><strong>{formatFare(route.monthly_fare_pkr)}</strong></p><p><span>Route stops</span><strong>{route.waypoints.join(" → ") || "Direct journey"}</strong></p><p><span>Available seats</span><strong>{route.available_seats} of {route.total_seats}</strong></p></div><p className="info-note">{mode === "demo" ? "Sample route and sample CNIC verification. No real trip is being monitored." : "Live locations are visible only to authorized passengers and parents."}</p><button className="btn-primary w-full" onClick={() => showDetails(false)}>Got it <Check size={16}/></button></>}
      {contact && <><span className="dialog-icon"><Phone size={23}/></span><p className="eyebrow">YOUR ROUTE PARTNER</p><h2 id="tracking-dialog-title">Contact {route.driver_name.split(" ")[0]}</h2><p className="muted">{mode === "demo" ? "This is a sample driver. No call will be placed." : "Contact information is restricted to authorized bookings."}</p><div className="contact-detail"><span className="avatar driver-avatar">{initials(route.driver_name)}</span><div><h3>{route.driver_name}</h3><p>{route.driver_phone || "Contact number not provided"}</p><span className="verified-label"><ShieldCheck size={14}/>{mode === "demo" ? "CNIC verified · sample" : "Route driver"}</span></div></div><button className="btn-primary w-full" onClick={() => { notify(mode === "demo" ? "Demo driver contact viewed. No call or SMS was sent." : "Ask your route operator for the authorized driver contact number."); showContact(false); }}>Done <Check size={16}/></button></>}
      {sos && <><span className="dialog-icon sos"><ShieldAlert size={25}/></span><p className="eyebrow text-red-600">DEMONSTRATION ONLY</p><h2 id="tracking-dialog-title">Mock emergency broadcast</h2><p className="muted">This records the current van location in your in-app safety stream. It does not call, text or contact emergency services.</p><div className="coordinates-box"><MapPin size={19}/><div><strong>{position[0].toFixed(5)}, {position[1].toFixed(5)}</strong><span>{mode === "demo" ? "Simulated vehicle position" : "Last recorded vehicle position"}</span></div></div><p className="info-note">In a real emergency, contact local emergency services directly. Do not rely on this demonstration.</p><button className="btn-danger w-full" onClick={() => { sendSOS(); showSOS(false); }}><ShieldAlert size={18}/> Broadcast mock location</button><button className="btn-secondary w-full mt-2" onClick={() => showSOS(false)}>Cancel</button></>}
    </div></div>}
  </>;
}
