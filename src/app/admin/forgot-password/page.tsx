'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-browser';
import { verifyTurnstileClient } from '@/lib/turnstile';
import TurnstileWidget, { type TurnstileWidgetRef } from '@/components/TurnstileWidget';
import toast from 'react-hot-toast';


export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetRef>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!turnstileToken) {
      toast.error('Please wait for bot verification to complete.');
      return;
    }

    setLoading(true);

    const verified = await verifyTurnstileClient(turnstileToken);
    if (!verified) {
      toast.error('Bot verification failed. Please try again.');
      turnstileRef.current?.reset();
      setTurnstileToken(null);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.poncacityunited.com';

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/admin/reset-password`,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
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
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-team-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h1 className="text-xl font-bold text-gray-900 mb-2">Check Your Email</h1>
            <p className="text-gray-600 mb-4">
              If an account exists for that email, we sent a password reset link to:
            </p>
            <p className="font-semibold text-gray-900 bg-gray-50 rounded-lg py-2 px-4 mb-6 break-all">
              {email}
            </p>

            <p className="text-xs text-gray-500 mb-6">
              Didn&apos;t receive the email? Check your spam folder. The link expires in 24 hours.
            </p>

            <Link
              href="/admin/login"
              className="block w-full bg-team-blue hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg transition-colors text-center"
            >
              Back to Sign In
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-team-blue to-blue-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image
            src="/logo.png"
            alt="Ponca City United FC"
            width={80}
            height={80}
            className="mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="text-blue-200 mt-1">Ponca City United FC</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl p-8 space-y-5">
          <p className="text-sm text-gray-600">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>

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

          <TurnstileWidget ref={turnstileRef} onSuccess={setTurnstileToken} />

          <button
            type="submit"
            disabled={loading || !turnstileToken}
            className="w-full bg-team-blue hover:bg-blue-800 disabled:bg-gray-400 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <p className="text-center text-sm text-gray-500">
            <Link href="/admin/login" className="text-team-blue hover:underline font-medium">
              Back to Sign In
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
