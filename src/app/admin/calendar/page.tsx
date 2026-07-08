'use client';

import { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/AdminLayout';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import EventCalendar from '@/components/EventCalendar';
import { buildCalendarItems, CalendarItem } from '@/lib/calendar';
import { getAllEvents, getSchedule, getTeams, Event, Schedule, Team } from '@/lib/supabase';
import { createClient } from '@/lib/supabase-browser';

export default function AdminCalendarPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [games, setGames] = useState<Schedule[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [evRes, gRes, tRes] = await Promise.all([getAllEvents(), getSchedule(), getTeams()]);
      if (!evRes.error) setEvents((evRes.data as Event[]) || []);
      if (!gRes.error) setGames((gRes.data as Schedule[]) || []);
      if (!tRes.error) setTeams(tRes.data || []);
      setLoading(false);
    })();
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }: any) => setRole(data?.user?.user_metadata?.role || null));
  }, []);

  const items = useMemo(() => buildCalendarItems(events, games, teams), [events, games, teams]);
  const canEdit = role === 'admin' || role === 'approved';

  const editHref = (item: CalendarItem) =>
    item.kind === 'game' ? '/admin/team?tab=schedule'
      : item.typeLabel === 'practice' ? '/admin/team?tab=practices'
      : '/admin/team?tab=events';

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="mb-4"><Breadcrumbs /></div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Calendar</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">All games, practices, and events</p>
          </div>
          {canEdit && (
            <a href="/admin/team?tab=schedule" className="bg-team-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shrink-0">
              + Add in Team Content
            </a>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 md:p-6">
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">Loading calendar…</div>
          ) : (
            <EventCalendar items={items} canEdit={canEdit} editHref={editHref} />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
