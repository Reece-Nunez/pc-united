'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-browser';
import toast from 'react-hot-toast';
import ToastProvider from '@/components/ToastProvider';

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-team-blue to-blue-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showEmailNotConfirmed, setShowEmailNotConfirmed] = useState(false);
  const [exchangingCode, setExchangingCode] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle auth code exchange from email confirmation
  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) return;

    setExchangingCode(true);
    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error }: any) => {
      setExchangingCode(false);
      if (error) {
        toast.error('Email confirmation failed. Please try signing in.');
      } else {
        toast.success('Email confirmed! Redirecting...');
        router.push('/admin');
        router.refresh();
      }
    });
  }, [searchParams, router]);

  const handleResendConfirmation = async () => {
    setResending(true);
    try {
      const supabase = createClient();
      const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.poncacityunited.com';
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${siteUrl}/admin/login`,
        },
      });
      if (error) {
        toast.error('Could not resend email. Please try again later.');
      } else {
        toast.success('Confirmation email sent! Check your inbox.');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowEmailNotConfirmed(false);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Supabase returns "Email not confirmed" when user hasn't clicked the link
      if (error.message.toLowerCase().includes('email not confirmed')) {
        setShowEmailNotConfirmed(true);
      } else if (error.message.toLowerCase().includes('invalid login credentials')) {
        toast.error('Incorrect email or password. Please try again.');
      } else {
        toast.error(error.message);
      }
      setLoading(false);
      return;
    }

    toast.success('Welcome back!');
    router.push('/admin');
    router.refresh();
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
          <h1 className="text-2xl font-bold text-white">Sign In</h1>
          <p className="text-blue-200 mt-1">Ponca City United FC</p>
        </div>

        {/* Code exchange loading */}
        {exchangingCode && (
          <div className="bg-white rounded-xl shadow-2xl p-8 text-center mb-5">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-team-blue mx-auto mb-4" />
            <p className="text-gray-600">Confirming your email...</p>
          </div>
        )}

        {/* Email not confirmed banner */}
        {showEmailNotConfirmed && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 mb-5 text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-yellow-900 mb-1">Email Not Confirmed</h2>
            <p className="text-sm text-yellow-800 mb-3">
              Please check your inbox for a confirmation email and click the link to verify your account before signing in.
            </p>
            <button
              onClick={handleResendConfirmation}
              disabled={resending}
              className="text-sm font-medium text-yellow-700 hover:text-yellow-900 underline disabled:opacity-50"
            >
              {resending ? 'Sending...' : 'Resend confirmation email'}
            </button>
          </div>
        )}

        <form onSubmit={handleLogin} className="bg-white rounded-xl shadow-2xl p-8 space-y-5">
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
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-team-blue hover:bg-blue-800 disabled:bg-gray-400 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/admin/signup" className="text-team-blue hover:underline font-medium">
              Sign up
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
