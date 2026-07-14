'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { upsertRsvp, getAttendanceForPlayers, Player, Event, Schedule, Attendance, RsvpStatus } from '@/lib/supabase';
import { isClubTodayOrLater } from '@/lib/time';

const OPTIONS: { key: RsvpStatus; label: string; on: string; text: string }[] = [
  { key: 'going', label: 'Going', on: 'bg-green-600 text-white', text: 'text-green-600' },
  { key: 'maybe', label: 'Maybe', on: 'bg-yellow-500 text-white', text: 'text-yellow-600' },
  { key: 'not_going', label: 'Not going', on: 'bg-red-600 text-white', text: 'text-red-600' },
];

type Session = { key: string; kind: 'game' | 'event'; id: number; label: string; date: string; team_id: number | null; sub: string };

// Key for the per-player RSVP map: one entry per (session, player).
const rk = (sessionKey: string, playerId: number) => `${sessionKey}:${playerId}`;

export default function RsvpClient({ roster, events, games }: { roster: Player[]; events: Event[]; games: Schedule[] }) {
  // Support parents with multiple kids on the team: select several players and
  // RSVP them together. Each session's buttons apply to every selected player
  // eligible for it (team match, or club-wide sessions with no team).
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [rsvps, setRsvps] = useState<Record<string, RsvpStatus>>({});

  const selectedPlayers = roster.filter(p => selectedIds.includes(p.id));
  const available = roster.filter(p => !selectedIds.includes(p.id));
  const selectedTeamIds = new Set(selectedPlayers.map(p => p.team_id).filter(Boolean));

  // Sessions relevant to at least one selected player (their team, or club-wide).
  const sessions: Session[] = selectedPlayers.length ? [
    ...games
      .filter(g => isClubTodayOrLater(g.game_date) && (!g.team_id || selectedTeamIds.has(g.team_id)))
      .map(g => ({ key: `g:${g.id}`, kind: 'game' as const, id: g.id, label: `${g.home_game ? 'vs' : '@'} ${g.opponent}`, date: g.game_date, team_id: g.team_id ?? null, sub: `Game${g.location ? ' · ' + g.location : ''}` })),
    ...events
      .filter(e => e.event_type !== 'game' && (!e.team_id || selectedTeamIds.has(e.team_id)))
      .map(e => ({ key: `e:${e.id}`, kind: 'event' as const, id: e.id, label: e.title, date: e.event_date, team_id: e.team_id ?? null, sub: `${e.event_type}${e.location ? ' · ' + e.location : ''}` })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) : [];

  // Players among the current selection who this session applies to.
  const eligibleFor = (s: Session) => selectedPlayers.filter(p => !s.team_id || p.team_id === s.team_id);

  const addChild = async (id: string) => {
    if (!id) return;
    const pid = parseInt(id);
    if (selectedIds.includes(pid)) return;
    setSelectedIds(prev => [...prev, pid]);
    // Pre-load this player's existing RSVPs so their saved answers show.
    const { data } = await getAttendanceForPlayers([pid]);
    setRsvps(prev => {
      const map = { ...prev };
      (data || []).forEach((a: Attendance) => {
        if (!a.rsvp) return;
        const sk = a.schedule_id != null ? `g:${a.schedule_id}` : `e:${a.event_id}`;
        map[rk(sk, a.player_id!)] = a.rsvp;
      });
      return map;
    });
  };

  const removeChild = (pid: number) => setSelectedIds(prev => prev.filter(x => x !== pid));

  const setRsvp = async (session: Session, status: RsvpStatus) => {
    const eligible = eligibleFor(session);
    if (!eligible.length) return;

    // Optimistic update for every eligible child.
    setRsvps(prev => {
      const map = { ...prev };
      eligible.forEach(p => { map[rk(session.key, p.id)] = status; });
      return map;
    });

    const keyArg = session.kind === 'game' ? { schedule_id: session.id } : { event_id: session.id };
    const results = await Promise.all(
      eligible.map(p => upsertRsvp({ ...keyArg, player_id: p.id, rsvp: status, rsvp_by: p.name })),
    );
    if (results.some(r => r.error)) toast.error('Could not save every RSVP — please retry');
    else toast.success(eligible.length > 1 ? `RSVP saved for ${eligible.length} players` : 'RSVP saved');
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-team-blue">Game &amp; Practice RSVP</h1>
        <p className="text-gray-600 mt-2">Pick your player(s), then let the coaches know if they&apos;ll be there.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <label className="block text-sm font-medium text-gray-700 mb-1">Your player(s) *</label>

        {selectedPlayers.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedPlayers.map(p => (
              <span key={p.id} className="inline-flex items-center gap-1.5 bg-blue-50 text-team-blue text-sm font-medium pl-3 pr-2 py-1 rounded-full">
                {p.name}
                <button
                  type="button"
                  onClick={() => removeChild(p.id)}
                  aria-label={`Remove ${p.name}`}
                  className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-blue-200 text-team-blue"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <select
          value=""
          onChange={(e) => addChild(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue text-sm"
        >
          <option value="">{selectedPlayers.length ? 'Add another player…' : 'Select your player…'}</option>
          {['U11', 'U12'].map(tn => available.some(p => p.teams?.name === tn) && (
            <optgroup key={tn} label={tn}>
              {available.filter(p => p.teams?.name === tn).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </optgroup>
          ))}
          {available.filter(p => !p.teams).length > 0 && (
            <optgroup label="Other">
              {available.filter(p => !p.teams).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </optgroup>
          )}
        </select>
        {selectedPlayers.length > 1 && (
          <p className="text-xs text-gray-500 mt-2">Tapping a response sets it for every selected player that session applies to.</p>
        )}
      </div>

      {selectedPlayers.length > 0 && (
        sessions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500 text-sm">
            No upcoming games or practices scheduled right now. Check back soon!
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => {
              const eligible = eligibleFor(s);
              return (
                <div key={s.key} className="bg-white rounded-xl shadow-sm p-4 md:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{s.label}</p>
                      <p className="text-xs text-gray-500 capitalize">
                        {s.sub} · {new Date(s.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {OPTIONS.map(o => {
                        // Highlight only when *all* eligible kids share this answer.
                        const allSame = eligible.length > 0 && eligible.every(p => rsvps[rk(s.key, p.id)] === o.key);
                        return (
                          <button key={o.key} onClick={() => setRsvp(s, o.key)}
                            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${allSame ? o.on : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Per-child summary so mixed answers are visible at a glance. */}
                  {eligible.length > 1 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-1">
                      {eligible.map(p => {
                        const st = rsvps[rk(s.key, p.id)];
                        const opt = OPTIONS.find(o => o.key === st);
                        return (
                          <span key={p.id} className="text-xs text-gray-500">
                            {p.name}: <span className={`font-medium ${opt ? opt.text : 'text-gray-400'}`}>{opt ? opt.label : 'No answer'}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
