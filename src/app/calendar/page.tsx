import Header from '@/components/Header';
import Footer from '@/components/Footer';
import EventCalendar from '@/components/EventCalendar';
import { buildCalendarItems } from '@/lib/calendar';
import { getAllEvents, getSchedule, getTeams, Event, Schedule } from '@/lib/supabase';
import { generateMetadata as genMeta } from '@/components/SEO';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = genMeta({
  title: 'Team Calendar - Ponca City United FC',
  description: 'Upcoming games, practices, and events for Ponca City United FC.',
  url: '/calendar',
});

export default async function PublicCalendarPage() {
  const [evRes, gRes, tRes] = await Promise.all([getAllEvents(), getSchedule(), getTeams()]);
  const items = buildCalendarItems((evRes.data as Event[]) || [], (gRes.data as Schedule[]) || [], tRes.data || []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <section className="bg-gradient-to-br from-team-blue to-blue-900 text-white py-10 md:py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-3xl md:text-5xl font-bold">Team <span className="text-team-red">Calendar</span></h1>
          <p className="text-blue-100 mt-3">Games, practices, and events for Ponca City United FC</p>
        </div>
      </section>
      <main id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
          <EventCalendar items={items} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
