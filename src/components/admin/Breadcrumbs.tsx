'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const segmentLabels: Record<string, string> = {
  admin: 'Dashboard',
  team: 'Team Content',
  gallery: 'Gallery',
  players: 'Players',
  coaches: 'Coaches',
  users: 'Users',
  settings: 'Settings',
  sponsorships: 'Sponsorships',
  newsletter: 'Newsletter',
  expenses: 'Expenses',
  activity: 'Activity Log',
  highlights: 'Highlights',
  notifications: 'Notifications',
};

export default function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  // Don't show breadcrumbs on root admin page
  if (segments.length <= 1) return null;

  const crumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = segmentLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    const isLast = index === segments.length - 1;
    return { href, label, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm">
      {crumbs.map((crumb, index) => (
        <span key={crumb.href} className="flex items-center">
          {index > 0 && (
            <svg
              className="mx-2 h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          )}
          {crumb.isLast ? (
            <span className="font-medium text-gray-900 dark:text-white">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
