'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Phone, UserRound, X } from 'lucide-react';
import { formatFare, isPakistaniPhone, validateBooking } from '@/lib/utils';
import type { BookingDraft, Route } from '@/lib/types';

interface BookingModalProps {
  route: Route | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (draft: BookingDraft) => Promise<boolean>;
}

const emptyDraft: BookingDraft = {
  passenger_name: '',
  passenger_phone: '',
  parent_phone: '',
  boarding_point: '',
};

export function BookingModal({ route, open, onClose, onSubmit }: BookingModalProps) {
  const [draft, setDraft] = useState<BookingDraft>(emptyDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(emptyDraft);
    setErrors({});
    const timer = window.setTimeout(() => firstFieldRef.current?.focus(), 20);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!open || !route) return null;

  const update = (field: keyof BookingDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: '' }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateBooking(draft);
    if (draft.passenger_phone && !isPakistaniPhone(draft.passenger_phone)) {
      nextErrors.passenger_phone = 'Enter a valid Pakistani mobile number, e.g. 0300 1234567.';
    }
    if (draft.parent_phone && !isPakistaniPhone(draft.parent_phone)) {
      nextErrors.parent_phone = 'Enter a valid Pakistani mobile number, e.g. 0300 1234567.';
    }
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    setSubmitting(true);
    const saved = await onSubmit(draft);
    setSubmitting(false);
    if (saved) onClose();
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-[#0F172A]/55 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={panelRef} className="modal-panel max-h-[92vh] w-full overflow-y-auto rounded-t-[20px] bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-[20px] sm:p-7" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">MONTHLY SEAT REQUEST</p>
            <h2 id="booking-modal-title" className="mt-2 text-2xl font-bold tracking-tight text-[#0F172A]">Save your morning seat</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Request a monthly seat from {route.driver_name}. Seats are reserved only after approval. This app does not collect payment.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close booking modal"><X size={20} /></button>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm">
          <span className="font-medium text-emerald-900">{route.origin} <span className="px-1 text-emerald-400">→</span> {route.destination}</span>
          <span className="font-bold text-emerald-800">{formatFare(route.monthly_fare_pkr)}</span>
        </div>

        <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
          <div>
            <label className="field-label" htmlFor="passenger_name">Student / commuter name</label>
            <div className="relative mt-1.5"><UserRound className="pointer-events-none absolute left-3 top-3.5 text-slate-400" size={17} /><input ref={firstFieldRef} id="passenger_name" className="field w-full pl-10" value={draft.passenger_name} onChange={(event) => update('passenger_name', event.target.value)} placeholder="e.g. Areeba Khan" required aria-invalid={Boolean(errors.passenger_name)} /></div>
            {errors.passenger_name && <p className="mt-1 text-xs text-red-600">{errors.passenger_name}</p>}
          </div>
          <div>
            <label className="field-label" htmlFor="passenger_phone">Student / commuter phone</label>
            <div className="relative mt-1.5"><Phone className="pointer-events-none absolute left-3 top-3.5 text-slate-400" size={17} /><input id="passenger_phone" type="tel" inputMode="tel" className="field w-full pl-10" value={draft.passenger_phone} onChange={(event) => update('passenger_phone', event.target.value)} placeholder="0300 1234567" required aria-invalid={Boolean(errors.passenger_phone)} /></div>
            {errors.passenger_phone && <p className="mt-1 text-xs text-red-600">{errors.passenger_phone}</p>}
          </div>
          <div>
            <label className="field-label" htmlFor="parent_phone">Parent / guardian phone</label>
            <div className="relative mt-1.5"><Phone className="pointer-events-none absolute left-3 top-3.5 text-slate-400" size={17} /><input id="parent_phone" type="tel" inputMode="tel" className="field w-full pl-10" value={draft.parent_phone} onChange={(event) => update('parent_phone', event.target.value)} placeholder="0312 7654321" required aria-invalid={Boolean(errors.parent_phone)} /></div>
            {errors.parent_phone && <p className="mt-1 text-xs text-red-600">{errors.parent_phone}</p>}
          </div>
          <div>
            <label className="field-label" htmlFor="boarding_point">Preferred pickup point</label>
            <input id="boarding_point" className="field mt-1.5 w-full" value={draft.boarding_point} onChange={(event) => update('boarding_point', event.target.value)} placeholder="e.g. I-8 Markaz gate" required aria-invalid={Boolean(errors.boarding_point)} />
            {errors.boarding_point && <p className="mt-1 text-xs text-red-600">{errors.boarding_point}</p>}
          </div>
          {errors.form && <p className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={16} />{errors.form}</p>}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="btn-secondary min-h-11 rounded-xl px-5 text-sm font-semibold">Not now</button>
            <button type="submit" disabled={submitting} className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold disabled:opacity-60">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {submitting ? 'Sending request…' : 'Send seat request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
