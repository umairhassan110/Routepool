'use client';

import {
  ArrowRight,
  BadgeCheck,
  Car,
  CheckCircle2,
  Clock3,
  MapPin,
  Snowflake,
  Users,
} from 'lucide-react';
import { formatFare, formatTime, initials } from '@/lib/utils';
import type { Route } from '@/lib/types';

interface RouteCardProps {
  route: Route;
  onBook: (route: Route) => void;
}

function vehicleIcon(vehicleType: string) {
  return vehicleType.toLowerCase().includes('ac') ? Snowflake : Car;
}

export function RouteCard({ route, onBook }: RouteCardProps) {
  const VehicleIcon = vehicleIcon(route.vehicle_type);
  const stops = [route.origin, ...route.waypoints, route.destination];

  return (
    <article className="group rounded-[14px] border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_14px_36px_rgba(16,185,129,0.1)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700 ring-4 ring-emerald-50/60">
            {initials(route.driver_name)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="truncate font-semibold text-[#0F172A]">{route.driver_name}</h3>
              {route.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700" title="CNIC Verified sample record">
                  <BadgeCheck size={13} aria-hidden="true" />
                  CNIC Verified
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">{route.rating > 0 ? `${route.vehicle_plate} · ${route.rating.toFixed(1)} rating · ${route.trips_count} sample trips` : 'Monthly route · driver profile'}</p>
          </div>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="text-lg font-bold tabular-nums text-[#0F172A]">{formatFare(route.monthly_fare_pkr)}</p>
          <p className="text-xs text-slate-500">Monthly pick & drop</p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-medium text-slate-700">
            <span className="inline-flex items-center gap-1.5"><VehicleIcon size={16} className="text-emerald-600" aria-hidden="true" />{route.vehicle_type}</span>
            <span className="inline-flex items-center gap-1.5"><Clock3 size={15} className="text-slate-400" aria-hidden="true" />{formatTime(route.pickup_time)} <ArrowRight size={13} className="text-slate-300" aria-hidden="true" /> {formatTime(route.drop_time)}</span>
          </div>
          <div className="relative space-y-3 pl-7">
            <div className="absolute bottom-2 left-[7px] top-2 w-px bg-emerald-100" aria-hidden="true" />
            {stops.map((stop, index) => (
              <div className="relative flex items-start gap-2" key={`${stop}-${index}`}>
                <span className={`absolute -left-7 top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white ring-1 ${index === 0 || index === stops.length - 1 ? 'bg-emerald-500 ring-emerald-200' : 'bg-slate-300 ring-slate-200'}`} aria-hidden="true">
                  {index === 0 || index === stops.length - 1 ? <MapPin size={9} className="text-white" /> : null}
                </span>
                <span className={`text-sm ${index === 0 || index === stops.length - 1 ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>{stop}</span>
                {index === 1 && stops.length > 2 ? <span className="text-xs text-slate-400">via</span> : null}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-3 md:min-w-[155px] md:items-end">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm md:w-full">
            <span className="inline-flex items-center gap-1.5 text-slate-500"><Users size={15} aria-hidden="true" />Seats left</span>
            <span className={`font-bold ${route.available_seats <= 2 ? 'text-amber-600' : 'text-emerald-700'}`}>{route.available_seats}/{route.total_seats}</span>
          </div>
          <button
            type="button"
            onClick={() => onBook(route)}
            disabled={route.available_seats <= 0}
            className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {route.available_seats > 0 ? 'Request a seat' : 'Route is full'}
            {route.available_seats > 0 ? <ArrowRight size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </article>
  );
}
