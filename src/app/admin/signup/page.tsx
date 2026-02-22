'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-browser';
import { createAdminNotification } from '@/lib/supabase';
import toast from 'react-hot-toast';
import ToastProvider from '@/components/ToastProvider';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountType, setAccountType] = useState<'parent' | 'coach'>('parent');
  const [loading, setLoading] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);

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
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.poncacityunited.com';
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, role, account_type: accountType },
        emailRedirectTo: `${siteUrl}/admin/login`,
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const typeLabel = accountType === 'parent' ? 'Parent' : 'Coach';
    createAdminNotification({
      type: 'user_signup',
      title: `New ${typeLabel} Signup: ${name}`,
      message: `${name} (${email}) signed up as a ${typeLabel.toLowerCase()} and is waiting for approval.`,
      link: '/admin/users',
    });

    // Send email notification to admins
    fetch('/api/admin/notify-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, accountType }),
    }).catch(() => {}); // fire-and-forget

    setLoading(false);
    setSignupComplete(true);
  };

  // ── Success screen: Check your email ──
  if (signupComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-team-blue to-blue-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <Image
            src="/logo.png"
            alt="Ponca City United FC"
            width={80}
            height={80}
            className="mx-auto mb-6"
          />

          <div className="bg-white rounded-xl shadow-2xl p-8">
            {/* Email icon */}
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-team-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h1 className="text-xl font-bold text-gray-900 mb-2">Check Your Email</h1>
            <p className="text-gray-600 mb-4">
              We sent a confirmation link to:
            </p>
            <p className="font-semibold text-gray-900 bg-gray-50 rounded-lg py-2 px-4 mb-6 break-all">
              {email}
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <h2 className="text-sm font-semibold text-blue-900 mb-2">What happens next:</h2>
              <ol className="text-sm text-blue-800 space-y-2">
                <li className="flex gap-2">
                  <span className="font-bold text-blue-600 shrink-0">1.</span>
                  <span>Click the confirmation link in your email</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-blue-600 shrink-0">2.</span>
                  <span>An admin will review and approve your account</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-blue-600 shrink-0">3.</span>
                  <span>Once approved, you can sign in and access the dashboard</span>
                </li>
              </ol>
            </div>

            <p className="text-xs text-gray-500 mb-6">
              Didn&apos;t receive the email? Check your spam folder. The link expires in 24 hours.
            </p>

            <Link
              href="/admin/login"
              className="block w-full bg-team-blue hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg transition-colors text-center"
            >
              Go to Sign In
            </Link>
          </div>

          <div className="mt-6">
            <Link href="/" className="text-blue-200 hover:text-white text-sm transition-colors">
              &larr; Back to website
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Signup form ──
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
          <p className="text-blue-200 mt-1">Ponca City United FC</p>
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
              placeholder="Your full name"
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
              placeholder="your@email.com"
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
            &larr; Back to website
          </Link>
        </div>
      </div>
    </div>
  );
}
