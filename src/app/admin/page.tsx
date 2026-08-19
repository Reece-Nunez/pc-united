'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import { getPlayers, getHighlights, getNews, getSchedule, getNewsletterSubscribers, getSponsorships, getGalleryImages, getExpenses, getIncome, getAllDuesFees, getAllDuesPayments, getAllSettings, getParentPlayers, linkParentToPlayer, unlinkParentFromPlayer, getTeams, type Team } from '@/lib/supabase';
import { getRecentActivity } from '@/lib/audit';
import { getCurrentSeason, getAvailableSeasons, isDateInSeason, type Season } from '@/lib/seasons';
import { computeClubTotals, computeSeasonTotals, expensesByCategory, duesByFeeTitle, duesCollectionRate, formatSignedMoney, parsePassthroughFeeTitles } from '@/lib/finance';
import { formatMoney } from '@/lib/format';
import { createClient } from '@/lib/supabase-browser';
import { SkeletonCard } from '@/components/admin/Skeleton';
import { parseClubDateTime, formatClubTime } from '@/lib/time';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';

interface DashboardStats {
  players: number;
  highlights: number;
  news: number;
  upcomingGames: number;
  subscribers: number;
  sponsorships: number;
  gallery: number;
}

interface RecentItem {
  id: number | string;
  title: string;
  type: string;
  date: string;
  link: string;
}

