'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import toast from 'react-hot-toast';
import {
  getRoster, getParentChildrenForUser, createParentChildLink, getEvents, getSchedule, getAttendanceForPlayers, upsertRsvp,
  getDuesForPlayers, ParentChild, Player, Event, Schedule, Attendance, RsvpStatus, Dues,
} from '@/lib/supabase';
import { getCurrentSeason } from '@/lib/seasons';
import { createClient } from '@/lib/supabase-browser';
import { isClubTodayOrLater } from '@/lib/time';

const money = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type FamilySession = { key: string; kind: 'game' | 'event'; id: number; label: string; date: string; sub: string; location?: string; team_id: number | null };

export default function MyFamilyPage() {
  const [links, setLinks] = useState<ParentChild[]>([]);
  const [roster, setRoster] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; name: string; email: string; phone: string } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [childPhotoUrl, setChildPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [games, setGames] = useState<Schedule[]>([]);
  const [rsvps, setRsvps] = useState<Record<string, RsvpStatus>>({}); // `${sessionKey}:${playerId}` -> status
  const [dues, setDues] = useState<Record<number, Dues>>({}); // player_id -> current-season dues
  const photoRef = useRef<HTMLInputElement>(null);
  const currentSeason = getCurrentSeason().label;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }: any) => {
      const u = data?.user;
      if (!u) { setLoading(false); return; }
      const info = {
        id: u.id,
        name: u.user_metadata?.full_name || '',
        email: u.email || '',
        phone: u.user_metadata?.phone || '',
      };
      setUser(info);
      const [linksRes, rosterRes, eventsRes, gamesRes] = await Promise.all([getParentChildrenForUser(u.id), getRoster(), getEvents(), getSchedule()]);
      const linkRows = linksRes.error ? [] : (linksRes.data || []);
      setLinks(linkRows);
      if (!rosterRes.error && rosterRes.data) setRoster(rosterRes.data);
      if (!eventsRes.error) setEvents((eventsRes.data as Event[]) || []);
      if (!gamesRes.error) setGames((gamesRes.data as Schedule[]) || []);

      // Pre-load existing RSVPs for this parent's children (keyed by session).
      const playerIds = linkRows.filter(l => l.player_id).map(l => l.player_id as number);
      const attRes = await getAttendanceForPlayers(playerIds);
      const map: Record<string, RsvpStatus> = {};
      (attRes.data || []).forEach((a: Attendance) => {
        if (!a.rsvp) return;
        const sk = a.schedule_id != null ? `g:${a.schedule_id}` : `e:${a.event_id}`;
        map[`${sk}:${a.player_id}`] = a.rsvp;
      });
      setRsvps(map);

      // Current-season dues per child (read-only for parents).
      const duesRes = await getDuesForPlayers(playerIds);
      const dMap: Record<number, Dues> = {};
      (duesRes.data || []).forEach((d: Dues) => { if (d.season === currentSeason && d.player_id) dMap[d.player_id] = d; });
      setDues(dMap);
      setLoading(false);
    });
  }, []);

  const refresh = async () => {
    if (!user) return;
    const { data } = await getParentChildrenForUser(user.id);
    setLinks(data || []);
  };

  const uploadPhoto = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error('Photo must be under 10MB'); return; }
    setUploading(true);
    try {
      const res = await fetch('/api/presigned-upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size, folder: 'player-photos' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      const up = await fetch(data.presignedUrl, { method: 'PUT', headers: { 'Content-Type': file.type, 'Content-Disposition': 'inline', 'Cache-Control': 'max-age=31536000' }, body: file });
      if (!up.ok) throw new Error('Upload failed');
      setChildPhotoUrl(data.publicUrl);
      toast.success('Photo uploaded');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const linkedIds = new Set(links.map(l => l.player_id));
  const available = roster.filter(p => !linkedIds.has(p.id));

  const handleAdd = async () => {
    if (!user) return;
    if (!selectedChildId) { toast.error('Select your child'); return; }
    setSaving(true);
    try {
      const { error } = await createParentChildLink({
        parent_user_id: user.id,
        parent_name: user.name,
        parent_email: user.email,
        parent_phone: user.phone,
        player_id: parseInt(selectedChildId),
        child_photo_url: childPhotoUrl || undefined,
      });
      if (error) throw new Error(error.message);
      toast.success('Child added — pending coach approval');
      setShowAdd(false);
      setSelectedChildId('');
      setChildPhotoUrl('');
      refresh();
    } catch (err: any) {
      toast.error(err.message || 'Could not add child');
    } finally {
      setSaving(false);
    }
  };

  const setRsvp = async (session: FamilySession, playerId: number, status: RsvpStatus) => {
    setRsvps(prev => ({ ...prev, [`${session.key}:${playerId}`]: status }));
    const keyArg = session.kind === 'game' ? { schedule_id: session.id } : { event_id: session.id };
    const { error } = await upsertRsvp({ ...keyArg, player_id: playerId, rsvp: status, rsvp_by: user?.email });
    if (error) toast.error(error.message);
    else toast.success('RSVP saved');
  };

  const approvedChildren = links.filter(l => l.status === 'approved' && l.players);

  // Set one RSVP answer for every linked child at once (parents with siblings).
  const setAllRsvp = async (session: FamilySession, status: RsvpStatus) => {
    if (approvedChildren.length === 0) return;
    setRsvps(prev => {
      const map = { ...prev };
      approvedChildren.forEach(l => { map[`${session.key}:${l.players!.id}`] = status; });
      return map;
    });
    const keyArg = session.kind === 'game' ? { schedule_id: session.id } : { event_id: session.id };
    const results = await Promise.all(
      approvedChildren.map(l => upsertRsvp({ ...keyArg, player_id: l.players!.id, rsvp: status, rsvp_by: user?.email })),
    );
    if (results.some(r => r.error)) toast.error('Could not save every RSVP — please retry');
    else toast.success(`RSVP saved for all ${approvedChildren.length} players`);
  };

  // Upcoming games (from Schedule) + non-game events, newest-soonest first.
  // Games are filtered by club-day (see isClubTodayOrLater) so evening games
  // stay visible all day rather than dropping off once the UTC clock passes.
  const sessions: FamilySession[] = [
    ...games.filter(g => isClubTodayOrLater(g.game_date)).map(g => ({ key: `g:${g.id}`, kind: 'game' as const, id: g.id, label: `${g.home_game ? 'vs' : '@'} ${g.opponent}`, date: g.game_date, sub: 'Game', location: g.location, team_id: g.team_id ?? null })),
    ...events.filter(e => e.event_type !== 'game').map(e => ({ key: `e:${e.id}`, kind: 'event' as const, id: e.id, label: e.title, date: e.event_date, sub: e.event_type, location: e.location, team_id: e.team_id ?? null })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const RSVP_OPTIONS: { key: RsvpStatus; label: string; on: string }[] = [
    { key: 'going', label: 'Going', on: 'bg-green-600 text-white' },
    { key: 'maybe', label: 'Maybe', on: 'bg-yellow-500 text-white' },
    { key: 'not_going', label: 'Not going', on: 'bg-red-600 text-white' },
  ];

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700',
    };
    const label: Record<string, string> = { pending: 'Pending approval', approved: 'Approved', rejected: 'Not approved' };
    return <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${map[status] || ''}`}>{label[status] || status}</span>;
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="mb-4"><Breadcrumbs /></div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">My Family</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Your linked players</p>
          </div>
          <button onClick={() => setShowAdd(!showAdd)} className="bg-team-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            {showAdd ? 'Cancel' : '+ Add a Child'}
          </button>
        </div>

        {showAdd && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 mb-6 max-w-lg">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Link another child</h2>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Child</label>
            <select value={selectedChildId} onChange={e => setSelectedChildId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-team-blue text-sm mb-3">
              <option value="">Select your child…</option>
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Photo (optional)</label>
            {childPhotoUrl ? (
              <div className="flex items-center gap-3 p-2 border border-gray-300 dark:border-gray-600 rounded-md mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={childPhotoUrl} alt="Child" className="w-12 h-12 object-cover rounded" />
                <span className="text-sm text-green-600 flex-1">Photo added</span>
                <button type="button" onClick={() => setChildPhotoUrl('')} className="text-red-500 text-sm">Remove</button>
              </div>
            ) : (
              <button type="button" onClick={() => photoRef.current?.click()} disabled={uploading}
                className="w-full px-3 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-500 hover:border-team-blue hover:text-team-blue mb-3 disabled:opacity-50">
                {uploading ? 'Uploading…' : 'Upload a photo'}
              </button>
            )}
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }} />
            <button onClick={handleAdd} disabled={saving} className="w-full bg-team-blue text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
              {saving ? 'Adding…' : 'Add Child'}
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
        ) : links.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
            You haven&apos;t linked any players yet. Click <strong>+ Add a Child</strong> to get started.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {links.map(link => (
              <div key={link.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={link.child_photo_url || link.players?.photo_url || '/logo.png'} alt={link.players?.name || 'Player'} className="w-14 h-14 rounded-full object-cover bg-gray-100" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{link.players?.name || 'Player'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{link.players?.teams?.name || 'No team'}</p>
                  <div className="mt-1">{statusBadge(link.status)}</div>
                  {link.players?.id && dues[link.players.id] && (() => {
                    const d = dues[link.players!.id];
                    const bal = Number(d.amount_owed) - Number(d.amount_paid);
                    if (Number(d.amount_owed) <= 0) return null;
                    return (
                      <p className={`text-xs mt-1 ${bal > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {currentSeason} dues: {bal > 0 ? `${money(bal)} due` : 'Paid'}
                      </p>
                    );
                  })()}
                  {link.status === 'approved' && link.players?.id && (
                    <Link href={`/players/${link.players.id}`} className="text-team-blue text-sm hover:underline mt-1 inline-block">View profile →</Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upcoming games & practices — RSVP per child */}
        {approvedChildren.length > 0 && sessions.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Upcoming Games &amp; Practices</h2>
            <div className="space-y-3">
              {sessions.map(s => (
                <div key={s.key} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 md:p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{s.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {s.sub} · {new Date(s.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        {s.location ? ` · ${s.location}` : ''}
                      </p>
                    </div>
                  </div>
                  {approvedChildren.length > 1 && (
                    <div className="flex items-center justify-between gap-3 mb-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Everyone</span>
                      <div className="flex gap-1 shrink-0">
                        {RSVP_OPTIONS.map(o => {
                          const allSame = approvedChildren.every(l => rsvps[`${s.key}:${l.players!.id}`] === o.key);
                          return (
                            <button key={o.key} onClick={() => setAllRsvp(s, o.key)}
                              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${allSame ? o.on : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>
                              {o.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    {approvedChildren.map(link => {
                      const pid = link.players!.id;
                      const current = rsvps[`${s.key}:${pid}`];
                      return (
                        <div key={pid} className="flex items-center justify-between gap-3">
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{link.players!.name}</span>
                          <div className="flex gap-1 shrink-0">
                            {RSVP_OPTIONS.map(o => (
                              <button key={o.key} onClick={() => setRsvp(s, pid, o.key)}
                                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${current === o.key ? o.on : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>
                                {o.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
