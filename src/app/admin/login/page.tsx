'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase-browser';
import toast from 'react-hot-toast';
import ToastProvider from '@/components/ToastProvider';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
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
          <h1 className="text-2xl font-bold text-white">Admin Login</h1>
          <p className="text-blue-200 mt-1">Ponca City United FC</p>
        </div>

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
            ← Back to website
          </Link>
        </div>
      </div>
    </div>
  );
}
