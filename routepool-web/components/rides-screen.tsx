"use client";

import Link from "next/link";
import { ArrowRight, BusFront, Navigation } from "lucide-react";
import { useRoutePool } from "./routepool-provider";
import { formatFare, formatTime } from "@/lib/utils";

export function RidesScreen() {
  const { data, setSelectedRouteId, mode } = useRoutePool();
  return <><div className="page-heading"><div><p className="eyebrow">YOUR MONTHLY COMMUTE</p><h1>My rides<span className="heading-dot">.</span></h1><p>Your requests, confirmed seats and everyday routes in one place.</p></div><Link href="/search" className="btn-primary">Find a route <ArrowRight size={15}/></Link></div>{mode === "demo" && <p className="info-note mb-5">These are sample and local demo bookings. Switch to Driver to review a pending request. No actual seat reservation or payment is made.</p>}<div className="ride-list">{data.bookings.map((booking) => {
    const route = data.routes.find((r) => r.id === booking.route_id);
    return <article className="ride-item panel" key={booking.id}><span className="icon-tile"><BusFront size={20}/></span><div><h2>{booking.passenger_name}</h2><p>{route?.origin ?? booking.boarding_point} → {route?.destination ?? "Assigned destination"}</p><p>Pickup {route ? formatTime(route.pickup_time) : "To be confirmed"} · {booking.boarding_point}</p></div><div className="ride-meta"><span className={`status-pill ${booking.status === "approved" ? "live-pill" : booking.status === "rejected" ? "bg-red-50 text-red-500" : "demo-pill"}`}>{booking.status === "approved" ? "Seat confirmed" : booking.status === "pending" ? "Awaiting driver" : "Not approved"}</span>{route && <p>{formatFare(route.monthly_fare_pkr)}</p>}<p className="capitalize">{booking.attendance}</p></div>{route && <Link className="btn-secondary" href="/tracking" onClick={() => setSelectedRouteId(route.id)}><Navigation size={14}/>Track route</Link>}</article>;
  })}</div>{!data.bookings.length && <div className="empty-state panel"><BusFront size={34}/><h2>Your next ride starts here</h2><p>Search for your pickup area and campus, then request a monthly seat.</p><Link href="/search" className="btn-primary">Find a route <ArrowRight size={15}/></Link></div>}</>;
}
