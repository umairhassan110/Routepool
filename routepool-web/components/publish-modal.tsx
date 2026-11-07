'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, BusFront, CheckCircle2, Loader2, X } from 'lucide-react';
import { validateRoute } from '@/lib/utils';
import type { RouteDraft } from '@/lib/types';

interface PublishModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (draft: RouteDraft) => Promise<boolean>;
}

const emptyDraft: RouteDraft = {
  origin: '',
  destination: '',
  waypoints: [],
  vehicle_type: 'AC Van',
  pickup_time: '07:00',
  drop_time: '08:15',
  total_seats: 12,
  monthly_fare_pkr: 8500,
};

export function PublishModal({ open, onClose, onSubmit }: PublishModalProps) {
  const [draft, setDraft] = useState<RouteDraft>(emptyDraft);
  const [waypointsText, setWaypointsText] = useState('');
  const [coordinatesText, setCoordinatesText] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(emptyDraft);
    setWaypointsText('');
    setCoordinatesText('');
    setErrors({});
    const timer = window.setTimeout(() => firstFieldRef.current?.focus(), 20);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { window.clearTimeout(timer); document.removeEventListener('keydown', onKeyDown); };
  }, [open]);

  if (!open) return null;

  const update = <K extends keyof RouteDraft>(field: K, value: RouteDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: '' }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextDraft = { ...draft, waypoints: waypointsText.split(',').map((item) => item.trim()).filter(Boolean) };
    const nextErrors = validateRoute(nextDraft);
    if (coordinatesText.trim()) {
      try {
        const points = JSON.parse(coordinatesText);
        if (!Array.isArray(points) || points.length < 2 || points.some((point) => !Array.isArray(point) || point.length !== 2 || typeof point[0] !== 'number' || typeof point[1] !== 'number' || !Number.isFinite(point[0]) || !Number.isFinite(point[1]) || Math.abs(point[0]) > 90 || Math.abs(point[1]) > 180)) throw new Error('Invalid points');
        nextDraft.coordinates = points;
      } catch { nextErrors.coordinates = 'Use a JSON list of at least two valid [latitude, longitude] pairs.'; }
    }
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    setSubmitting(true);
    const saved = await onSubmit(nextDraft);
    setSubmitting(false);
    if (saved) onClose();
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-[#0F172A]/55 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={panelRef} className="modal-panel max-h-[92vh] w-full overflow-y-auto rounded-t-[20px] bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-[20px] sm:p-7" role="dialog" aria-modal="true" aria-labelledby="publish-modal-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">NEW COMMUTE ROUTE</p>
            <h2 id="publish-modal-title" className="mt-2 text-2xl font-bold tracking-tight text-[#0F172A]">Publish a route families can trust</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Keep the details clear. Approved passengers will see your pickup window and monthly fare.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close publish route modal"><X size={20} /></button>
        </div>

        <form className="mt-6 space-y-5" onSubmit={submit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="field-label" htmlFor="route_origin">Origin</label><input ref={firstFieldRef} id="route_origin" className="field mt-1.5 w-full" value={draft.origin} onChange={(event) => update('origin', event.target.value)} placeholder="I-8 Markaz" required />{errors.origin && <p className="mt-1 text-xs text-red-600">{errors.origin}</p>}</div>
            <div><label className="field-label" htmlFor="route_destination">Destination</label><input id="route_destination" className="field mt-1.5 w-full" value={draft.destination} onChange={(event) => update('destination', event.target.value)} placeholder="NUST H-12" required />{errors.destination && <p className="mt-1 text-xs text-red-600">{errors.destination}</p>}</div>
          </div>
          <div><label className="field-label" htmlFor="route_waypoints">Waypoints <span className="font-normal text-slate-400">(comma separated)</span></label><input id="route_waypoints" className="field mt-1.5 w-full" value={waypointsText} onChange={(event) => setWaypointsText(event.target.value)} placeholder="G-10, Kashmir Highway" />{errors.waypoints && <p className="mt-1 text-xs text-red-600">{errors.waypoints}</p>}</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="field-label" htmlFor="vehicle_type">Vehicle information</label><div className="relative mt-1.5"><BusFront className="pointer-events-none absolute left-3 top-3.5 text-slate-400" size={17} /><input id="vehicle_type" className="field w-full pl-10" value={draft.vehicle_type} onChange={(event) => update('vehicle_type', event.target.value)} placeholder="Toyota HiAce 14-Seater AC Van" required /></div>{errors.vehicle_type && <p className="form-error">{errors.vehicle_type}</p>}</div>
            <div><label className="field-label" htmlFor="route_seats">Seat capacity</label><input id="route_seats" type="number" min={1} max={40} className="field mt-1.5 w-full" value={draft.total_seats} onChange={(event) => update('total_seats', Number(event.target.value))} required />{errors.total_seats && <p className="mt-1 text-xs text-red-600">{errors.total_seats}</p>}</div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="field-label" htmlFor="pickup_time">Pickup time</label><input id="pickup_time" type="time" className="field mt-1.5 w-full" value={draft.pickup_time} onChange={(event) => update('pickup_time', event.target.value)} required />{errors.pickup_time && <p className="form-error">{errors.pickup_time}</p>}</div>
            <div><label className="field-label" htmlFor="drop_time">Drop time</label><input id="drop_time" type="time" className="field mt-1.5 w-full" value={draft.drop_time} onChange={(event) => update('drop_time', event.target.value)} required />{errors.drop_time && <p className="form-error">{errors.drop_time}</p>}</div>
            <div><label className="field-label" htmlFor="monthly_fare_pkr">Monthly fare (PKR)</label><input id="monthly_fare_pkr" type="number" min={1} step={100} className="field mt-1.5 w-full" value={draft.monthly_fare_pkr} onChange={(event) => update('monthly_fare_pkr', Number(event.target.value))} required />{errors.monthly_fare_pkr && <p className="mt-1 text-xs text-red-600">{errors.monthly_fare_pkr}</p>}</div>
          </div>
          <div><label className="field-label" htmlFor="route_coordinates">Route map geometry <span className="font-normal text-slate-400">(optional)</span></label><textarea id="route_coordinates" className="field mt-1.5 w-full font-mono" value={coordinatesText} onChange={(event) => setCoordinatesText(event.target.value)} placeholder="[[33.6685,73.0747],[33.6420,72.9903]]"/><p className="mt-1 text-[10px] leading-5 text-slate-400">Supply actual [latitude, longitude] route points to draw the route line. Without geometry, a live GPS marker can still be tracked.</p>{errors.coordinates && <p className="form-error">{errors.coordinates}</p>}</div>
          {errors.form && <p className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={16} />{errors.form}</p>}
          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="btn-secondary min-h-11 rounded-xl px-5 text-sm font-semibold">Cancel</button><button type="submit" disabled={submitting} className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold disabled:opacity-60">{submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}{submitting ? 'Publishing…' : 'Publish route'}</button></div>
        </form>
      </div>
    </div>
  );
}