interface ActivityEntry {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string;
  user_email: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({ players: 0, highlights: 0, news: 0, upcomingGames: 0, subscribers: 0, sponsorships: 0, gallery: 0 });
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityEntry[]>([]);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [allSchedule, setAllSchedule] = useState<any[]>([]);
  const [allNews, setAllNews] = useState<any[]>([]);
  // Raw finance rows; all the arithmetic happens in useMemo via @/lib/finance so
  // this page and the expenses page can never disagree on what "revenue" means.
  const [sponsorshipRows, setSponsorshipRows] = useState<any[]>([]);
  const [expenseRows, setExpenseRows] = useState<any[]>([]);
  const [incomeRows, setIncomeRows] = useState<any[]>([]);
  const [duesFeeRows, setDuesFeeRows] = useState<any[]>([]);
  const [duesPaymentRows, setDuesPaymentRows] = useState<any[]>([]);
  // Fee titles collected for the parent club — excluded from revenue. Editable
  // in admin Settings because coaches name fees freely.
  const [passthroughRaw, setPassthroughRaw] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [linkedPlayerIds, setLinkedPlayerIds] = useState<number[]>([]);
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);
  const [linkingPlayer, setLinkingPlayer] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | 'all'>('all');

  const availableSeasons = useMemo(() => getAvailableSeasons(8), []);
  const [selectedSeason, setSelectedSeason] = useState<Season>(getCurrentSeason());

  // The team switcher filters the whole admin dashboard down to one coached team.
  const teamPlayers = useMemo(
    () => (selectedTeamId === 'all' ? allPlayers : allPlayers.filter((p: any) => p.team_id === selectedTeamId)),
    [allPlayers, selectedTeamId]
  );
  const teamSchedule = useMemo(
    () => (selectedTeamId === 'all' ? allSchedule : allSchedule.filter((g: any) => g.team_id === selectedTeamId)),
    [allSchedule, selectedTeamId]
  );
  const selectedTeam = selectedTeamId === 'all' ? null : teams.find((t) => t.id === selectedTeamId) || null;

  // Streamlined season insights: record, goals, and scorers — scoped to the
  // selected team + season. Replaces the old three-chart recharts block.
  const insights = useMemo(() => {
    const seasonGames = teamSchedule.filter((g: any) => g.game_date && isDateInSeason(g.game_date, selectedSeason));
    const completed = seasonGames.filter((g: any) => g.status === 'completed' && g.our_score != null && g.opponent_score != null);

    let wins = 0, losses = 0, draws = 0, goalsFor = 0, goalsAgainst = 0;
    completed.forEach((g: any) => {
      goalsFor += g.our_score;
      goalsAgainst += g.opponent_score;
      if (g.our_score > g.opponent_score) wins++;
      else if (g.our_score < g.opponent_score) losses++;
      else draws++;
    });
    const total = completed.length;
    const winPct = total ? Math.round((wins / total) * 100) : 0;

    const topScorers = teamPlayers
      .filter((p: any) => (p.player_stats?.[0]?.goals || 0) > 0)
      .sort((a: any, b: any) => (b.player_stats?.[0]?.goals || 0) - (a.player_stats?.[0]?.goals || 0))
      .slice(0, 5)
      .map((p: any) => ({ name: p.name, goals: p.player_stats?.[0]?.goals || 0, assists: p.player_stats?.[0]?.assists || 0 }));

    return { wins, losses, draws, total, goalsFor, goalsAgainst, winPct, topScorers };
  }, [teamSchedule, teamPlayers, selectedSeason]);

  const teamUpcomingCount = useMemo(
    () => teamSchedule.filter((g: any) => g.status === 'upcoming' || g.status === 'scheduled').length,
    [teamSchedule]
  );

  useEffect(() => {
    async function fetchUserRole() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setUserRole(user?.user_metadata?.role || null);
        if (user?.id) setUserId(user.id);
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    }
    fetchUserRole();
  }, []);

  useEffect(() => {
    if (!userId || userRole !== 'parent') return;
    getParentPlayers(userId).then(({ data }) => {
      if (data) {
        setLinkedPlayerIds(data.map((d: any) => d.player_id));
      }
    });
  }, [userId, userRole]);

  const fetchDashboardData = useCallback(async () => {
    try {
        const [playersRes, highlightsRes, newsRes, scheduleRes, subscribersRes, sponsorshipsRes, galleryRes, activityRes, expensesRes, teamsRes, incomeRes, duesFeesRes, duesPaymentsRes, settingsRes] = await Promise.all([
          getPlayers(),
          getHighlights(),
          getNews(),
          getSchedule(),
          getNewsletterSubscribers(),
          getSponsorships(),
          getGalleryImages(),
          getRecentActivity(5),
          getExpenses(),
          getTeams(),
          getIncome(),
          getAllDuesFees(),
          getAllDuesPayments(),
          getAllSettings(),
        ]);

        const players = playersRes.data || [];
        const schedule = scheduleRes.data || [];
        const upcomingGames = schedule.filter((g: any) => g.status === 'upcoming' || g.status === 'scheduled').length;

        setAllPlayers(players);
        setAllSchedule(schedule);
        setAllNews(newsRes.data || []);
        setTeams((teamsRes.data || []).filter((t: Team) => t.active !== false));

        setStats({
          players: players.length,
          highlights: highlightsRes.data?.length || 0,
          news: newsRes.data?.length || 0,
          upcomingGames,
          subscribers: subscribersRes.data?.length || 0,
          sponsorships: sponsorshipsRes.data?.length || 0,
          gallery: galleryRes.data?.length || 0,
        });

        // Revenue previously counted sponsorships only, so the entire income
        // table and every dues payment were missing from this page's balance.
        setSponsorshipRows(sponsorshipsRes.data || []);
        setExpenseRows(expensesRes.data || []);
        setIncomeRows(incomeRes.data || []);
        setDuesFeeRows(duesFeesRes.data || []);
        setDuesPaymentRows(duesPaymentsRes.data || []);
        setPassthroughRaw(settingsRes.settings?.passthrough_fee_titles ?? null);

        setRecentActivity((activityRes.data || []) as ActivityEntry[]);

        // Recent items
        const recent: RecentItem[] = [];
        playersRes.data?.slice(0, 2).forEach((p: any) => recent.push({ id: p.id, title: p.name, type: 'player', date: p.created_at || new Date().toISOString(), link: `/admin/players?edit=${p.id}` }));
        highlightsRes.data?.slice(0, 2).forEach((h: any) => recent.push({ id: h.id, title: h.title, type: 'highlight', date: h.created_at || new Date().toISOString(), link: '/admin/highlights' }));
        newsRes.data?.slice(0, 2).forEach((a: any) => recent.push({ id: a.id, title: a.title, type: 'news', date: a.created_at || new Date().toISOString(), link: '/admin/team?tab=news' }));
        recent.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecentItems(recent.slice(0, 6));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useRealtimeTable(['players','schedule','news','highlights','newsletter_subscribers','sponsorships','gallery_images','expenses','teams','income','dues_fees','dues_payments'], fetchDashboardData);

  // ------------------------------------------------------------- financials
  // Every figure below routes through @/lib/finance. Balance is all-time (funds
  // roll over between seasons); revenue and expenses follow the season picker.
  const passthroughFeeTitles = useMemo(() => parsePassthroughFeeTitles(passthroughRaw), [passthroughRaw]);

  const financeInput = useMemo(() => ({
    sponsorships: sponsorshipRows,
    income: incomeRows,
    duesPayments: duesPaymentRows,
    duesFees: duesFeeRows,
    passthroughFeeTitles,
    expenses: expenseRows,
  }), [sponsorshipRows, incomeRows, duesPaymentRows, duesFeeRows, passthroughFeeTitles, expenseRows]);

  const clubTotals = useMemo(() => computeClubTotals(financeInput), [financeInput]);
  const seasonTotals = useMemo(() => computeSeasonTotals(financeInput, selectedSeason), [financeInput, selectedSeason]);

  /** Prior season's net, so the current season can be shown as up or down on it. */
  const previousSeasonNet = useMemo(() => {
    const idx = availableSeasons.findIndex(s => s.key === selectedSeason.key);
    const prev = idx >= 0 ? availableSeasons[idx + 1] : undefined;
    return prev ? computeSeasonTotals(financeInput, prev).net : null;
  }, [financeInput, availableSeasons, selectedSeason]);

  /** Last six seasons oldest-first, for the revenue-vs-expenses trend bars. */
  const seasonTrend = useMemo(() =>
    availableSeasons
      .slice(0, 6)
      .map(season => ({ season, ...computeSeasonTotals(financeInput, season) }))
      .reverse(),
    [financeInput, availableSeasons]
  );

  /** Shared bar scale so trend rows are comparable to each other. */
  const trendPeak = useMemo(
    () => Math.max(...seasonTrend.map(s => Math.max(s.revenue, s.expenses)), 1),
    [seasonTrend]
  );

  const topCategories = useMemo(() =>
    expensesByCategory(expenseRows.filter(e => e.expense_date && isDateInSeason(e.expense_date, selectedSeason))).slice(0, 5),
    [expenseRows, selectedSeason]
  );

  /** Fees billed for the selected season, by their season label. */
  const seasonFees = useMemo(
    () => duesFeeRows.filter(f => f.season === selectedSeason.label),
    [duesFeeRows, selectedSeason]
  );

  const feeTitleTotals = useMemo(
    () => duesByFeeTitle(seasonFees, duesPaymentRows, passthroughFeeTitles),
    [seasonFees, duesPaymentRows, passthroughFeeTitles]
  );

  /**
   * Players with a balance left this season, biggest debt first.
   *
   * Deliberately includes pass-through fee titles: a parent still owes their
   * season dues even though that money is handed to the parent club, and this
   * list is about chasing collection, not about team revenue.
   */
  const playersWhoOwe = useMemo(() => {
    const rosterIds = new Set(teamPlayers.map((p: any) => p.id));
    const nameById = new Map(teamPlayers.map((p: any) => [p.id, p.name]));
    const byPlayer = new Map<number, { owed: number; paid: number }>();

    for (const fee of seasonFees) {
      if (!rosterIds.has(fee.player_id)) continue;
      const entry = byPlayer.get(fee.player_id) || { owed: 0, paid: 0 };
      entry.owed += Number(fee.amount) || 0;
      byPlayer.set(fee.player_id, entry);
    }
    const feeOwner = new Map(seasonFees.map((f: any) => [f.id, f.player_id]));
    for (const p of duesPaymentRows) {
      const owner = feeOwner.get(p.fee_id);
      if (owner === undefined || !byPlayer.has(owner)) continue;
      byPlayer.get(owner)!.paid += Number(p.amount) || 0;
    }

    return [...byPlayer.entries()]
      .map(([id, t]) => ({ id, name: nameById.get(id) ?? `Player ${id}`, balance: t.owed - t.paid, paid: t.paid }))
      .filter(p => p.balance > 0)
      .sort((a, b) => b.balance - a.balance);
  }, [seasonFees, duesPaymentRows, teamPlayers]);

  const totalOutstanding = useMemo(
    () => playersWhoOwe.reduce((sum, p) => sum + p.balance, 0),
    [playersWhoOwe]
  );

  const collectionRate = useMemo(
    () => duesCollectionRate(seasonFees, duesPaymentRows.filter(p => seasonFees.some(f => f.id === p.fee_id))),
    [seasonFees, duesPaymentRows]
  );

  // KPI row. `scoped` cards react to the team switcher; the rest are club-wide
  // (highlights, news, subscribers, etc. aren't tied to a team_id).
  const adminStatCards = [
    { label: 'Players', value: teamPlayers.length, link: '/admin/players', scoped: true },
    { label: 'Upcoming', value: teamUpcomingCount, link: '/admin/team?tab=schedule', scoped: true },
    { label: 'Highlights', value: stats.highlights, link: '/admin/highlights', scoped: false },
    { label: 'News', value: stats.news, link: '/admin/team?tab=news', scoped: false },
    { label: 'Subscribers', value: stats.subscribers, link: '/admin/newsletter', scoped: false },
    { label: 'Sponsors', value: stats.sponsorships, link: '/admin/sponsorships', scoped: false },
    { label: 'Gallery', value: stats.gallery, link: '/admin/gallery', scoped: false },
  ];

  // Quick-create shortcuts surfaced as a compact strip under the header.
  const quickActions = [
    { label: 'Add Player', href: '/admin/players?action=add' },
    { label: 'Add Highlight', href: '/admin/highlights?action=add' },
    { label: 'Write News', href: '/admin/team?tab=news&action=add' },
    { label: 'Add Game', href: '/admin/team?tab=schedule&action=add' },
    { label: 'Upload Photos', href: '/admin/gallery' },
  ];

  // Every admin area, grouped exactly like the sidebar — the "overview of
  // everything in the admin system" the dashboard is meant to be.
  const adminSections: { group: string; items: { name: string; href: string }[] }[] = [
    { group: 'Overview', items: [
      { name: 'Notifications', href: '/admin/notifications' },
      { name: 'Calendar', href: '/admin/calendar' },
    ] },
    { group: 'Team', items: [
      { name: 'Players', href: '/admin/players' },
      { name: 'Teams', href: '/admin/teams' },
      { name: 'Coaches', href: '/admin/coaches' },
      { name: 'Attendance', href: '/admin/attendance' },
      { name: 'Game Stats', href: '/admin/game-stats' },
    ] },
    { group: 'Content', items: [
      { name: 'Team Content', href: '/admin/team' },
      { name: 'Highlights', href: '/admin/highlights' },
      { name: 'Gallery', href: '/admin/gallery' },
      { name: 'Newsletter', href: '/admin/newsletter' },
    ] },
    { group: 'Families', items: [
      { name: 'My Family', href: '/admin/my-family' },
      { name: 'Parents', href: '/admin/parents' },
      { name: 'Medical Forms', href: '/admin/medical-forms' },
    ] },
    { group: 'Finances', items: [
      { name: 'Sponsorships', href: '/admin/sponsorships' },
      { name: 'Expenses', href: '/admin/expenses' },
      { name: 'Dues', href: '/admin/dues' },
    ] },
    { group: 'Admin', items: [
      { name: 'Users', href: '/admin/users' },
      { name: 'Activity Log', href: '/admin/activity' },
      { name: 'Settings', href: '/admin/settings' },
    ] },
  ];

  const actionColors: Record<string, string> = {
    create: 'text-green-600',
    update: 'text-blue-600',
    delete: 'text-red-600',
  };

  const relativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const isParent = userRole === 'parent';

  // Parent-specific computed data
  const parentStatCards = [
    { label: 'Players', value: stats.players, link: '/admin/players' },
    { label: 'Upcoming Games', value: stats.upcomingGames, link: '/admin/team?tab=schedule' },
    { label: 'Gallery', value: stats.gallery, link: '/admin/gallery' },
  ];

  const seasonRecord = useMemo(() => {
    const seasonSchedule = allSchedule.filter((g: any) => g.game_date && isDateInSeason(g.game_date, selectedSeason));
    const completed = seasonSchedule.filter((g: any) => g.status === 'completed' && g.our_score != null && g.opponent_score != null);
    let wins = 0, losses = 0, draws = 0;
    completed.forEach((g: any) => {
      if (g.our_score > g.opponent_score) wins++;
      else if (g.our_score < g.opponent_score) losses++;
      else draws++;
    });
    return { wins, losses, draws, total: completed.length };
  }, [allSchedule, selectedSeason]);

  const upcomingGamesList = useMemo(() => {
    const now = new Date();
    return allSchedule
      .filter((g: any) => (g.status === 'scheduled' || g.status === 'upcoming') && new Date(g.game_date) >= now)
      .sort((a: any, b: any) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime())
      .slice(0, 5);
  }, [allSchedule]);

  const recentNewsArticles = useMemo(() => {
    return allNews
      .filter((n: any) => n.published)
      .sort((a: any, b: any) => new Date(b.publish_date || b.created_at).getTime() - new Date(a.publish_date || a.created_at).getTime())
      .slice(0, 3);
  }, [allNews]);

  const activeRosterPlayers = useMemo(() => {
    return allPlayers.filter((p: any) => p.status === 'active');
  }, [allPlayers]);

  const handleLinkPlayer = async (playerId: number) => {
    if (!userId) return;
    setLinkingPlayer(true);
    await linkParentToPlayer(userId, playerId);
    setLinkedPlayerIds((prev) => [...prev, playerId]);
    setLinkingPlayer(false);
  };

  const handleUnlinkPlayer = async (playerId: number) => {
    if (!userId) return;
    await unlinkParentFromPlayer(userId, playerId);
    setLinkedPlayerIds((prev) => prev.filter((id) => id !== playerId));
  };

  return (
    <AdminLayout>
      {isParent ? (
        /* ===== PARENT DASHBOARD ===== */
        <div className="p-4 md:p-8">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Welcome, Parent!</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Here&apos;s what&apos;s happening with the team.</p>
          </div>

          {/* Player Selector Banner - show when no players linked */}
          {!loading && linkedPlayerIds.length === 0 && !showPlayerSelector && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Select Your Player(s)</h2>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">Link your child to your account to see their stats and highlights on your dashboard.</p>
                </div>
                <button
                  onClick={() => setShowPlayerSelector(true)}
                  className="px-4 py-2 bg-team-blue hover:bg-blue-800 text-white font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  Select Players
                </button>
              </div>
            </div>
          )}

          {/* Player Selector Modal/Panel */}
          {showPlayerSelector && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8 border-2 border-team-blue">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Select Your Player(s)</h2>
                <button
                  onClick={() => setShowPlayerSelector(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {linkedPlayerIds.length > 0 ? 'Done' : 'Skip for now'}
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Tap to select your child(ren). You can change this anytime.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allPlayers
                  .filter((p: any) => p.status === 'active')
                  .sort((a: any, b: any) => a.name.localeCompare(b.name))
                  .map((player: any) => {
                    const isLinked = linkedPlayerIds.includes(player.id);
                    return (
                      <button
                        key={player.id}
                        onClick={() => isLinked ? handleUnlinkPlayer(player.id) : handleLinkPlayer(player.id)}
                        disabled={linkingPlayer}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors text-left ${
                          isLinked
                            ? 'border-team-blue bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        {player.photo_url ? (
                          <img src={player.photo_url} alt={player.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-sm">
                            {player.jersey_number || '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{player.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">#{player.jersey_number} &bull; {player.position || 'TBD'}</p>
                        </div>
                        {isLinked && (
                          <svg className="w-5 h-5 text-team-blue shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Linked Players Card - show when players are linked */}
          {!loading && linkedPlayerIds.length > 0 && !showPlayerSelector && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Player{linkedPlayerIds.length > 1 ? 's' : ''}</h2>
                <button
                  onClick={() => setShowPlayerSelector(true)}
                  className="text-sm text-team-blue hover:underline"
                >
                  Edit
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allPlayers
                  .filter((p: any) => linkedPlayerIds.includes(p.id))
                  .map((player: any) => (
                    <div key={player.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                      {player.photo_url ? (
                        <img src={player.photo_url} alt={player.name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-team-blue/10 dark:bg-blue-900/30 flex items-center justify-center text-team-blue dark:text-blue-400 font-bold">
                          {player.jersey_number || '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white">{player.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">#{player.jersey_number} &bull; {player.position || 'TBD'}</p>
                        {player.player_stats?.[0] && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {player.player_stats[0].goals || 0}G &bull; {player.player_stats[0].assists || 0}A &bull; {player.player_stats[0].games_played || 0} games
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Parent Stat Cards */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              {parentStatCards.map((stat) => (
                <Link
                  key={stat.label}
                  href={stat.link}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow p-4"
                >
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{stat.value}</p>
                  <div className="h-1 w-8 bg-gray-200 dark:bg-gray-700 rounded-full mt-2" />
                </Link>
              ))}
            </div>
          )}

          {/* Next Game Card (same as admin) */}
          {!loading && (() => {
            const now = new Date();
            const upcoming = allSchedule
              .filter((g: any) => (g.status === 'scheduled' || g.status === 'upcoming') && new Date(g.game_date) >= now)
              .sort((a: any, b: any) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime());
            const next = upcoming[0];
            if (!next) return null;
            const gameDate = parseClubDateTime(next.game_date);
            const daysUntil = Math.ceil((gameDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Next Game</p>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      vs {next.opponent}
                    </h2>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600 dark:text-gray-400">
                      <span>{gameDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                      <span>{formatClubTime(next.game_date, next.time_tbd, { hour: 'numeric', minute: '2-digit' })}</span>
                      <span>{next.home_game ? 'Home' : 'Away'}</span>
                    </div>
                    {next.location && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{next.location}</p>
                    )}
                  </div>
                  <div className="text-center sm:text-right">
                    <p className="text-3xl font-bold text-team-blue dark:text-blue-400">{daysUntil}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{daysUntil === 1 ? 'day away' : 'days away'}</p>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Season Record */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Season Record</h2>
                <select
                  value={selectedSeason.key}
                  onChange={(e) => {
                    const season = availableSeasons.find(s => s.key === e.target.value);
                    if (season) setSelectedSeason(season);
                  }}
                  className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-medium"
                >
                  {availableSeasons.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-team-blue" />
                </div>
              ) : seasonRecord.total === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">No completed games this season yet.</p>
              ) : (
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400 tabular-nums">{seasonRecord.wins}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">Wins</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400 tabular-nums">{seasonRecord.losses}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">Losses</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-500 dark:text-gray-400 tabular-nums">{seasonRecord.draws}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">Draws</p>
                  </div>
                </div>
              )}
            </div>

            {/* Recent News */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent News</h2>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-team-blue" />
                </div>
              ) : recentNewsArticles.length > 0 ? (
                <div className="space-y-3">
                  {recentNewsArticles.map((article: any) => (
                    <Link
                      key={article.id}
                      href={article.slug ? `/news/${article.slug}` : '/admin/team?tab=news'}
                      className="block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">{article.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(article.publish_date || article.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8 text-sm">No news articles yet.</p>
              )}
            </div>
          </div>

          {/* Upcoming Games List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Upcoming Games</h2>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-team-blue" />
              </div>
            ) : upcomingGamesList.length > 0 ? (
              <div className="space-y-3">
                {upcomingGamesList.map((game: any) => {
                  const gameDate = parseClubDateTime(game.game_date);
                  return (
                    <div key={game.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">vs {game.opponent}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {gameDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatClubTime(game.game_date, game.time_tbd, { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${game.home_game ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                          {game.home_game ? 'Home' : 'Away'}
                        </span>
                        {game.location && (
                          <p className="text-xs text-gray-400 mt-1 max-w-[150px] truncate">{game.location}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8 text-sm">No upcoming games scheduled.</p>
            )}
          </div>

          {/* Team Roster */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Team Roster</h2>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-team-blue" />
              </div>
            ) : activeRosterPlayers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">#</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Name</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Position</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {activeRosterPlayers
                      .sort((a: any, b: any) => (a.jersey_number || 99) - (b.jersey_number || 99))
                      .map((player: any) => (
                        <tr key={player.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">{player.jersey_number || '—'}</td>
                          <td className="py-2 px-3 text-gray-900 dark:text-white font-medium">{player.name}</td>
                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{player.position || '—'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8 text-sm">No active players found.</p>
            )}
          </div>

          {/* Help Section */}
          <div className="bg-team-blue rounded-xl p-6 text-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-2">Need Help?</h2>
                <p className="text-blue-100">
                  Email Reece Nunez at{' '}
                  <a href="mailto:rnunez@poncacityunited.com" className="text-white underline hover:no-underline font-medium">
                    rnunez@poncacityunited.com
                  </a>
                  {' '}for any questions.
                </p>
              </div>
              <Link
                href="/"
                className="mt-4 md:mt-0 inline-flex items-center space-x-2 bg-white text-team-blue px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                <span>View Live Site</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      ) : (
      /* ===== ADMIN DASHBOARD ===== */
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-display text-xs uppercase tracking-[0.2em] text-team-blue/60 dark:text-blue-300/70">Ponca City United</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mt-1">Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {selectedTeam ? (
                <>Viewing <span className="font-medium text-gray-700 dark:text-gray-200">{selectedTeam.name}</span>{selectedTeam.season ? ` · ${selectedTeam.season}` : ''}</>
              ) : (
                'Every team, every section — your whole club at a glance.'
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {teams.length > 0 && (
              <select
                value={String(selectedTeamId)}
                onChange={(e) => setSelectedTeamId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                aria-label="Filter dashboard by team"
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-medium shadow-sm focus:ring-2 focus:ring-team-blue focus:border-team-blue focus:outline-none"
              >
                <option value="all">All Teams</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
            <select
              value={selectedSeason.key}
              onChange={(e) => {
                const season = availableSeasons.find(s => s.key === e.target.value);
                if (season) setSelectedSeason(season);
              }}
              aria-label="Select season"
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-medium shadow-sm focus:ring-2 focus:ring-team-blue focus:border-team-blue focus:outline-none"
            >
              {availableSeasons.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2 mb-8">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:border-team-blue/50 hover:text-team-blue dark:hover:text-blue-300 transition-colors focus:ring-2 focus:ring-team-blue focus:outline-none"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {action.label}
            </Link>
          ))}
        </div>

        {/* KPIs */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
            {Array.from({ length: 7 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
            {adminStatCards.map((stat) => (
              <Link
                key={stat.label}
                href={stat.link}
                className="group rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-4 hover:border-team-blue/40 hover:shadow-sm transition-colors focus:ring-2 focus:ring-team-blue focus:outline-none"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">{stat.label}</p>
                  {stat.scoped && selectedTeam && (
                    <span className="w-1.5 h-1.5 rounded-full bg-team-red" title={`Filtered to ${selectedTeam.name}`} />
                  )}
                </div>
                <p className="font-display text-3xl font-bold text-gray-900 dark:text-white tabular-nums leading-none">{stat.value}</p>
              </Link>
            ))}
          </div>
        )}

        {/* Financials. Balance is all-time and leads; revenue/expenses follow the
            season picker. Each card carries its own scope chip so the row is never
            misread as Revenue − Expenses = Balance. */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <Link href="/admin/expenses" className="rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 hover:border-team-blue/40 transition-colors">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Balance</p>
                <span className="text-[9px] font-medium uppercase tracking-wide text-gray-400 border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5">All time</span>
              </div>
              <p className={`font-display text-2xl font-bold tabular-nums ${clubTotals.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatSignedMoney(clubTotals.balance)}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">{formatMoney(clubTotals.revenue)} in · {formatMoney(clubTotals.expenses)} out</p>
            </Link>

            <Link href={`/admin/expenses?season=${encodeURIComponent(selectedSeason.label)}`} className="rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 hover:border-team-blue/40 transition-colors">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Revenue</p>
                <span className="text-[9px] font-medium uppercase tracking-wide text-gray-400 border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5">{selectedSeason.label}</span>
              </div>
              <p className="font-display text-2xl font-bold text-green-600 dark:text-green-400 tabular-nums">
                {formatMoney(seasonTotals.revenue)}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Sponsors {formatMoney(seasonTotals.sponsors)} · Dues {formatMoney(seasonTotals.dues)}
                {seasonTotals.passthroughDues > 0 && (
                  <> · <span title="Collected for the parent club, not team revenue">{formatMoney(seasonTotals.passthroughDues)} to club</span></>
                )}
              </p>
            </Link>

            <Link href={`/admin/expenses?season=${encodeURIComponent(selectedSeason.label)}`} className="rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 hover:border-team-blue/40 transition-colors">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Expenses</p>
                <span className="text-[9px] font-medium uppercase tracking-wide text-gray-400 border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5">{selectedSeason.label}</span>
              </div>
              <p className="font-display text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums">
                {formatMoney(seasonTotals.expenses)}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                {topCategories.length > 0 ? `Top: ${topCategories[0].name}` : 'No spend logged'}
              </p>
            </Link>

            <Link href={`/admin/expenses?season=${encodeURIComponent(selectedSeason.label)}`} className="rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 hover:border-team-blue/40 transition-colors">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Season net</p>
                <span className="text-[9px] font-medium uppercase tracking-wide text-gray-400 border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5">{selectedSeason.label}</span>
              </div>
              <p className={`font-display text-2xl font-bold tabular-nums ${seasonTotals.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatSignedMoney(seasonTotals.net)}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                {previousSeasonNet === null
                  ? 'No prior season to compare'
                  : `${formatSignedMoney(seasonTotals.net - previousSeasonNet)} vs last season`}
              </p>
            </Link>
          </div>
        )}

        {/* Finance analytics: where the money comes from, where it goes, and how
            the season compares with the ones before it. */}
        {!loading && (
          <div className="grid gap-4 lg:grid-cols-3 mb-8">
            {/* Revenue streams */}
            <div className="rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5">
              <h2 className="font-display text-sm font-semibold text-gray-900 dark:text-white mb-4">Revenue streams</h2>
              {seasonTotals.revenue === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">No revenue logged for {selectedSeason.label}.</p>
              ) : (
                <div className="space-y-3">
                  {[
                    { label: 'Sponsorships', value: seasonTotals.sponsors, color: 'bg-blue-500', href: '/admin/sponsorships' },
                    { label: 'Fundraising', value: seasonTotals.fundraising, color: 'bg-emerald-500', href: `/admin/expenses?season=${encodeURIComponent(selectedSeason.label)}` },
                    { label: 'Dues', value: seasonTotals.dues, color: 'bg-amber-500', href: `/admin/dues?season=${encodeURIComponent(selectedSeason.label)}` },
                  ].map(stream => {
                    const pct = (stream.value / seasonTotals.revenue) * 100;
                    return (
                      <Link key={stream.label} href={stream.href} className="block group" title={`Open ${stream.label}`}>
                        <div className="flex items-baseline justify-between text-xs mb-1">
                          <span className="text-gray-600 dark:text-gray-300 group-hover:text-team-blue">{stream.label}</span>
                          <span className="text-gray-900 dark:text-white font-medium tabular-nums">
                            {formatMoney(stream.value)} <span className="text-gray-400">{pct.toFixed(0)}%</span>
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                          <div className={`h-full ${stream.color} rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top expense categories */}
            <div className="rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="font-display text-sm font-semibold text-gray-900 dark:text-white">Top spending</h2>
                <Link href={`/admin/expenses?season=${encodeURIComponent(selectedSeason.label)}`} className="text-xs text-team-blue hover:underline">All</Link>
              </div>
              {topCategories.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">No expenses logged for {selectedSeason.label}.</p>
              ) : (
                <div className="space-y-3">
                  {topCategories.map(cat => {
                    const pct = (cat.value / seasonTotals.expenses) * 100;
                    return (
                      <Link
                        key={cat.name}
                        href={`/admin/expenses?season=${encodeURIComponent(selectedSeason.label)}&category=${encodeURIComponent(cat.name)}`}
                        className="block group"
                        title={`Show ${selectedSeason.label} ${cat.name} expenses`}
                      >
                        <div className="flex items-baseline justify-between text-xs mb-1">
                          <span className="text-gray-600 dark:text-gray-300 truncate pr-2 group-hover:text-team-blue">{cat.name}</span>
                          <span className="text-gray-900 dark:text-white font-medium tabular-nums whitespace-nowrap">
                            {formatMoney(cat.value)} <span className="text-gray-400">{pct.toFixed(0)}%</span>
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Season-over-season trend */}
            <div className="rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5">
              <h2 className="font-display text-sm font-semibold text-gray-900 dark:text-white mb-4">Revenue vs expenses</h2>
              {seasonTrend.every(s => s.revenue === 0 && s.expenses === 0) ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">Not enough history yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {seasonTrend.map(row => (
                      <div key={row.season.key} className="flex items-center gap-2">
                        <span className={`text-[10px] w-20 shrink-0 truncate ${row.season.key === selectedSeason.key ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-400'}`}>
                          {row.season.label}
                        </span>
                        <div className="flex-1 space-y-1">
                          <div className="h-2 rounded-sm bg-gray-100 dark:bg-gray-700 overflow-hidden">
                            <div className="h-full bg-green-500 rounded-sm" style={{ width: `${(row.revenue / trendPeak) * 100}%` }} title={`Revenue ${formatMoney(row.revenue)}`} />
                          </div>
                          <div className="h-2 rounded-sm bg-gray-100 dark:bg-gray-700 overflow-hidden">
                            <div className="h-full bg-red-500 rounded-sm" style={{ width: `${(row.expenses / trendPeak) * 100}%` }} title={`Expenses ${formatMoney(row.expenses)}`} />
                          </div>
                        </div>
                        <span className={`text-[10px] w-16 text-right tabular-nums shrink-0 ${row.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatSignedMoney(row.net)}
                        </span>
                      </div>
                  ))}
                  <p className="text-[10px] text-gray-400 pt-1">
                    <span className="inline-block w-2 h-2 rounded-sm bg-green-500 align-middle mr-1" />revenue
                    <span className="inline-block w-2 h-2 rounded-sm bg-red-500 align-middle mr-1 ml-3" />expenses
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Who still owes. Amber rather than red: an outstanding balance mid-season
            is normal, so this is a to-do list, not an error state. */}
        {!loading && playersWhoOwe.length > 0 && (
          <div className="rounded-xl border border-amber-300/70 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-900/10 p-5 mb-4">
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <h2 className="font-display text-sm font-semibold text-amber-900 dark:text-amber-200">
                {playersWhoOwe.length} {playersWhoOwe.length === 1 ? 'player' : 'players'} still owe{playersWhoOwe.length === 1 ? 's' : ''}
                <span className="font-normal text-amber-700/70 dark:text-amber-300/60"> · {selectedSeason.label}</span>
              </h2>
              <span className="text-sm font-bold text-amber-900 dark:text-amber-200 tabular-nums shrink-0">
                {formatMoney(totalOutstanding)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {playersWhoOwe.slice(0, 12).map(p => (
                <Link
                  key={p.id}
                  href={`/admin/dues?season=${encodeURIComponent(selectedSeason.label)}&status=owes`}
                  title={`${p.name} — ${formatMoney(p.balance)} outstanding${p.paid > 0 ? ` (${formatMoney(p.paid)} paid so far)` : ''}`}
                  className="inline-flex items-baseline gap-1.5 rounded-lg border border-amber-300/70 dark:border-amber-500/30 bg-white dark:bg-gray-800 px-2.5 py-1.5 hover:border-amber-500 transition-colors"
                >
                  <span className="text-xs text-gray-900 dark:text-white">{p.name}</span>
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 tabular-nums">{formatMoney(p.balance)}</span>
                  {p.paid > 0 && <span className="text-[9px] uppercase tracking-wide text-gray-400">part</span>}
                </Link>
              ))}
              {playersWhoOwe.length > 12 && (
                <Link href={`/admin/dues?season=${encodeURIComponent(selectedSeason.label)}&status=owes`} className="inline-flex items-center text-xs text-amber-800 dark:text-amber-300 hover:underline px-2 py-1.5">
                  +{playersWhoOwe.length - 12} more
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Dues by fee title — what each line item bills, collects, and is still
            owed. Reading this next to "Top spending" is how you tell whether a
            tournament paid for itself or leaned on sponsor money. */}
        {!loading && (
          <div className="rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 mb-8">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-display text-sm font-semibold text-gray-900 dark:text-white">
                Dues by fee <span className="text-gray-400 font-normal">· {selectedSeason.label}</span>
              </h2>
              <div className="flex items-baseline gap-3">
                {collectionRate !== null && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{collectionRate.toFixed(0)}% collected</span>
                )}
                <Link href={`/admin/dues?season=${encodeURIComponent(selectedSeason.label)}`} className="text-xs text-team-blue hover:underline">Manage</Link>
              </div>
            </div>
            {feeTitleTotals.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">No dues billed for {selectedSeason.label} yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {feeTitleTotals.map(fee => {
                  const pct = fee.owed > 0 ? (fee.collected / fee.owed) * 100 : 0;
                  return (
                    <Link
                      key={fee.name}
                      href={`/admin/dues?season=${encodeURIComponent(selectedSeason.label)}&fee=${encodeURIComponent(fee.name)}${fee.outstanding > 0 ? '&status=owes' : ''}`}
                      title={`Show ${fee.name}${fee.outstanding > 0 ? ' — players who still owe' : ''}`}
                      className="rounded-lg border border-gray-200/70 dark:border-gray-700/60 p-3 hover:border-team-blue/40 transition-colors"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{fee.name}</p>
                        {fee.passthrough ? (
                          <span className="text-[9px] uppercase tracking-wide text-gray-500 bg-gray-100 dark:bg-gray-700 rounded px-1 py-0.5 shrink-0" title="Passed to the parent club — excluded from team revenue">
                            To club
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">{fee.playerCount} player{fee.playerCount !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                      <p className="font-display text-lg font-bold text-gray-900 dark:text-white tabular-nums mt-1">{formatMoney(fee.collected)}</p>
                      <p className="text-[11px] text-gray-400">of {formatMoney(fee.owed)} billed</p>
                      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden mt-2">
                        <div className={`h-full rounded-full ${pct >= 100 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                      <p className={`text-[11px] mt-1.5 tabular-nums ${fee.outstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                        {fee.outstanding > 0 ? `${formatMoney(fee.outstanding)} outstanding` : 'Fully collected'}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Team snapshot: record · next game · scorers (scoped to the switcher) */}
        {!loading && (
          <div className="grid gap-6 lg:grid-cols-3 mb-8">
            {/* Season record */}
            <div className="rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-6">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white">Record</h2>
                <span className="text-xs text-gray-400">{selectedSeason.label}</span>
              </div>
              {insights.total === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">No completed games {selectedTeam ? `for ${selectedTeam.name} ` : ''}this season yet.</p>
              ) : (
                <>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="font-display text-4xl font-bold text-gray-900 dark:text-white tabular-nums leading-none">
                        {insights.wins}<span className="text-gray-300 dark:text-gray-600">-</span>{insights.losses}<span className="text-gray-300 dark:text-gray-600">-</span>{insights.draws}
                      </p>
                      <p className="text-[11px] uppercase tracking-wide text-gray-400 mt-1.5">Win · Loss · Draw</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-3xl font-bold text-team-blue dark:text-blue-400 tabular-nums leading-none">{insights.winPct}%</p>
                      <p className="text-[11px] uppercase tracking-wide text-gray-400 mt-1.5">Win rate</p>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3 border-t border-gray-100 dark:border-gray-700 pt-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Goals for</span>
                      <span className="font-display font-bold text-green-600 dark:text-green-400 tabular-nums">{insights.goalsFor}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Against</span>
                      <span className="font-display font-bold text-red-600 dark:text-red-400 tabular-nums">{insights.goalsAgainst}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Next game */}
            {(() => {
              const now = new Date();
              const upcoming = teamSchedule
                .filter((g: any) => (g.status === 'scheduled' || g.status === 'upcoming') && new Date(g.game_date) >= now)
                .sort((a: any, b: any) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime());
              const next = upcoming[0];
              return (
                <div className="rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-6">
                  <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white mb-4">Next Game</h2>
                  {!next ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">No upcoming games {selectedTeam ? `for ${selectedTeam.name} ` : ''}scheduled.</p>
                  ) : (() => {
                    const gameDate = parseClubDateTime(next.game_date);
                    const daysUntil = Math.ceil((gameDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-display text-xl font-bold text-gray-900 dark:text-white truncate">vs {next.opponent}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-sm text-gray-600 dark:text-gray-400">
                            <span>{gameDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                            <span>{formatClubTime(next.game_date, next.time_tbd, { hour: 'numeric', minute: '2-digit' })}</span>
                            <span>{next.home_game ? 'Home' : 'Away'}</span>
                          </div>
                          {next.location && <p className="text-xs text-gray-400 mt-1 truncate">{next.location}</p>}
                          {upcoming.length > 1 && (
                            <Link href="/admin/team?tab=schedule" className="text-xs text-team-blue dark:text-blue-400 hover:underline mt-2 inline-block">
                              +{upcoming.length - 1} more scheduled
                            </Link>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-display text-3xl font-bold text-team-blue dark:text-blue-400 tabular-nums leading-none">{daysUntil}</p>
                          <p className="text-[11px] text-gray-400 mt-1">{daysUntil === 1 ? 'day away' : 'days away'}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* Top scorers */}
            <div className="rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-6">
              <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Scorers</h2>
              {insights.topScorers.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">No goals recorded {selectedTeam ? `for ${selectedTeam.name} ` : ''}yet.</p>
              ) : (
                <ol className="space-y-2.5">
                  {insights.topScorers.map((p, i) => (
                    <li key={p.name} className="flex items-center gap-3">
                      <span className="font-display text-sm font-bold text-gray-300 dark:text-gray-600 tabular-nums w-4 shrink-0">{i + 1}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1">{p.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums shrink-0">
                        <span className="font-display font-bold text-gray-900 dark:text-white">{p.goals}</span>G · {p.assists}A
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}

        {/* Everything in the admin system */}
        <div className="mb-8">
          <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white">The Admin System</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 mt-0.5">Every section, one jump away.</p>
          <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {adminSections.map((section) => (
              <div key={section.group}>
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-2 px-1">{section.group}</p>
                <div className="rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700/60 overflow-hidden">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors focus:ring-2 focus:ring-inset focus:ring-team-blue focus:outline-none"
                    >
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{item.name}</span>
                      <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-team-blue dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent items + activity */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Items */}
          <div className="rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-6">
            <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Items</h2>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-team-blue" />
              </div>
            ) : recentItems.length > 0 ? (
              <div className="space-y-2">
                {recentItems.map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    href={item.link}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        {item.type}
                      </span>
                      <span className="text-sm text-gray-900 dark:text-white truncate">{item.title}</span>
                    </div>
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8 text-sm">No recent items</p>
            )}
          </div>

          {/* Recent Activity */}
          <div className="rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
              <Link href="/admin/activity" className="text-xs text-team-blue hover:underline">View all</Link>
            </div>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2">
                    <span className={`text-xs font-medium mt-0.5 ${actionColors[entry.action] || 'text-gray-600'}`}>
                      {entry.action === 'create' ? '+' : entry.action === 'delete' ? '−' : '~'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white">
                        <span className="capitalize">{entry.action}</span> {entry.entity_type} #{entry.entity_id}
                      </p>
                      <p className="text-xs text-gray-400">{entry.user_email ? `${entry.user_email} · ` : ''}{relativeTime(entry.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8 text-sm">No activity yet</p>
            )}
          </div>
        </div>

        {/* Help footer */}
        <div className="mt-8 rounded-xl bg-team-blue p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-semibold mb-2">Need a hand?</h2>
              <p className="text-white/70">
                Email Reece Nunez at{' '}
                <a href="mailto:rnunez@poncacityunited.com" className="text-white underline hover:no-underline font-medium">
                  rnunez@poncacityunited.com
                </a>
                {' '}for anything the sidebar can&apos;t answer.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 self-start md:self-auto bg-white text-team-blue px-4 py-2 rounded-lg font-medium hover:bg-white/90 transition-colors focus:ring-2 focus:ring-white focus:outline-none"
            >
              <span>View Live Site</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
      )}
    </AdminLayout>
  );
}
