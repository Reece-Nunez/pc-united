'use client';

import { useState, useEffect } from 'react';
import { getActiveAnnouncements, Announcement } from '@/lib/supabase';
import { XMarkIcon } from '@heroicons/react/24/outline';

const priorityStyles: Record<number, string> = {
  3: 'bg-red-600 text-white',
  2: 'bg-yellow-400 text-yellow-900',
  1: 'bg-blue-600 text-white',
};

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  useEffect(() => {
    const stored = sessionStorage.getItem('dismissed-announcements');
    if (stored) {
      setDismissed(new Set(JSON.parse(stored)));
    }

    getActiveAnnouncements().then(({ data }) => {
      if (data) setAnnouncements(data);
    });
  }, []);

  const dismiss = (id: number) => {
    const updated = new Set(dismissed);
    updated.add(id);
    setDismissed(updated);
    sessionStorage.setItem('dismissed-announcements', JSON.stringify([...updated]));
  };

  const visible = announcements.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="relative z-40">
      {visible.slice(0, 2).map((announcement) => (
        <div
          key={announcement.id}
          className={`${priorityStyles[announcement.priority] || priorityStyles[1]}`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
            <p className="text-sm font-medium flex-1 text-center">
              <strong>{announcement.title}</strong>
              {announcement.content && ` — ${announcement.content}`}
            </p>
            <button
              onClick={() => dismiss(announcement.id)}
              className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Dismiss"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
