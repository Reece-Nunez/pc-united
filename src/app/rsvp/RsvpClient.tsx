'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { upsertRsvp, getAttendanceForPlayers, Player, Event, Schedule, Attendance, RsvpStatus } from '@/lib/supabase';
import { isClubTodayOrLater, parseClubDateTime } from '@/lib/time';

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
  // Keys the parent has changed but not yet submitted. Pre-loaded answers are
  // never dirty, so Submit only writes what actually changed this session.
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  // Optional "why absent" reason, one per session (applies to every eligible
  // not-going child). Keyed by session key.
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const selectedPlayers = roster.filter(p => selectedIds.includes(p.id));
  // Only active players are RSVP-able; drop archived/inactive roster entries.
  const available = roster.filter(p => !selectedIds.includes(p.id) && (!p.status || p.status === 'active'));
  const selectedTeamIds = new Set(selectedPlayers.map(p => p.team_id).filter(Boolean));

  // Group the dropdown by whatever teams the roster actually uses — team names
  // are club-defined (e.g. "U11 Competitive"), so never hardcode them. Teamless
  // players fall under "Other". Roster arrives ordered by team then name.
  const teamOrder: string[] = [];
  const byTeam: Record<string, Player[]> = {};
  const noTeam: Player[] = [];
  available.forEach(p => {
    const t = p.teams?.name;
    if (t) {
      if (!byTeam[t]) { byTeam[t] = []; teamOrder.push(t); }
      byTeam[t].push(p);
    } else {
      noTeam.push(p);
    }
  });

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
    const rows = data || [];
    setRsvps(prev => {
      const map = { ...prev };
      rows.forEach((a: Attendance) => {
        if (!a.rsvp) return;
        const sk = a.schedule_id != null ? `g:${a.schedule_id}` : `e:${a.event_id}`;
        map[rk(sk, a.player_id!)] = a.rsvp;
      });
      return map;
    });
    // Surface any saved absence reason so the parent sees/edits it, not a blank.
    setReasons(prev => {
      const map = { ...prev };
      rows.forEach((a: Attendance) => {
        if (a.rsvp !== 'not_going' || !a.rsvp_note) return;
        const sk = a.schedule_id != null ? `g:${a.schedule_id}` : `e:${a.event_id}`;
        if (!map[sk]) map[sk] = a.rsvp_note;
      });
      return map;
    });
  };

  const removeChild = (pid: number) => setSelectedIds(prev => prev.filter(x => x !== pid));

  // Tapping a response only stages it locally now — nothing is written until the
  // parent hits Submit, so they can set every session first and review.
  const stageRsvp = (session: Session, status: RsvpStatus) => {
    const eligible = eligibleFor(session);
    if (!eligible.length) return;
    setRsvps(prev => {
      const map = { ...prev };
      eligible.forEach(p => { map[rk(session.key, p.id)] = status; });
      return map;
    });
    setDirty(prev => {
      const next = new Set(prev);
      eligible.forEach(p => next.add(rk(session.key, p.id)));
      return next;
    });
  };

  const setReason = (session: Session, text: string) => {
    setReasons(prev => ({ ...prev, [session.key]: text }));
    // Editing the reason re-dirties the session's not-going children so Submit
    // picks up the changed note.
    setDirty(prev => {
      const next = new Set(prev);
      eligibleFor(session).forEach(p => {
        if (rsvps[rk(session.key, p.id)] === 'not_going') next.add(rk(session.key, p.id));
      });
      return next;
    });
  };

  // Every changed (session, player) answer waiting to be written.
  const pending = sessions.flatMap(s =>
    eligibleFor(s)
      .filter(p => dirty.has(rk(s.key, p.id)) && rsvps[rk(s.key, p.id)])
      .map(p => ({ s, p, status: rsvps[rk(s.key, p.id)] })),
  );

  const submit = async () => {
    if (!pending.length) return;
    setSaving(true);
    const results = await Promise.all(pending.map(({ s, p, status }) => {
      const keyArg = s.kind === 'game' ? { schedule_id: s.id } : { event_id: s.id };
      // Only a not-going answer carries a reason; clear it otherwise.
      const rsvp_note = status === 'not_going' ? (reasons[s.key]?.trim() || null) : null;
      return upsertRsvp({ ...keyArg, player_id: p.id, rsvp: status, rsvp_by: p.name, rsvp_note });
    }));
    setSaving(false);
    if (results.some(r => r.error)) {
      toast.error('Could not save every RSVP — please retry');
      return;
    }
    setDirty(new Set());
    const players = new Set(pending.map(x => x.p.id)).size;
    toast.success(players > 1 ? `RSVP saved for ${players} players` : 'RSVP saved');
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
          {teamOrder.map(tn => (
            <optgroup key={tn} label={tn}>
              {byTeam[tn].map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </optgroup>
          ))}
          {noTeam.length > 0 && (
            <optgroup label="Other">
              {noTeam.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </optgroup>
          )}
        </select>
        {selectedPlayers.length > 1 && (
          <p className="text-xs text-gray-500 mt-2">Tapping a response sets it for every selected player that session applies to. Tap <span className="font-medium">Submit</span> when you&apos;re done.</p>
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
                        {s.sub} · {parseClubDateTime(s.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {OPTIONS.map(o => {
                        // Highlight only when *all* eligible kids share this answer.
                        const allSame = eligible.length > 0 && eligible.every(p => rsvps[rk(s.key, p.id)] === o.key);
                        return (
                          <button key={o.key} onClick={() => stageRsvp(s, o.key)}
                            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${allSame ? o.on : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Optional reason, shown once any eligible child is marked not going. */}
                  {eligible.some(p => rsvps[rk(s.key, p.id)] === 'not_going') && (
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Reason for absence <span className="font-normal text-gray-400">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={reasons[s.key] ?? ''}
                        onChange={e => setReason(s, e.target.value)}
                        placeholder="e.g. out of town, injured, family conflict"
                        maxLength={200}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-team-blue"
                      />
                    </div>
                  )}

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

            {/* Sticky submit so all staged answers save in one tap. */}
            <div className="sticky bottom-0 -mx-1 px-1 py-3 bg-gradient-to-t from-white via-white to-transparent">
              <button
                onClick={submit}
                disabled={saving || pending.length === 0}
                aria-label="Submit RSVPs"
                className="w-full bg-team-blue text-white font-semibold py-3 rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving…' : pending.length === 0 ? 'All caught up' : `Submit ${pending.length} RSVP${pending.length > 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
