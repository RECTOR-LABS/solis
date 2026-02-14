'use client';

import { useState } from 'react';

export function SubscribeForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (res.ok) {
        setStatus('success');
        setMessage('Subscribed! You\'ll receive daily intelligence digests.');
        setEmail('');
      } else {
        const data = await res.json();
        setStatus('error');
        setMessage(data.error || 'Something went wrong');
      }
    } catch {
      setStatus('error');
      setMessage('Network error — please try again');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-2 max-w-md mx-auto">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className="w-full sm:flex-1 px-4 py-2.5 rounded-lg bg-sol-card border border-sol-border text-white placeholder-sol-muted text-sm focus:outline-none focus:border-sol-purple/50 transition-colors"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-gradient-to-r from-sol-purple to-sol-blue text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity whitespace-nowrap"
      >
        {status === 'loading' ? 'Subscribing...' : 'Get Daily Digest'}
      </button>
      {status === 'success' && (
        <p className="text-sol-green text-xs sm:absolute sm:mt-12">{message}</p>
      )}
      {status === 'error' && (
        <p className="text-red-400 text-xs sm:absolute sm:mt-12">{message}</p>
      )}
    </form>
  );
}
