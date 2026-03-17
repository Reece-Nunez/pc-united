'use client';

import { useState, useRef } from 'react';
import TurnstileWidget, { type TurnstileWidgetRef } from '@/components/TurnstileWidget';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    playerBirthYear: '',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetRef>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!turnstileToken) {
      setErrorMessage('Please wait for bot verification to complete.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, turnstileToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message.');
      }

      setStatus('success');
      setFormData({ name: '', email: '', phone: '', playerBirthYear: '', subject: '', message: '' });
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <div className="text-green-600 text-5xl mb-4">✓</div>
        <h3 className="text-2xl font-bold text-team-blue mb-2">Message Sent!</h3>
        <p className="text-gray-600">We'll get back to you as soon as possible.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg">
      <h3 className="text-2xl font-bold text-team-blue mb-6">Send Us a Message</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Your Name *</label>
          <input
            type="text"
            name="name"
            required
            autoComplete="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none focus:ring-2 focus:ring-team-blue/30"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none focus:ring-2 focus:ring-team-blue/30"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
          <input
            type="tel"
            name="phone"
            autoComplete="tel"
            value={formData.phone}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none focus:ring-2 focus:ring-team-blue/30"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Player&apos;s Birth Year (if applicable)</label>
          <select
            name="playerBirthYear"
            value={formData.playerBirthYear}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
          >
            <option value="">Select birth year</option>
            <option value="2015">2015</option>
            <option value="2016">2016</option>
            <option value="2017">2017</option>
            <option value="2018">2018</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
          <select
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
          >
            <option value="">Select a topic</option>
            <option value="registration">Player Registration</option>
            <option value="tryouts">Team Information</option>
            <option value="schedule">Schedule Questions</option>
            <option value="travel">Travel Tournament Info</option>
            <option value="sponsorship">Sponsorship Request</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
          <textarea
            name="message"
            rows={5}
            required
            value={formData.message}
            onChange={handleChange}
            placeholder="Tell us how we can help you..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:border-team-blue focus:outline-none"
          ></textarea>
        </div>

        <TurnstileWidget ref={turnstileRef} onSuccess={setTurnstileToken} />

        {status === 'error' && errorMessage && (
          <p role="alert" className="text-red-600 text-sm">{errorMessage}</p>
        )}

        <button
          type="submit"
          disabled={status === 'loading' || !turnstileToken}
          className="w-full bg-team-red hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition duration-300 cursor-pointer"
        >
          {status === 'loading' ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </div>
  );
}
