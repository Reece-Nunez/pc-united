'use client';

import { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/AdminLayout';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import toast from 'react-hot-toast';
import {
  getAllEvents, getSchedule, getRoster, getTeams, getSessionAttendance, upsertAttendance,
  Event, Schedule, Player, Team, Attendance, AttendanceStatus,
} from '@/lib/supabase';
import { createClient } from '@/lib/supabase-browser';

// A session to take attendance for: a game (schedule) or an event/practice (events).
type Session = { key: string; kind: 'game' | 'event'; id: number; label: string; date: string; team_id: number | null };

const STATUSES: { key: AttendanceStatus; label: string; on: string }[] = [
  { key: 'present', label: 'Present', on: 'bg-green-600 text-white' },
  { key: 'absent', label: 'Absent', on: 'bg-red-600 text-white' },
  { key: 'late', label: 'Late', on: 'bg-yellow-500 text-white' },
  { key: 'excused', label: 'Excused', on: 'bg-blue-600 text-white' },
];

const rsvpLabel: Record<string, string> = { going: 'Going', maybe: 'Maybe', not_going: 'Not going' };

// A parent's RSVP seeds attendance: "not going" pre-marks Absent (the coach can
// still override). "going"/"maybe" only show as a badge — showing up is the
// coach's affirmative call.
const RSVP_TO_ATTENDANCE: Partial<Record<string, AttendanceStatus>> = { not_going: 'absent' };
const effectiveStatus = (row?: Attendance): AttendanceStatus | null =>
  row?.attendance ?? (row?.rsvp ? RSVP_TO_ATTENDANCE[row.rsvp] ?? null : null);

export default function AttendancePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [games, setGames] = useState<Schedule[]>([]);
  const [roster, setRoster] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [sessionKey, setSessionKey] = useState('');
  const [teamFilter, setTeamFilter] = useState('All');
  const [rows, setRows] = useState<Record<number, Attendance>>({}); // player_id -> row
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [showClosed, setShowClosed] = useState(false);

  // Start of today: a session stays open all its day and closes once the day passes.
  const startOfToday = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }, []);

  useEffect(() => {
    (async () => {
      const [evRes, gamesRes, rosterRes, teamsRes] = await Promise.all([getAllEvents(), getSchedule(), getRoster(), getTeams()]);
      if (!evRes.error) setEvents((evRes.data as Event[]) || []);
      if (!gamesRes.error) setGames((gamesRes.data as Schedule[]) || []);
      if (!rosterRes.error && rosterRes.data) setRoster(rosterRes.data);
      if (!teamsRes.error) setTeams(teamsRes.data || []);
      setLoading(false);
    })();
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }: any) => { if (data?.user?.email) setUserEmail(data.user.email); });
  }, []);

  // Games (from Schedule) + non-game events (practices/meetings/etc.), newest first.
  const sessions = useMemo<Session[]>(() => {
    const g: Session[] = games.map(x => ({ key: `g:${x.id}`, kind: 'game', id: x.id, label: `${x.home_game ? 'vs' : '@'} ${x.opponent}`, date: x.game_date, team_id: x.team_id ?? null }));
    const e: Session[] = events.filter(x => x.event_type !== 'game').map(x => ({ key: `e:${x.id}`, kind: 'event', id: x.id, label: x.title, date: x.event_date, team_id: x.team_id ?? null }));
    return [...g, ...e].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [games, events]);

  // Open = today or future (attendance can still be taken). Past sessions close
  // and become view-only, preserving the saved present/absent list.
  const openSessions = useMemo(() =>
    sessions.filter(s => new Date(s.date).getTime() >= startOfToday).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [sessions, startOfToday]);
  const pastSessions = useMemo(() =>
    sessions.filter(s => new Date(s.date).getTime() < startOfToday),
    [sessions, startOfToday]);

  const selectedSession = sessions.find(s => s.key === sessionKey) || null;
  const isClosed = selectedSession ? new Date(selectedSession.date).getTime() < startOfToday : false;

  useEffect(() => {
    if (!selectedSession) { setRows({}); return; }
    if (selectedSession.team_id) setTeamFilter(String(selectedSession.team_id));
    const keyArg = selectedSession.kind === 'game' ? { schedule_id: selectedSession.id } : { event_id: selectedSession.id };
    getSessionAttendance(keyArg).then(({ data }) => {
      const map: Record<number, Attendance> = {};
      (data || []).forEach(r => { if (r.player_id) map[r.player_id] = r; });
      setRows(map);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey, sessions]);

  const activeRoster = useMemo(() =>
    roster.filter(p => (!p.status || p.status === 'active') && (teamFilter === 'All' || String(p.team_id) === teamFilter)),
    [roster, teamFilter]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { present: 0, absent: 0, late: 0, excused: 0 };
    activeRoster.forEach(p => { const a = effectiveStatus(rows[p.id]); if (a && c[a] !== undefined) c[a]++; });
    return c;
  }, [activeRoster, rows]);

  const mark = async (player: Player, status: AttendanceStatus) => {
    if (!selectedSession || isClosed) return;
    const explicit = rows[player.id]?.attendance;
    const next = explicit === status ? null : status; // toggle off an explicit mark
    // optimistic
    setRows(prev => ({ ...prev, [player.id]: { ...(prev[player.id] || { id: 0, player_id: player.id }), attendance: next } }));
    const keyArg = selectedSession.kind === 'game' ? { schedule_id: selectedSession.id } : { event_id: selectedSession.id };
    const { error } = await upsertAttendance({ ...keyArg, player_id: player.id, attendance: next, marked_by: userEmail });
    if (error) { toast.error(error.message); }
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="mb-4"><Breadcrumbs /></div>
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Attendance</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Take attendance for games and practices</p>
          </div>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`${window.location.origin}/rsvp`);
                toast.success('RSVP link copied — share it in the group chat');
              } catch {
                toast.error('Could not copy the link');
              }
            }}
            className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 shrink-0"
          >
            Copy RSVP link
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 md:p-5 mb-6 flex flex-col md:flex-row gap-3 md:items-center">
          <select value={sessionKey} onChange={e => setSessionKey(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
            <option value="">Select a game or practice…</option>
            {openSessions.map(s => (
              <option key={s.key} value={s.key}>
                {new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {s.kind === 'game' ? 'Game' : 'Event'} · {s.label}
              </option>
            ))}
            {showClosed && pastSessions.length > 0 && (
              <optgroup label="Closed — view only">
                {pastSessions.map(s => (
                  <option key={s.key} value={s.key}>
                    {new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {s.kind === 'game' ? 'Game' : 'Event'} · {s.label}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
            <option value="All">All Teams</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {pastSessions.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
              <input type="checkbox" checked={showClosed} onChange={e => setShowClosed(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-team-blue focus:ring-team-blue" />
              Show past
            </label>
          )}
        </div>

        {!selectedSession ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center text-gray-500 dark:text-gray-400 text-sm">
            Pick a game or practice above to take attendance.
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

            {isClosed && (
              <div className="mb-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/60 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300">
                This session has closed — showing the saved attendance (view only).
              </div>
            )}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
                {selectedSession?.label} · {activeRoster.length} player{activeRoster.length !== 1 ? 's' : ''}
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
                    const eff = effectiveStatus(row);
                    return (
                      <div key={player.id} className="flex items-center justify-between gap-3 p-3 md:px-5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{player.name}</p>
                            {row?.rsvp && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                row.rsvp === 'going' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : row.rsvp === 'maybe' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                RSVP: {rsvpLabel[row.rsvp] || row.rsvp}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{player.teams?.name || '—'}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {STATUSES.map(s => (
                            <button
                              key={s.key}
                              onClick={() => mark(player, s.key)}
                              disabled={isClosed}
                              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors disabled:cursor-default ${
                                eff === s.key
                                  ? s.on
                                  : `bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 ${isClosed ? 'opacity-50' : 'hover:bg-gray-200'}`
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
