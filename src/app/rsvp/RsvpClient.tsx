'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { upsertRsvp, getAttendanceForPlayers, Player, Event, Attendance, RsvpStatus } from '@/lib/supabase';

const OPTIONS: { key: RsvpStatus; label: string; on: string }[] = [
  { key: 'going', label: 'Going', on: 'bg-green-600 text-white' },
  { key: 'maybe', label: 'Maybe', on: 'bg-yellow-500 text-white' },
  { key: 'not_going', label: 'Not going', on: 'bg-red-600 text-white' },
];

export default function RsvpClient({ roster, events }: { roster: Player[]; events: Event[] }) {
  const [childId, setChildId] = useState('');
  const [rsvps, setRsvps] = useState<Record<number, RsvpStatus>>({}); // event_id -> status

  const child = roster.find(p => String(p.id) === childId);
  // Show events for this child's team, plus club-wide events (no team set).
  const visibleEvents = child ? events.filter(e => !e.team_id || e.team_id === child.team_id) : [];

  const pickChild = async (id: string) => {
    setChildId(id);
    setRsvps({});
    if (!id) return;
    const { data } = await getAttendanceForPlayers([parseInt(id)]);
    const map: Record<number, RsvpStatus> = {};
    (data || []).forEach((a: Attendance) => { if (a.rsvp) map[a.event_id] = a.rsvp; });
    setRsvps(map);
  };

  const setRsvp = async (eventId: number, status: RsvpStatus) => {
    if (!child) return;
    setRsvps(prev => ({ ...prev, [eventId]: status }));
    const { error } = await upsertRsvp({ event_id: eventId, player_id: child.id, rsvp: status, rsvp_by: child.name });
    if (error) toast.error(error.message);
    else toast.success('RSVP saved');
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-team-blue">Game &amp; Practice RSVP</h1>
        <p className="text-gray-600 mt-2">Pick your player, then let the coaches know if they&apos;ll be there.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <label className="block text-sm font-medium text-gray-700 mb-1">Your player *</label>
        <select
          value={childId}
          onChange={(e) => pickChild(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue text-sm"
        >
          <option value="">Select your player…</option>
          {['U11', 'U12'].map(tn => roster.some(p => p.teams?.name === tn) && (
            <optgroup key={tn} label={tn}>
              {roster.filter(p => p.teams?.name === tn).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </optgroup>
          ))}
          {roster.filter(p => !p.teams).length > 0 && (
            <optgroup label="Other">
              {roster.filter(p => !p.teams).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </optgroup>
          )}
        </select>
      </div>

      {child && (
        visibleEvents.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500 text-sm">
            No upcoming games or practices scheduled right now. Check back soon!
          </div>
        ) : (
          <div className="space-y-3">
            {visibleEvents.map(ev => (
              <div key={ev.id} className="bg-white rounded-xl shadow-sm p-4 md:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{ev.title}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {ev.event_type} · {new Date(ev.event_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    {ev.location ? ` · ${ev.location}` : ''}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {OPTIONS.map(o => (
                    <button key={o.key} onClick={() => setRsvp(ev.id, o.key)}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${rsvps[ev.id] === o.key ? o.on : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
