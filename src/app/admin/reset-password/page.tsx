'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-browser';
import { verifyTurnstileClient } from '@/lib/turnstile';
import TurnstileWidget, { type TurnstileWidgetRef } from '@/components/TurnstileWidget';
import toast from 'react-hot-toast';


export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetRef>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      toast.error('Password must contain at least one uppercase letter');
      return;
    }
    if (!/[a-z]/.test(password)) {
      toast.error('Password must contain at least one lowercase letter');
      return;
    }
    if (!/[0-9]/.test(password)) {
      toast.error('Password must contain at least one number');
      return;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      toast.error('Password must contain at least one special character');
      return;
    }

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
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success('Password updated successfully! Redirecting to sign in...');
    setLoading(false);
    setTimeout(() => {
      router.push('/admin/login');
    }, 2000);
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
          <h1 className="text-2xl font-bold text-white">Set New Password</h1>
          <p className="text-blue-200 mt-1">Ponca City United FC</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl p-8 space-y-5">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-team-blue focus:border-transparent outline-none"
              placeholder="At least 8 characters"
            />
            {password.length > 0 && (
              <div className="mt-2 space-y-1">
                {[
                  { test: password.length >= 8, label: 'At least 8 characters' },
                  { test: /[A-Z]/.test(password), label: 'One uppercase letter' },
                  { test: /[a-z]/.test(password), label: 'One lowercase letter' },
                  { test: /[0-9]/.test(password), label: 'One number' },
                  { test: /[^A-Za-z0-9]/.test(password), label: 'One special character (!@#$...)' },
                ].map(({ test, label }) => (
                  <div key={label} className={`flex items-center gap-1.5 text-xs ${test ? 'text-green-600' : 'text-red-500'}`}>
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {test ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      )}
                    </svg>
                    {label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
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

          <TurnstileWidget ref={turnstileRef} onSuccess={setTurnstileToken} />

          <button
            type="submit"
            disabled={loading || !turnstileToken}
            className="w-full bg-team-blue hover:bg-blue-800 disabled:bg-gray-400 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Updating...' : 'Update Password'}
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
