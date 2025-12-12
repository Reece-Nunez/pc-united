'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import { getPlayers, getHighlights, getNews, getSchedule } from '@/lib/supabase';

interface DashboardStats {
  players: number;
  highlights: number;
  news: number;
  upcomingGames: number;
}

interface RecentItem {
  id: number;
  title: string;
  type: 'player' | 'highlight' | 'news';
  date: string;
  link: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({ players: 0, highlights: 0, news: 0, upcomingGames: 0 });
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [playersResult, highlightsResult, newsResult, scheduleResult] = await Promise.all([
          getPlayers(),
          getHighlights(),
          getNews(),
          getSchedule()
        ]);

        const playerCount = playersResult.data?.length || 0;
        const highlightCount = highlightsResult.data?.length || 0;
        const newsCount = newsResult.data?.length || 0;
        const upcomingGames = scheduleResult.data?.filter(
          (game: any) => game.status === 'upcoming' || game.status === 'scheduled'
        ).length || 0;

        setStats({
          players: playerCount,
          highlights: highlightCount,
          news: newsCount,
          upcomingGames
        });

        // Create recent items from various sources
        const recent: RecentItem[] = [];

        // Add recent players
        playersResult.data?.slice(0, 3).forEach((player: any) => {
          recent.push({
            id: player.id,
            title: player.name,
            type: 'player',
            date: player.created_at || new Date().toISOString(),
            link: `/admin/players?edit=${player.id}`
          });
        });

        // Add recent highlights
        highlightsResult.data?.slice(0, 3).forEach((highlight: any) => {
          recent.push({
            id: highlight.id,
            title: highlight.title,
            type: 'highlight',
            date: highlight.created_at || new Date().toISOString(),
            link: '/admin/highlights'
          });
        });

        // Add recent news
        newsResult.data?.slice(0, 3).forEach((article: any) => {
          recent.push({
            id: article.id,
            title: article.title,
            type: 'news',
            date: article.created_at || new Date().toISOString(),
            link: '/admin/team?tab=news'
          });
        });

        // Sort by date and take top 6
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
    {
      label: 'Total Players',
      value: stats.players,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'bg-blue-500',
      link: '/admin/players'
    },
    {
      label: 'Highlights',
      value: stats.highlights,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      color: 'bg-orange-500',
      link: '/admin/highlights'
    },
    {
      label: 'News Articles',
      value: stats.news,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      ),
      color: 'bg-green-500',
      link: '/admin/team?tab=news'
    },
    {
      label: 'Upcoming Games',
      value: stats.upcomingGames,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'bg-purple-500',
      link: '/admin/team?tab=schedule'
    }
  ];

  const quickActions = [
    {
      title: 'Add New Player',
      description: 'Register a new player to the roster',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
      link: '/admin/players?action=add',
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700'
    },
    {
      title: 'Add Highlight',
      description: 'Upload a new game highlight video',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      link: '/admin/highlights?action=add',
      color: 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700'
    },
    {
      title: 'Write News Article',
      description: 'Create a new news post',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      link: '/admin/team?tab=news&action=add',
      color: 'bg-green-50 hover:bg-green-100 border-green-200 text-green-700'
    },
    {
      title: 'Add Game',
      description: 'Schedule a new match',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      link: '/admin/team?tab=schedule&action=add',
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700'
    }
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'player': return 'bg-blue-100 text-blue-800';
      case 'highlight': return 'bg-orange-100 text-orange-800';
      case 'news': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here&apos;s an overview of your team.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {statCards.map((stat) => (
            <Link
              key={stat.label}
              href={stat.link}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-4 md:p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900">
                    {loading ? '...' : stat.value}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg text-white`}>
                  {stat.icon}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quickActions.map((action) => (
                <Link
                  key={action.title}
                  href={action.link}
                  className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors ${action.color}`}
                >
                  <div className="flex-shrink-0 mt-0.5">{action.icon}</div>
                  <div>
                    <h3 className="font-medium">{action.title}</h3>
                    <p className="text-sm opacity-80">{action.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Items */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Items</h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-team-blue"></div>
              </div>
            ) : recentItems.length > 0 ? (
              <div className="space-y-3">
                {recentItems.map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    href={item.link}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(item.type)}`}>
                        {item.type}
                      </span>
                      <span className="text-gray-900 font-medium truncate max-w-[200px]">{item.title}</span>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No recent items found</p>
            )}
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-gradient-to-r from-team-blue to-blue-700 rounded-xl p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">Need Help?</h2>
              <p className="text-blue-100">Use the sidebar to navigate between different sections of the admin panel.</p>
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
