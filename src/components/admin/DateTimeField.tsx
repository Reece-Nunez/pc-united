'use client';

// A friendlier replacement for a single <input type="datetime-local">: a native
// date picker paired with a *separate* native time picker, plus an optional
// "Time TBD" toggle for when only the date is known.
//
// The parent keeps storing one naive wall-clock string ("YYYY-MM-DDTHH:MM",
// see src/lib/time.ts) via `value`/`onChange`, so wiring is a drop-in swap.
// When TBD is checked the time is pinned to midnight and `onTimeTbdChange(true)`
// fires so the caller can persist the `time_tbd` flag.

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

const inputClass =
  'px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue';

const openPicker = (e: React.MouseEvent<HTMLInputElement>) => {
  // Tapping anywhere on the field opens the native picker instead of only the
  // tiny calendar/clock glyph — the main "hard to select" complaint.
  try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch { /* not user-initiated */ }
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

  // Combine date + time back into the stored naive string. No date → empty so
  // `required` validation still fires. Missing time falls back to midnight
  // (the TBD placeholder); the caller pairs that with the time_tbd flag.
  const emit = (d: string, t: string) => onChange(d ? `${d}T${t || '00:00'}` : '');

  const handleDate = (d: string) => emit(d, timeTbd ? '00:00' : timePart);
  const handleTime = (t: string) => emit(datePart, t);
  const handleTbd = (checked: boolean) => {
    onTimeTbdChange?.(checked);
    emit(datePart, checked ? '00:00' : timePart);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          id={id}
          type="date"
          value={datePart}
          required={required}
          onClick={openPicker}
          onChange={(e) => handleDate(e.target.value)}
          className={`${inputClass} flex-1`}
        />
        <input
          type="time"
          value={timeTbd ? '' : timePart}
          disabled={timeTbd}
          required={required && !timeTbd}
          placeholder={timeTbd ? 'TBD' : undefined}
          onClick={openPicker}
          onChange={(e) => handleTime(e.target.value)}
          className={`${inputClass} sm:w-40 disabled:opacity-50 disabled:cursor-not-allowed`}
        />
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
