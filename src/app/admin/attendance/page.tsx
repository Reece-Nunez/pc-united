'use client';

import { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/AdminLayout';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import toast from 'react-hot-toast';
import {
  getAllEvents, getRoster, getTeams, getEventAttendance, upsertAttendance,
  Event, Player, Team, Attendance, AttendanceStatus,
} from '@/lib/supabase';
import { createClient } from '@/lib/supabase-browser';

const STATUSES: { key: AttendanceStatus; label: string; on: string }[] = [
  { key: 'present', label: 'Present', on: 'bg-green-600 text-white' },
  { key: 'absent', label: 'Absent', on: 'bg-red-600 text-white' },
  { key: 'late', label: 'Late', on: 'bg-yellow-500 text-white' },
  { key: 'excused', label: 'Excused', on: 'bg-blue-600 text-white' },
];

const rsvpLabel: Record<string, string> = { going: 'Going', maybe: 'Maybe', not_going: 'Not going' };

export default function AttendancePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [roster, setRoster] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [eventId, setEventId] = useState('');
  const [teamFilter, setTeamFilter] = useState('All');
  const [rows, setRows] = useState<Record<number, Attendance>>({}); // player_id -> row
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    (async () => {
      const [evRes, rosterRes, teamsRes] = await Promise.all([getAllEvents(), getRoster(), getTeams()]);
      if (!evRes.error) setEvents((evRes.data as Event[]) || []);
      if (!rosterRes.error && rosterRes.data) setRoster(rosterRes.data);
      if (!teamsRes.error) setTeams(teamsRes.data || []);
      setLoading(false);
    })();
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }: any) => { if (data?.user?.email) setUserEmail(data.user.email); });
  }, []);

  useEffect(() => {
    if (!eventId) { setRows({}); return; }
    getEventAttendance(parseInt(eventId)).then(({ data }) => {
      const map: Record<number, Attendance> = {};
      (data || []).forEach(r => { if (r.player_id) map[r.player_id] = r; });
      setRows(map);
    });
  }, [eventId]);

  const activeRoster = useMemo(() =>
    roster.filter(p => (!p.status || p.status === 'active') && (teamFilter === 'All' || String(p.team_id) === teamFilter)),
    [roster, teamFilter]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { present: 0, absent: 0, late: 0, excused: 0 };
    activeRoster.forEach(p => { const a = rows[p.id]?.attendance; if (a && c[a] !== undefined) c[a]++; });
    return c;
  }, [activeRoster, rows]);

  const mark = async (player: Player, status: AttendanceStatus) => {
    if (!eventId) return;
    const current = rows[player.id]?.attendance;
    const next = current === status ? null : status; // toggle off if same
    // optimistic
    setRows(prev => ({ ...prev, [player.id]: { ...(prev[player.id] || { id: 0, event_id: parseInt(eventId), player_id: player.id }), attendance: next } }));
    const { error } = await upsertAttendance({ event_id: parseInt(eventId), player_id: player.id, attendance: next, marked_by: userEmail });
    if (error) { toast.error(error.message); }
  };

  const selectedEvent = events.find(e => String(e.id) === eventId);

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="mb-4"><Breadcrumbs /></div>
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Attendance</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Take attendance for games and practices</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 md:p-5 mb-6 flex flex-col md:flex-row gap-3 md:items-center">
          <select value={eventId} onChange={e => setEventId(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
            <option value="">Select an event…</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>
                {new Date(ev.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {ev.event_type} · {ev.title}
              </option>
            ))}
          </select>
          <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
            <option value="All">All Teams</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {!eventId ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center text-gray-500 dark:text-gray-400 text-sm">
            Pick an event above to take attendance.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {STATUSES.map(s => (
                <div key={s.key} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3 text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{counts[s.key]}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
                {selectedEvent?.title} · {activeRoster.length} player{activeRoster.length !== 1 ? 's' : ''}
                {teamFilter !== 'All' && ` · ${teams.find(t => String(t.id) === teamFilter)?.name || ''}`}
              </div>
              {loading ? (
                <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
              ) : activeRoster.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No players for this team.</div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {activeRoster.map(player => {
                    const row = rows[player.id];
                    return (
                      <div key={player.id} className="flex items-center justify-between gap-3 p-3 md:px-5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{player.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {player.teams?.name || '—'}
                            {row?.rsvp && <span className="ml-2">· RSVP: {rsvpLabel[row.rsvp] || row.rsvp}</span>}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {STATUSES.map(s => (
                            <button
                              key={s.key}
                              onClick={() => mark(player, s.key)}
                              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                row?.attendance === s.key ? s.on : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
