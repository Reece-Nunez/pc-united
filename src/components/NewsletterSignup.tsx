'use client';

import { useState, useRef } from 'react';
import TurnstileWidget, { type TurnstileWidgetRef } from '@/components/TurnstileWidget';

export default function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetRef>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    if (!turnstileToken) {
      setStatus('error');
      setMessage('Please wait for bot verification to complete.');
      return;
    }

    setStatus('loading');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, turnstileToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      setStatus('success');
      setMessage('You\'re on the list! We\'ll keep you updated.');
      setEmail('');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Something went wrong. Try again.');
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    }
  };

  return (
    <section className="py-20 bg-gradient-to-b from-team-blue to-blue-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-team-red text-sm font-semibold tracking-wider uppercase mb-3">Get Updated</p>
        <h2 className="text-2xl md:text-4xl font-bold text-white mb-3">
          Stay in the Loop
        </h2>
        <p className="text-blue-300 mb-8 max-w-md mx-auto">
          Get updates on games, tournaments, and team news delivered to your inbox.
        </p>

        {status === 'success' ? (
          <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-4 text-green-200">
            {message}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md mx-auto">
            <div className="flex items-center bg-white/5 border border-white/20 rounded-full p-1.5 focus-within:ring-2 focus-within:ring-team-red focus-within:border-transparent transition-all">
              <label htmlFor="newsletter-email" className="sr-only">Email address</label>
              <input
                id="newsletter-email"
                type="email"
                required
                autoComplete="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent px-5 py-2.5 text-white placeholder-blue-400 focus:outline-none text-sm"
              />
              <button
                type="submit"
                disabled={status === 'loading' || !turnstileToken}
                className="bg-team-red hover:bg-red-600 disabled:bg-gray-600 text-white font-semibold px-6 py-2.5 rounded-full transition-colors whitespace-nowrap text-sm cursor-pointer"
              >
                {status === 'loading' ? 'Subscribing...' : 'Subscribe Now'}
              </button>
            </div>
            <TurnstileWidget ref={turnstileRef} onSuccess={setTurnstileToken} />
          </form>
        )}

        {status === 'error' && (
          <p role="alert" className="text-red-300 text-sm mt-3">{message}</p>
        )}
      </div>
    </section>
  );
}
