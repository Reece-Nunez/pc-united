'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { getAdminNotifications, getUnreadNotificationCount, markAllNotificationsRead, markNotificationRead, AdminNotification } from '@/lib/supabase';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const notificationTypeIcons: Record<string, string> = {
  registration: '+',
  sponsorship: '$',
  contact: '@',
  player: 'P',
  highlight: 'H',
  news: 'N',
  gallery: 'G',
  user_signup: 'U',
};

const notificationTypeColors: Record<string, string> = {
  registration: 'bg-green-500',
  sponsorship: 'bg-yellow-500',
  contact: 'bg-blue-500',
  player: 'bg-indigo-500',
  highlight: 'bg-orange-500',
  news: 'bg-teal-500',
  gallery: 'bg-purple-500',
  user_signup: 'bg-pink-500',
};

function relativeTime(dateStr: string) {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    const [{ data }, { count }] = await Promise.all([
      getAdminNotifications(10),
      getUnreadNotificationCount(),
    ]);
    if (data) setNotifications(data);
    setUnreadCount(count);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('admin-dark-mode');
    if (saved === 'true') setDarkMode(true);

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserRole(user?.user_metadata?.role || null);
    });

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('admin-dark-mode', next.toString());
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotifClick = async (notif: AdminNotification) => {
    if (!notif.read) {
      await markNotificationRead(notif.id);
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, read: true } : n));
    }
    setNotifOpen(false);
    if (notif.link) router.push(notif.link);
  };

  const NotifBell = ({ className = '' }: { className?: string }) => (
    <div ref={notifRef} className={`relative ${className}`}>
      <button
        onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) fetchNotifications(); }}
        className="relative p-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {notifOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-team-blue hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No notifications yet</p>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-start gap-3 ${
                    !notif.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <span className={`${notificationTypeColors[notif.type] || 'bg-gray-500'} text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shrink-0 mt-0.5`}>
                    {notificationTypeIcons[notif.type] || '?'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${!notif.read ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{relativeTime(notif.created_at)}</p>
                  </div>
                  {!notif.read && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-2" />}
                </button>
              ))
            )}
          </div>
          <Link
            href="/admin/notifications"
            onClick={() => setNotifOpen(false)}
            className="block text-center text-sm text-team-blue hover:bg-gray-50 dark:hover:bg-gray-700/50 py-3 border-t border-gray-100 dark:border-gray-700 font-medium"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );

  const navItems = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'Notifications',
      href: '/admin/notifications',
      badge: unreadCount > 0 ? unreadCount : undefined,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
    {
      name: 'Players',
      href: '/admin/players',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      name: 'Highlights',
      href: '/admin/highlights',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: 'Team Content',
      href: '/admin/team',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      ),
    },
    {
      name: 'Gallery',
      href: '/admin/gallery',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: 'Newsletter',
      href: '/admin/newsletter',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: 'Sponsorships',
      href: '/admin/sponsorships',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      name: 'Activity Log',
      href: '/admin/activity',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const isParent = userRole === 'parent';
  const parentAllowedHrefs = ['/admin', '/admin/gallery', '/admin/highlights', '/admin/players', '/admin/notifications'];

  const filteredNavItems = isParent
    ? navItems.filter((item) => parentAllowedHrefs.includes(item.href))
    : navItems;

  const quickActions = isParent
    ? [
      { name: 'Upload Photo', href: '/admin/gallery?action=add', color: 'bg-blue-500 hover:bg-blue-600' },
      { name: 'Add Highlight', href: '/admin/highlights?action=add', color: 'bg-orange-500 hover:bg-orange-600' },
    ]
    : [
      { name: 'Add Player', href: '/admin/players?action=add', color: 'bg-blue-500 hover:bg-blue-600' },
      { name: 'Add Highlight', href: '/admin/highlights?action=add', color: 'bg-orange-500 hover:bg-orange-600' },
      { name: 'Add News', href: '/admin/team?tab=news&action=add', color: 'bg-green-500 hover:bg-green-600' },
    ];

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-100'}`}>
      {/* Mobile Header */}
      <div className="lg:hidden bg-team-blue text-white p-4 flex items-center justify-between sticky top-0 z-50">
        <Link href="/admin" className="text-xl font-bold">PC United Admin</Link>
        <div className="flex items-center gap-1">
          <NotifBell />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {sidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-40
          w-64 bg-team-blue text-white
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          flex flex-col
        `}>
          {/* Navigation */}
          <nav className="px-3 py-4 mt-16 lg:mt-0 overflow-y-auto h-full">
            <div className="hidden lg:flex items-center justify-center gap-2 mb-4 py-1">
              <Image src="/logo.png" alt="PC United" width={40} height={40} />
              <Link href="/admin" className="text-base font-bold">PC United Admin</Link>
            </div>
            <div className="text-[11px] uppercase text-blue-300 font-semibold mb-2 px-2">Navigation</div>
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/admin' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center space-x-2.5 px-2.5 py-2 rounded-lg transition-colors text-sm
                    ${isActive
                      ? 'bg-blue-700 text-white'
                      : 'text-blue-100 hover:bg-blue-700/50'
                    }
                  `}
                >
                  {item.icon}
                  <span className="font-medium flex-1">{item.name}</span>
                  {item.badge && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            <div className="text-[10px] uppercase text-blue-300 font-semibold mt-4 mb-2 px-2">Quick Actions</div>
            <div className="space-y-1.5">
            {quickActions.map((action) => (
              <Link
                key={action.name}
                href={action.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center space-x-2.5 px-2.5 py-2 rounded-lg transition-colors text-white text-sm
                  ${action.color}
                `}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>{action.name}</span>
              </Link>
            ))}
            </div>

            <div className="text-[10px] uppercase text-blue-300 font-semibold mt-4 mb-2 px-2">Settings</div>
            <button
              onClick={toggleDarkMode}
              className="flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-blue-100 hover:bg-blue-700/50 transition-colors w-full text-sm"
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
              <span className="font-medium">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <Link
              href="/"
              className="flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-blue-100 hover:bg-blue-700/50 transition-colors text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-medium">Back to Site</span>
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-red-300 hover:bg-red-500/20 transition-colors w-full text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="font-medium">Logout</span>
            </button>
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className={`flex-1 min-h-screen lg:ml-64 ${darkMode ? 'bg-gray-900' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
