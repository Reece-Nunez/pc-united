import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getRoster, getEvents, getSchedule, Event, Schedule } from '@/lib/supabase';
import RsvpClient from './RsvpClient';

export const dynamic = 'force-dynamic';

// Public RSVP link for the group chat. A parent picks their player and marks
// Going/Maybe/Not going for upcoming games & practices — no login required.
export default async function RsvpPage() {
  const [rosterRes, eventsRes, gamesRes] = await Promise.all([getRoster(), getEvents(), getSchedule()]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main id="main-content" className="max-w-2xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <RsvpClient
          roster={rosterRes.data || []}
          events={(eventsRes.data as Event[]) || []}
          games={(gamesRes.data as Schedule[]) || []}
        />
      </main>
      <Footer />
    </div>
  );
}
