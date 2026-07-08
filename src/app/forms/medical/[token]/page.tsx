import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getMedicalFormByToken } from '@/lib/supabase';
import MedicalFormClient from './MedicalFormClient';

export const dynamic = 'force-dynamic';

export default async function MedicalFormPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data: form, error } = await getMedicalFormByToken(token);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main id="main-content" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        {error || !form ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Form not found</h1>
            <p className="text-gray-600">
              This medical release link is invalid or has expired. Please contact your coach for a new link.
            </p>
          </div>
        ) : (
          <MedicalFormClient form={form} />
        )}
      </main>
      <Footer />
    </div>
  );
}
