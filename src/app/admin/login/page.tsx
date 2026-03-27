'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-browser';
import { verifyTurnstileClient } from '@/lib/turnstile';
import TurnstileWidget, { type TurnstileWidgetRef } from '@/components/TurnstileWidget';
import toast from 'react-hot-toast';

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
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showEmailNotConfirmed, setShowEmailNotConfirmed] = useState(false);
  const [exchangingCode, setExchangingCode] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetRef>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle auth callback error param
  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'auth_callback_failed') {
      toast.error('Email confirmation failed. Please try signing in.');
    }
  }, [searchParams]);

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
          emailRedirectTo: `${siteUrl}/auth/callback`,
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

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.poncacityunited.com';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
      },
    });
    if (error) {
      toast.error('Could not connect to Google. Please try again.');
    }
  };

  const handleSendOtp = async () => {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      toast.error('Please enter your phone number.');
      return;
    }
    if (!turnstileToken) {
      toast.error('Please wait for bot verification to complete.');
      return;
    }
    const verified = await verifyTurnstileClient(turnstileToken);
    if (!verified) {
      toast.error('Bot verification failed. Please try again.');
      turnstileRef.current?.reset();
      setTurnstileToken(null);
      return;
    }
    // Ensure phone starts with + country code
    const formattedPhone = trimmedPhone.startsWith('+') ? trimmedPhone : `+1${trimmedPhone.replace(/\D/g, '')}`;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ phone: formattedPhone });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    setPhone(formattedPhone);
    setOtpSent(true);
    setLoading(false);
    toast.success('Verification code sent!');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      toast.error('Please enter the 6-digit code.');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: 'sms',
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    toast.success('Welcome back!');
    router.push('/admin');
    router.refresh();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!turnstileToken) {
      toast.error('Please wait for bot verification to complete.');
      return;
    }

    setLoading(true);
    setShowEmailNotConfirmed(false);

    const verified = await verifyTurnstileClient(turnstileToken);
    if (!verified) {
      toast.error('Bot verification failed. Please try again.');
      turnstileRef.current?.reset();
      setTurnstileToken(null);
      setLoading(false);
      return;
    }

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

        <div className="bg-white rounded-xl shadow-2xl p-8 space-y-5">
          <TurnstileWidget ref={turnstileRef} onSuccess={setTurnstileToken} />

          {/* Email / Phone toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => { setLoginMethod('email'); setOtpSent(false); }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                loginMethod === 'email'
                  ? 'bg-team-blue text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => { setLoginMethod('phone'); setShowEmailNotConfirmed(false); }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                loginMethod === 'phone'
                  ? 'bg-team-blue text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Phone
            </button>
          </div>

          {loginMethod === 'email' ? (
            <form onSubmit={handleLogin} className="space-y-5">
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

              <div className="text-right">
                <Link href="/admin/forgot-password" className="text-sm text-team-blue hover:underline">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading || !turnstileToken}
                className="w-full bg-team-blue hover:bg-blue-800 disabled:bg-gray-400 text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <div className="flex gap-2">
                  <input
                    id="phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={otpSent}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-team-blue focus:border-transparent outline-none disabled:bg-gray-100"
                    placeholder="(555) 123-4567"
                  />
                  {!otpSent && (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading}
                      className="px-4 py-2.5 bg-team-blue hover:bg-blue-800 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                    >
                      {loading ? 'Sending...' : 'Send Code'}
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">US numbers only. We&apos;ll send a 6-digit verification code.</p>
              </div>

              {otpSent && (
                <>
                  <div>
                    <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                      Verification Code
                    </label>
                    <input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-team-blue focus:border-transparent outline-none text-center text-2xl tracking-[0.5em] font-mono"
                      placeholder="000000"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="w-full bg-team-blue hover:bg-blue-800 disabled:bg-gray-400 text-white font-semibold py-2.5 rounded-lg transition-colors"
                  >
                    {loading ? 'Verifying...' : 'Verify & Sign In'}
                  </button>

                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => { setOtpSent(false); setOtp(''); }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Change number
                    </button>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading}
                      className="text-sm text-team-blue hover:underline disabled:opacity-50"
                    >
                      Resend code
                    </button>
                  </div>
                </>
              )}
            </form>
          )}

          {/* Divider */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-gray-400">or</span>
            </div>
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 disabled:bg-gray-100 text-gray-700 font-medium py-2.5 rounded-lg border border-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <p className="text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/admin/signup" className="text-team-blue hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-blue-200 hover:text-white text-sm transition-colors">
            &larr; Back to website
          </Link>
        </div>
      </div>
    </div>
  );
}
