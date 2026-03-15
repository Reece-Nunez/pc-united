'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import { getPlayers, getHighlights, getNews, getSchedule, getNewsletterSubscribers, getSponsorships, getGalleryImages, getExpenses } from '@/lib/supabase';
import { getRecentActivity } from '@/lib/audit';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import { getCurrentSeason, getAvailableSeasons, isDateInSeason, type Season } from '@/lib/seasons';

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
  const [financials, setFinancials] = useState({ revenue: 0, expenses: 0 });
  const [loading, setLoading] = useState(true);

  const availableSeasons = useMemo(() => getAvailableSeasons(8), []);
  const [selectedSeason, setSelectedSeason] = useState<Season>(getCurrentSeason());

  // Derive chart data from raw data + selected season
  const { performanceData, topScorers, gameScores } = useMemo(() => {
    const seasonSchedule = allSchedule.filter((g: any) => g.game_date && isDateInSeason(g.game_date, selectedSeason));
    const completed = seasonSchedule.filter((g: any) => g.status === 'completed' && g.our_score != null && g.opponent_score != null);

    // Performance chart data: wins/losses/draws by month
    const monthMap: Record<string, { wins: number; losses: number; draws: number }> = {};
    completed.forEach((g: any) => {
      const month = new Date(g.game_date).toLocaleDateString('en-US', { month: 'short' });
      if (!monthMap[month]) monthMap[month] = { wins: 0, losses: 0, draws: 0 };
      if (g.our_score > g.opponent_score) monthMap[month].wins++;
      else if (g.our_score < g.opponent_score) monthMap[month].losses++;
      else monthMap[month].draws++;
    });
    const performanceData = Object.entries(monthMap).map(([month, data]) => ({ month, ...data }));

    // Game scores line chart
    const gameScores = completed
      .sort((a: any, b: any) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime())
      .map((g: any) => ({
        game: `vs ${g.opponent}`,
        'Goals For': g.our_score,
        'Goals Against': g.opponent_score,
      }));

    // Top scorers
    const topScorers = allPlayers
      .filter((p: any) => p.player_stats?.[0]?.goals > 0)
      .sort((a: any, b: any) => (b.player_stats?.[0]?.goals || 0) - (a.player_stats?.[0]?.goals || 0))
      .slice(0, 5)
      .map((p: any) => ({ name: p.name.split(' ')[0], goals: p.player_stats?.[0]?.goals || 0, assists: p.player_stats?.[0]?.assists || 0 }));

    return { performanceData, topScorers, gameScores };
  }, [allSchedule, allPlayers, selectedSeason]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [playersRes, highlightsRes, newsRes, scheduleRes, subscribersRes, sponsorshipsRes, galleryRes, activityRes, expensesRes] = await Promise.all([
          getPlayers(),
          getHighlights(),
          getNews(),
          getSchedule(),
          getNewsletterSubscribers(),
          getSponsorships(),
          getGalleryImages(),
          getRecentActivity(5),
          getExpenses(),
        ]);

        const players = playersRes.data || [];
        const schedule = scheduleRes.data || [];
        const upcomingGames = schedule.filter((g: any) => g.status === 'upcoming' || g.status === 'scheduled').length;

        setAllPlayers(players);
        setAllSchedule(schedule);

        setStats({
          players: players.length,
          highlights: highlightsRes.data?.length || 0,
          news: newsRes.data?.length || 0,
          upcomingGames,
          subscribers: subscribersRes.data?.length || 0,
          sponsorships: sponsorshipsRes.data?.length || 0,
          gallery: galleryRes.data?.length || 0,
        });

        const revenue = (sponsorshipsRes.data || [])
          .filter((s: any) => (s.status === 'approved' || s.status === 'completed') && s.payment_method !== 'Services/In-Kind')
          .reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);
        const totalExpenses = (expensesRes.data || [])
          .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
        setFinancials({ revenue, expenses: totalExpenses });

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
    }
    fetchDashboardData();
  }, []);

  const statCards = [
    { label: 'Players', value: stats.players, color: 'bg-blue-500', link: '/admin/players' },
    { label: 'Highlights', value: stats.highlights, color: 'bg-orange-500', link: '/admin/highlights' },
    { label: 'News', value: stats.news, color: 'bg-green-500', link: '/admin/team?tab=news' },
    { label: 'Upcoming', value: stats.upcomingGames, color: 'bg-purple-500', link: '/admin/team?tab=schedule' },
    { label: 'Subscribers', value: stats.subscribers, color: 'bg-pink-500', link: '/admin/newsletter' },
    { label: 'Sponsors', value: stats.sponsorships, color: 'bg-yellow-500', link: '/admin/sponsorships' },
    { label: 'Gallery', value: stats.gallery, color: 'bg-teal-500', link: '/admin/gallery' },
  ];

  const typeColors: Record<string, string> = {
    player: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    highlight: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    news: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  };

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

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome back! Here&apos;s an overview of your team.</p>
          </div>
          <select
            value={selectedSeason.key}
            onChange={(e) => {
              const season = availableSeasons.find(s => s.key === e.target.value);
              if (season) setSelectedSeason(season);
            }}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-medium shadow-sm focus:ring-2 focus:ring-team-blue focus:border-team-blue"
          >
            {availableSeasons.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
          {statCards.map((stat) => (
            <Link
              key={stat.label}
              href={stat.link}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow p-4"
            >
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '...' : stat.value}</p>
              <div className={`h-1 w-8 ${stat.color} rounded-full mt-2`} />
            </Link>
          ))}
        </div>

        {/* Financial Overview */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Revenue</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                ${financials.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Expenses</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                ${financials.expenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Balance</p>
              <p className={`text-2xl font-bold ${financials.revenue - financials.expenses >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                ${(financials.revenue - financials.expenses).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        )}

        {/* Charts Row */}
        {!loading && (performanceData.length > 0 || topScorers.length > 0) && (
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Season Performance */}
            {performanceData.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{selectedSeason.label} Performance</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="wins" fill="#22c55e" name="Wins" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="losses" fill="#ef4444" name="Losses" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="draws" fill="#eab308" name="Draws" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top Scorers */}
            {topScorers.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Scorers</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={topScorers} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="goals" fill="#dc2626" name="Goals" radius={[0, 2, 2, 0]} />
                    <Bar dataKey="assists" fill="#3b82f6" name="Assists" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Goals Chart */}
        {!loading && gameScores.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Goals For vs Against</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={gameScores}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="game" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="Goals For" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Goals Against" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Next Upcoming Game */}
        {!loading && (() => {
          const now = new Date();
          const upcoming = allSchedule
            .filter((g: any) => (g.status === 'scheduled' || g.status === 'upcoming') && new Date(g.game_date) >= now)
            .sort((a: any, b: any) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime());
          const next = upcoming[0];
          if (!next) return null;
          const gameDate = new Date(next.game_date);
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
                    <span>{gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                    <span>{next.home_game ? 'Home' : 'Away'}</span>
                  </div>
                  {next.location && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{next.location}</p>
                  )}
                </div>
                <div className="text-center sm:text-right">
                  <p className="text-3xl font-bold text-team-blue dark:text-blue-400">{daysUntil}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{daysUntil === 1 ? 'day away' : 'days away'}</p>
                  {upcoming.length > 1 && (
                    <Link href="/admin/team?tab=schedule" className="text-xs text-team-blue hover:underline mt-1 inline-block">
                      +{upcoming.length - 1} more scheduled
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Bottom Row: Quick Actions + Recent Items + Activity */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { label: 'Add Player', href: '/admin/players?action=add', color: 'text-blue-600' },
                { label: 'Add Highlight', href: '/admin/highlights?action=add', color: 'text-orange-600' },
                { label: 'Write News', href: '/admin/team?tab=news&action=add', color: 'text-green-600' },
                { label: 'Add Game', href: '/admin/team?tab=schedule&action=add', color: 'text-purple-600' },
                { label: 'Upload Photos', href: '/admin/gallery', color: 'text-teal-600' },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${action.color}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm font-medium">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Items */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Items</h2>
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
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[item.type] || 'bg-gray-100 text-gray-600'}`}>
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
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

        {/* Help Section */}
        <div className="mt-8 bg-gradient-to-r from-team-blue to-blue-700 rounded-xl p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">Need Help?</h2>
              <p className="text-blue-100">Use the sidebar to navigate between different sections of the admin panel.</p>
              <p className="text-blue-100 mt-1">
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
    </AdminLayout>
  );
}
