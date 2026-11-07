'use client';

import { FormEvent, useMemo, useState } from 'react';
import { ArrowDownUp, Check, ChevronDown, Filter, MapPin, RotateCcw, Search, ShieldCheck, SlidersHorizontal, X } from 'lucide-react';
import { useRoutePool } from '@/components/routepool-provider';
import { filterRoutes } from '@/lib/utils';
import type { Route } from '@/lib/types';
import { BookingModal } from '@/components/booking-modal';
import { RouteCard } from '@/components/route-card';

const filterOptions = [
  { label: 'AC Van', value: 'AC Van' },
  { label: 'Car', value: 'Car' },
  { label: 'Under PKR 10,000', value: 'Under PKR 10,000' },
];

type SortMode = 'cheapest' | 'available';

export function SearchScreen() {
  const { data, bookRoute, hydrated, notice, clearNotice } = useRoutePool();
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [filters, setFilters] = useState<string[]>([]);
  const [sort, setSort] = useState<SortMode>('cheapest');
  const [searched, setSearched] = useState(false);
  const [bookingRoute, setBookingRoute] = useState<Route | null>(null);

  const routes = useMemo(() => {
    const matching = filterRoutes(data.routes.filter((route) => route.is_active), pickup, destination, filters);
    return [...matching].sort((a, b) => sort === 'cheapest' ? a.monthly_fare_pkr - b.monthly_fare_pkr : b.available_seats - a.available_seats);
  }, [data.routes, destination, filters, pickup, sort]);

  const toggleFilter = (value: string) => {
    setFilters((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const reset = () => {
    setPickup('');
    setDestination('');
    setFilters([]);
    setSort('cheapest');
    setSearched(false);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearched(true);
  };

  return (
    <div className="feature-screen">
      <header className="max-w-3xl">
        <p className="eyebrow">YOUR DAILY COMMUTE</p>
        <h1 className="feature-title">Find your everyday ride<span className="heading-dot">.</span></h1>
        <p className="feature-subtitle">Monthly routes that keep your mornings predictable and your family in the loop.</p>
      </header>

      <section className="panel mt-8 rounded-[14px] border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:p-5" aria-label="Search for a route">
        <form onSubmit={submitSearch} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
          <div><label className="field-label" htmlFor="search-pickup">Pickup area</label><div className="relative mt-1.5"><MapPin size={17} className="pointer-events-none absolute left-3 top-3.5 text-emerald-600" aria-hidden="true" /><input id="search-pickup" className="field w-full pl-10" value={pickup} onChange={(event) => setPickup(event.target.value)} placeholder="e.g. I-8, G-10, Bahria" /></div></div>
          <div><label className="field-label" htmlFor="search-destination">University / school destination</label><div className="relative mt-1.5"><MapPin size={17} className="pointer-events-none absolute left-3 top-3.5 text-emerald-600" aria-hidden="true" /><input id="search-destination" className="field w-full pl-10" value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="e.g. NUST H-12, FAST, MYU" /></div></div>
          <button type="submit" className="btn-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold transition hover:-translate-y-0.5"><Search size={17} aria-hidden="true" />Search routes</button>
        </form>
        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2"><span className="mr-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400"><SlidersHorizontal size={14} aria-hidden="true" />Filters</span>{filterOptions.map((option) => { const active = filters.includes(option.value); return <button key={option.value} type="button" aria-pressed={active} onClick={() => toggleFilter(option.value)} className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition ${active ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700'}`}>{active ? <Check size={14} /> : null}{option.label}</button>; })}</div>
          {(filters.length > 0 || pickup || destination) && <button type="button" onClick={reset} className="inline-flex min-h-9 items-center gap-1.5 self-start text-sm font-semibold text-slate-500 transition hover:text-emerald-700 sm:self-auto"><RotateCcw size={14} />Reset</button>}
        </div>
      </section>

      {notice && <div className="mt-5 flex items-start justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status"><span className="flex items-center gap-2"><ShieldCheck size={17} />{notice}</span><button type="button" onClick={clearNotice} aria-label="Dismiss notice"><X size={16} /></button></div>}

      <section className="mt-9" aria-live="polite">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="eyebrow">{searched ? 'MATCHES FOR YOUR SEARCH' : 'ROUTES NEAR YOU'}</p><h2 className="mt-2 text-xl font-bold text-[#0F172A]">{hydrated ? `${routes.length} ${routes.length === 1 ? 'route' : 'routes'} available` : 'Loading routes…'}</h2></div>
          <label className="relative inline-flex items-center gap-2 text-sm text-slate-500"><ArrowDownUp size={15} aria-hidden="true" /><span className="sr-only">Sort routes</span><select aria-label="Sort routes" className="min-h-10 appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" value={sort} onChange={(event) => setSort(event.target.value as SortMode)}><option value="cheapest">Cheapest first</option><option value="available">Most available</option></select><ChevronDown size={14} className="pointer-events-none absolute right-2" aria-hidden="true" /></label>
        </div>

        {routes.length > 0 ? <div className="matching-grid mt-5">{routes.map((route) => <RouteCard key={route.id} route={route} onBook={setBookingRoute} />)}</div> : <div className="mt-5 rounded-[14px] border border-dashed border-slate-300 bg-slate-50/60 px-6 py-14 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm"><Filter size={20} /></div><h3 className="mt-4 text-lg font-semibold text-[#0F172A]">No routes match that yet</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Try a nearby pickup, remove a filter, or reset your search to see the full Islamabad route pool.</p><button type="button" onClick={reset} className="btn-secondary mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold"><RotateCcw size={15} />Reset search</button></div>}
      </section>

      <BookingModal route={bookingRoute} open={Boolean(bookingRoute)} onClose={() => setBookingRoute(null)} onSubmit={(draft) => bookingRoute ? bookRoute(bookingRoute.id, draft) : Promise.resolve(false)} />
    </div>
  );
}
