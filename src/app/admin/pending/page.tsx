'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-browser';
import toast from 'react-hot-toast';
import ToastProvider from '@/components/ToastProvider';

export default function PendingApprovalPage() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  };

  const handleRefresh = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const role = user?.user_metadata?.role;

    if (role === 'approved' || role === 'admin') {
      toast.success('You\'ve been approved!');
      router.push('/admin');
      router.refresh();
    } else {
      toast('Still pending. Please wait for an admin to approve your account.', { icon: '⏳' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-team-blue to-blue-900 flex items-center justify-center px-4">
      <ToastProvider />
      <div className="w-full max-w-md text-center">
        <Image
          src="/logo.png"
          alt="Ponca City United FC"
          width={80}
          height={80}
          className="mx-auto mb-6"
        />

        <div className="bg-white rounded-xl shadow-2xl p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-2">Pending Approval</h1>
          <p className="text-gray-600 mb-6">
            Your account has been created but needs to be approved by an existing admin before you can access the dashboard.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Please contact a team admin and ask them to approve your account from the admin panel.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleRefresh}
              className="w-full bg-team-blue hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              Check Status
            </button>
            <button
              onClick={handleLogout}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
