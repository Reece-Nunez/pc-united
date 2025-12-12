'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

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
  ];

  const quickActions = [
    { name: 'Add Player', href: '/admin/players?action=add', color: 'bg-blue-500 hover:bg-blue-600' },
    { name: 'Add Highlight', href: '/admin/highlights?action=add', color: 'bg-orange-500 hover:bg-orange-600' },
    { name: 'Add News', href: '/admin/team?tab=news&action=add', color: 'bg-green-500 hover:bg-green-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile Header */}
      <div className="lg:hidden bg-team-blue text-white p-4 flex items-center justify-between sticky top-0 z-50">
        <Link href="/admin" className="text-xl font-bold">PC United Admin</Link>
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

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-team-blue text-white
          transform transition-transform duration-300 ease-in-out
          lg:transform-none lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          flex flex-col
        `}>
          {/* Logo */}
          <div className="hidden lg:flex items-center justify-center h-16 border-b border-blue-700">
            <Link href="/admin" className="text-xl font-bold">PC United Admin</Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto mt-16 lg:mt-0">
            <div className="text-xs uppercase text-blue-300 font-semibold mb-4 px-3">Navigation</div>
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/admin' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors
                    ${isActive
                      ? 'bg-blue-700 text-white'
                      : 'text-blue-100 hover:bg-blue-700/50'
                    }
                  `}
                >
                  {item.icon}
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}

            <div className="text-xs uppercase text-blue-300 font-semibold mt-8 mb-4 px-3">Quick Actions</div>
            {quickActions.map((action) => (
              <Link
                key={action.name}
                href={action.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-white text-sm
                  ${action.color}
                `}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>{action.name}</span>
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-blue-700">
            <Link
              href="/"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-blue-100 hover:bg-blue-700/50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Site</span>
            </Link>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
