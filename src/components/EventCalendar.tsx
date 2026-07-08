'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarItem } from '@/lib/calendar';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

// Chip color by team; games get a ring so they read as games at a glance.
const chipClass = (item: CalendarItem) => {
  const base = item.teamName === 'U11' ? 'bg-team-blue text-white'
    : item.teamName === 'U12' ? 'bg-team-red text-white'
    : 'bg-gray-500 text-white';
  return `${base} ${item.kind === 'game' ? 'ring-1 ring-white/60' : ''}`;
};

const fmtDateTime = (s?: string) => s ? new Date(s).toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

export default function EventCalendar({ items, canEdit = false, editHref }: {
  items: CalendarItem[];
  canEdit?: boolean;
  editHref?: (item: CalendarItem) => string;
}) {
  const today = new Date();
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<CalendarItem | null>(null);

  const byDay = useMemo(() => {
    const map: Record<string, CalendarItem[]> = {};
    items.forEach(it => {
      const d = new Date(it.date);
      const k = dayKey(d);
      (map[k] = map[k] || []).push(it);
    });
    Object.values(map).forEach(list => list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    return map;
  }, [items]);

  // Build the 6-week grid covering the visible month.
  const cells = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay()); // back up to Sunday
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [view]);

  const monthLabel = view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const isToday = (d: Date) => dayKey(d) === dayKey(today);
  const inMonth = (d: Date) => d.getMonth() === view.getMonth();
  const goMonth = (delta: number) => setView(v => new Date(v.getFullYear(), v.getMonth() + delta, 1));

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <button onClick={() => goMonth(-1)} aria-label="Previous month" className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">‹</button>
          <button onClick={() => setView(new Date(today.getFullYear(), today.getMonth(), 1))} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium">Today</button>
          <button onClick={() => goMonth(1)} aria-label="Next month" className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">›</button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
            {WEEKDAYS.map(w => <div key={w} className="py-1">{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
            {cells.map((d, i) => {
              const dayItems = byDay[dayKey(d)] || [];
              return (
                <div key={i} className={`min-h-[92px] p-1.5 bg-white dark:bg-gray-800 ${inMonth(d) ? '' : 'bg-gray-50 dark:bg-gray-800/40'}`}>
                  <div className={`text-xs mb-1 font-medium ${
                    isToday(d) ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-team-blue text-white'
                    : inMonth(d) ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>
                    {d.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map(it => (
                      <button key={`${it.kind}-${it.id}`} onClick={() => setSelected(it)}
                        title={it.title}
                        className={`block w-full text-left truncate px-1.5 py-0.5 rounded text-[11px] leading-tight ${chipClass(it)}`}>
                        {it.title}
                      </button>
                    ))}
                    {dayItems.length > 3 && (
                      <button onClick={() => setSelected(dayItems[3])} className="block w-full text-left text-[11px] text-gray-500 dark:text-gray-400 px-1.5">
                        +{dayItems.length - 3} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-team-blue" /> U11</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-team-red" /> U12</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-500" /> Both / club</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-500 ring-1 ring-gray-400" /> Game</span>
      </div>

      {/* Details modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="fixed inset-0 bg-black/50" />
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selected.title}</h3>
              <button onClick={() => setSelected(null)} aria-label="Close" className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
              <p className="capitalize">
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700">{selected.kind === 'game' ? 'Game' : selected.typeLabel}</span>
                {selected.teamName && <span className="ml-2 inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700">{selected.teamName}</span>}
              </p>
              <p>📅 {fmtDateTime(selected.date)}</p>
              {selected.location && <p>📍 {selected.location}</p>}
              {selected.kind === 'game' && selected.ourScore != null && selected.opponentScore != null && (
                <p className="font-semibold">Final: PCU {selected.ourScore} – {selected.opponentScore} {selected.opponent}</p>
              )}
              {selected.description && <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line pt-1">{selected.description}</p>}
            </div>
            {canEdit && editHref && (
              <div className="mt-5">
                <Link href={editHref(selected)} className="inline-block bg-team-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                  Edit in Team Content →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
