'use client';

import { useState } from 'react';

export default function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
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
    }
  };

  return (
    <section className="py-16 bg-team-blue">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
          Stay in the Loop
        </h2>
        <p className="text-blue-200 mb-6">
          Get updates on games, tournaments, and team news delivered to your inbox.
        </p>

        {status === 'success' ? (
          <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-4 text-green-200">
            {message}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              required
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/30 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-team-red focus:border-transparent"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="bg-team-red hover:bg-red-700 disabled:bg-gray-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors whitespace-nowrap"
            >
              {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
        )}

        {status === 'error' && (
          <p className="text-red-300 text-sm mt-3">{message}</p>
        )}
      </div>
    </section>
  );
}
