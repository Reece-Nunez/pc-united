import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getRoster } from '@/lib/supabase';
import MedicalFormClient from './[token]/MedicalFormClient';

export const dynamic = 'force-dynamic';

// Universal medical-release link (no token). Drop this in a group chat; each
// parent picks their child and submits — a new linked record is created.
export default async function UniversalMedicalFormPage() {
  const { data: roster } = await getRoster();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main id="main-content" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <MedicalFormClient roster={roster || []} />
      </main>
      <Footer />
    </div>
  );
}
