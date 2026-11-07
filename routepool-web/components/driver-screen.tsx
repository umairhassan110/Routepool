'use client';

import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Check, ChevronDown, CircleCheck, CircleX, Clock3, MapPin, Play, Plus, ShieldCheck, Square, UserRound, Users, X } from 'lucide-react';
import { useRoutePool } from '@/components/routepool-provider';
import { DEMO_DRIVER_ID } from '@/lib/seed';
import { formatFare, formatTime } from '@/lib/utils';
import type { AttendanceStatus, Booking, Route, RouteDraft, TripStatus } from '@/lib/types';
import { PublishModal } from '@/components/publish-modal';
import { GPSControl } from '@/components/gps-control';

const attendanceOptions: { label: string; value: AttendanceStatus }[] = [
  { label: 'Waiting', value: 'waiting' },
  { label: 'Boarded', value: 'boarded' },
  { label: 'Dropped', value: 'dropped' },
];

function statusLabel(status: TripStatus | undefined) {
  if (status === 'in_progress') return 'In progress';
  if (status === 'completed') return 'Completed';
  return 'Scheduled';
}

export function DriverScreen() {
  const { data, mode, profile, selectedRouteId, setSelectedRouteId, setTripStatus, setAttendance, decideBooking, publishRoute, notice, clearNotice } = useRoutePool();
  const [publishOpen, setPublishOpen] = useState(false);

  const driverId = mode === 'demo' ? DEMO_DRIVER_ID : profile?.id;
  const ownRoutes = useMemo(() => data.routes.filter((route: Route) => route.driver_id === driverId), [data.routes, driverId]);
  const selectedRoute = ownRoutes.find((route) => route.id === selectedRouteId) ?? ownRoutes[0];
  const activeTrip = data.trips.find((trip) => trip.route_id === selectedRoute?.id);
  const routeBookings = useMemo(() => data.bookings.filter((booking: Booking) => booking.route_id === selectedRoute?.id), [data.bookings, selectedRoute?.id]);
  const pendingBookings = routeBookings.filter((booking) => booking.status === 'pending');

  useEffect(() => {
    if (selectedRoute && selectedRoute.id !== selectedRouteId) setSelectedRouteId(selectedRoute.id);
  }, [selectedRoute, selectedRouteId, setSelectedRouteId]);

  const counts = useMemo(() => routeBookings.reduce((acc, booking) => { acc[booking.attendance] += 1; return acc; }, { waiting: 0, boarded: 0, dropped: 0 } as Record<AttendanceStatus, number>), [routeBookings]);

  const changeTripStatus = async (status: TripStatus) => {
    if (selectedRoute) await setTripStatus(selectedRoute.id, status);
  };

  if (!selectedRoute) {
    return <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pt-12"><p className="eyebrow">DRIVER CONSOLE</p><h1 className="page-heading mt-3">A smoother ride starts here.</h1><div className="panel mt-8 rounded-[14px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Plus size={21} /></div><h2 className="mt-4 text-lg font-semibold text-[#0F172A]">Publish your first route</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Add a route once, then manage requests and attendance from one calm dashboard.</p><button type="button" onClick={() => setPublishOpen(true)} className="btn-primary mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold"><Plus size={16} />Publish route</button></div><PublishModal open={publishOpen} onClose={() => setPublishOpen(false)} onSubmit={publishRoute} /></main>;
  }

  return (
    <div className="feature-screen">
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div><p className="eyebrow">DRIVER CONSOLE</p><h1 className="feature-title">A smoother ride starts here<span className="heading-dot">.</span></h1><p className="feature-subtitle">Keep your route moving and your passengers accounted for.</p></div>
        <button type="button" onClick={() => setPublishOpen(true)} className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl px-5 text-sm font-semibold transition hover:-translate-y-0.5 md:self-auto"><Plus size={17} />Publish another route</button>
      </header>

      <section className="panel mt-8 rounded-[14px] border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><label className="field-label" htmlFor="driver-route">Managing route</label><div className="relative mt-1.5"><MapPin size={16} className="pointer-events-none absolute left-3 top-3.5 text-emerald-600" /><select id="driver-route" className="field min-w-0 appearance-none pr-10 sm:min-w-[360px]" value={selectedRoute.id} onChange={(event) => setSelectedRouteId(event.target.value)}>{ownRoutes.map((route) => <option key={route.id} value={route.id}>{route.origin} → {route.destination}</option>)}</select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-3.5 text-slate-400" /></div></div><div className="flex flex-wrap gap-2 text-sm text-slate-500"><span className="rounded-full bg-slate-50 px-3 py-2">{selectedRoute.vehicle_type}</span><span className="rounded-full bg-slate-50 px-3 py-2">{formatFare(selectedRoute.monthly_fare_pkr)}</span><span className="rounded-full bg-emerald-50 px-3 py-2 font-semibold text-emerald-700">{selectedRoute.available_seats} seats left</span></div></div>
      </section>

      {notice && <div className="mt-5 flex items-start justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status"><span className="flex items-center gap-2"><ShieldCheck size={17} />{notice}</span><button type="button" onClick={clearNotice} aria-label="Dismiss notice"><X size={16} /></button></div>}

      <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <div className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">TRIP CONTROL</p><h2 className="mt-2 text-xl font-bold text-[#0F172A]">{selectedRoute.origin} to {selectedRoute.destination}</h2><p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-500"><Clock3 size={15} />{formatTime(selectedRoute.pickup_time)} pickup · {formatTime(selectedRoute.drop_time)} drop</p></div><span className={`status-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${activeTrip?.status === 'in_progress' ? 'bg-emerald-50 text-emerald-700' : activeTrip?.status === 'completed' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{statusLabel(activeTrip?.status)}</span></div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => changeTripStatus('in_progress')} disabled={activeTrip?.status === 'in_progress'} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-bold tracking-wide text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-45"><Play size={18} fill="currentColor" />START TRIP</button><button type="button" onClick={() => changeTripStatus('completed')} disabled={activeTrip?.status !== 'in_progress'} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-red-500 px-5 text-sm font-bold tracking-wide text-white shadow-lg shadow-red-500/15 transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-45"><Square size={17} fill="currentColor" />END TRIP</button></div>
          <p className="mt-5 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600"><ShieldCheck size={16} className="shrink-0 text-emerald-600" />GPS streaming active ONLY during active trip duration.</p>
        </div>
        <div className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:p-6"><p className="eyebrow">TODAY&apos;S ATTENDANCE</p><div className="mt-5 grid grid-cols-3 gap-2 text-center">{(['waiting', 'boarded', 'dropped'] as AttendanceStatus[]).map((status) => <div key={status} className="rounded-xl bg-slate-50 px-2 py-4"><p className="text-2xl font-bold tabular-nums text-[#0F172A]">{counts[status]}</p><p className="mt-1 text-xs capitalize text-slate-500">{status}</p></div>)}</div><p className="mt-5 text-sm leading-6 text-slate-500">Update each passenger as they enter and leave the vehicle. Connected families receive attendance updates.</p></div>
      </section>

      <GPSControl route={selectedRoute} trip={activeTrip}/>

      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:p-6"><div className="flex items-end justify-between gap-3"><div><p className="eyebrow">ATTENDANCE</p><h2 className="mt-2 text-xl font-bold text-[#0F172A]">Approved passengers</h2></div><span className="text-sm text-slate-500">{routeBookings.filter((booking) => booking.status === 'approved').length} approved</span></div><div className="mt-5 space-y-3">{routeBookings.filter((booking) => booking.status === 'approved').map((booking) => <AttendanceRow key={booking.id} booking={booking} onChange={setAttendance} />)}{routeBookings.filter((booking) => booking.status === 'approved').length === 0 && <EmptyPanel text="Approved passengers will appear here." />}</div></div>
        <div className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:p-6"><div className="flex items-end justify-between gap-3"><div><p className="eyebrow">BOOKING REQUESTS</p><h2 className="mt-2 text-xl font-bold text-[#0F172A]">Review passengers</h2></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{pendingBookings.length} pending</span></div><div className="mt-5 space-y-3">{pendingBookings.map((booking) => <BookingRow key={booking.id} booking={booking} onDecide={decideBooking} />)}{pendingBookings.length === 0 && <EmptyPanel text="You are all caught up on booking requests." />}</div></div>
      </section>
      <PublishModal open={publishOpen} onClose={() => setPublishOpen(false)} onSubmit={async (draft: RouteDraft) => publishRoute(draft)} />
    </div>
  );
}

function AttendanceRow({ booking, onChange }: { booking: Booking; onChange: (id: string, status: AttendanceStatus) => Promise<void> }) {
  return <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-bold text-emerald-700 shadow-sm"><UserRound size={15} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{booking.passenger_name}</p><p className="truncate text-xs text-slate-500">Pickup: {booking.boarding_point}</p></div><span className="hidden text-xs text-slate-400 sm:block">{booking.parent_phone}</span></div><div className="mt-3 grid grid-cols-3 gap-1.5">{attendanceOptions.map((option) => <button key={option.value} type="button" aria-pressed={booking.attendance === option.value} onClick={() => onChange(booking.id, option.value)} className={`min-h-9 rounded-lg px-2 text-xs font-semibold transition ${booking.attendance === option.value ? option.value === 'dropped' ? 'bg-slate-800 text-white' : 'bg-emerald-500 text-white' : 'bg-white text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'}`}>{option.label}</button>)}</div></div>;
}

function BookingRow({ booking, onDecide }: { booking: Booking; onDecide: (id: string, status: 'approved' | 'rejected') => Promise<void> }) {
  return <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5"><div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm"><Users size={16} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold text-slate-800">{booking.passenger_name}</p><span className="inline-flex items-center gap-1 text-[11px] text-emerald-700"><BadgeCheck size={12} />Parent contact added</span></div><p className="mt-1 text-xs text-slate-500">{booking.boarding_point} · {booking.parent_phone}</p></div></div><div className="mt-3 flex gap-2"><button type="button" onClick={() => onDecide(booking.id, 'approved')} className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-white transition hover:bg-emerald-600"><CircleCheck size={14} />Approve</button><button type="button" onClick={() => onDecide(booking.id, 'rejected')} className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-red-600 ring-1 ring-inset ring-red-200 transition hover:bg-red-50"><CircleX size={14} />Reject</button></div></div>;
}

function EmptyPanel({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">{text}</div>; }
