'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { CalendarDaysIcon, ClockIcon } from '@heroicons/react/24/outline';

// A friendlier replacement for a single <input type="datetime-local">: a
// react-day-picker calendar popover for the date paired with a 15-minute time
// dropdown, plus an optional "Time TBD" toggle for when only the date is known.
//
// The parent still stores one naive wall-clock string ("YYYY-MM-DDTHH:MM",
// see src/lib/time.ts) via `value`/`onChange`, so this is a drop-in swap for
// the native inputs — no caller changes. When TBD is checked the time is
// pinned to midnight and `onTimeTbdChange(true)` fires so the caller persists
// the `time_tbd` flag.

interface DateTimeFieldProps {
  value: string;                       // naive "YYYY-MM-DDTHH:MM" or ''
  onChange: (value: string) => void;
  /** Show the "Time TBD" toggle and manage its state. */
  allowTbd?: boolean;
  timeTbd?: boolean;
  onTimeTbdChange?: (tbd: boolean) => void;
  /** Requires a date; also requires a time unless TBD is checked. */
  required?: boolean;
  id?: string;
}

const controlClass =
  'px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue';

const TIME_STEP_MINUTES = 15;

// "18:30" → "6:30 PM". Pure string math — these are naive club times, never run
// through Date (which would shift them by the server/viewer timezone).
const to12h = (hh: string, mm: string): string => {
  let h = parseInt(hh, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${mm} ${ampm}`;
};

// "YYYY-MM-DD" ↔ Date built in *local* fields so the calendar never shifts a day.
const toDateObj = (ymd: string): Date | undefined => {
  if (!ymd) return undefined;
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
};
const fromDateObj = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function DateTimeField({
  value,
  onChange,
  allowTbd = false,
  timeTbd = false,
  onTimeTbdChange,
  required = false,
  id,
}: DateTimeFieldProps) {
  const datePart = value ? value.slice(0, 10) : '';
  const timePart = value.length >= 16 ? value.slice(11, 16) : '';
  const selectedDate = toDateObj(datePart);

  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close the calendar when clicking outside it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const timeOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (let m = 0; m < 24 * 60; m += TIME_STEP_MINUTES) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      opts.push({ value: `${hh}:${mm}`, label: to12h(hh, mm) });
    }
    return opts;
  }, []);

  // Preserve an existing off-grid time (e.g. an old 6:37 PM event) as its own
  // option so editing doesn't silently snap it to the nearest quarter hour.
  const offGridTime =
    timePart && !timeOptions.some((o) => o.value === timePart) ? timePart : '';

  // Combine date + time back into the stored naive string. No date → empty so
  // `required` validation still fires. Missing time falls back to midnight (the
  // TBD placeholder); the caller pairs that with the time_tbd flag.
  const emit = (d: string, t: string) => onChange(d ? `${d}T${t || '00:00'}` : '');

  const handlePickDate = (date?: Date) => {
    if (!date) return;
    emit(fromDateObj(date), timeTbd ? '00:00' : timePart);
    setOpen(false);
  };
  const handleTime = (t: string) => emit(datePart, t);
  const handleTbd = (checked: boolean) => {
    onTimeTbdChange?.(checked);
    emit(datePart, checked ? '00:00' : timePart);
  };

  const dateLabel = selectedDate
    ? selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : 'Select date';

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Date: button opens a calendar popover */}
        <div className="relative flex-1" ref={popoverRef}>
          <button
            id={id}
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={`${controlClass} w-full flex items-center justify-between gap-2 text-left`}
          >
            <span className={selectedDate ? '' : 'text-gray-400 dark:text-gray-500'}>{dateLabel}</span>
            <CalendarDaysIcon className="w-5 h-5 text-gray-400 shrink-0" />
          </button>
          {open && (
            <div className="absolute z-50 mt-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg p-2">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={handlePickDate}
                defaultMonth={selectedDate}
                showOutsideDays
              />
            </div>
          )}
          {/* Mirrors the date into the form so native `required` validation still
              works despite the trigger being a button. sr-only (not display:none)
              keeps it focusable for the browser's validation bubble. */}
          {required && (
            <input
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
              required
              value={datePart}
              onChange={() => {}}
            />
          )}
        </div>

        {/* Time: 15-minute dropdown, disabled when TBD */}
        <div className="relative sm:w-44">
          <select
            value={timeTbd ? '' : timePart}
            disabled={timeTbd}
            required={required && !timeTbd}
            onChange={(e) => handleTime(e.target.value)}
            className={`${controlClass} w-full appearance-none pr-9 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <option value="">{timeTbd ? 'TBD' : 'Select time'}</option>
            {offGridTime && <option value={offGridTime}>{to12h(offGridTime.slice(0, 2), offGridTime.slice(3, 5))}</option>}
            {timeOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ClockIcon className="w-5 h-5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {allowTbd && (
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={timeTbd}
            onChange={(e) => handleTbd(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600 text-team-blue focus:ring-team-blue"
          />
          Time is TBD (date only)
        </label>
      )}
    </div>
  );
}
