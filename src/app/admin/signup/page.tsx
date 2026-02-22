'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-browser';
import toast from 'react-hot-toast';
import ToastProvider from '@/components/ToastProvider';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountType, setAccountType] = useState<'parent' | 'coach'>('parent');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const role = accountType === 'parent' ? 'pending_parent' : 'pending';
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, role, account_type: accountType },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success('Account created! An admin must approve your access before you can sign in.');
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-team-blue to-blue-900 flex items-center justify-center px-4">
      <ToastProvider />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image
            src="/logo.png"
            alt="Ponca City United FC"
            width={80}
            height={80}
            className="mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-blue-200 mt-1">Ponca City United FC Admin</p>
        </div>

        <form onSubmit={handleSignup} className="bg-white rounded-xl shadow-2xl p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">I am a...</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAccountType('parent')}
                className={`p-3 rounded-lg border-2 text-center transition-colors ${
                  accountType === 'parent'
                    ? 'border-team-blue bg-blue-50 text-team-blue'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm font-medium">Parent</span>
              </button>
              <button
                type="button"
                onClick={() => setAccountType('coach')}
                className={`p-3 rounded-lg border-2 text-center transition-colors ${
                  accountType === 'coach'
                    ? 'border-team-blue bg-blue-50 text-team-blue'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-sm font-medium">Coach / Admin</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {accountType === 'parent'
                ? 'Parents can upload photos, add highlights, and view the roster.'
                : 'Coach accounts require admin approval for full access.'}
            </p>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-team-blue focus:border-transparent outline-none"
              placeholder="Coach Name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-team-blue focus:border-transparent outline-none"
              placeholder="coach@poncacityunited.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-team-blue focus:border-transparent outline-none"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-team-blue focus:border-transparent outline-none"
              placeholder="Confirm your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-team-blue hover:bg-blue-800 disabled:bg-gray-400 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/admin/login" className="text-team-blue hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </form>

        <div className="text-center mt-6">
          <Link href="/" className="text-blue-200 hover:text-white text-sm transition-colors">
            ← Back to website
          </Link>
        </div>
      </div>
    </div>
  );
}
