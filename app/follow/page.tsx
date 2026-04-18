'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '../components/ThemeToggle';
import FooterSection from '../components/FooterSection';
import { SERVER_URL } from '../lib/config';

const AMOUNT_MIN = 0;
const AMOUNT_MAX = 200;
const AMOUNT_DEFAULT = 5;

export default function FollowPage() {
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState(AMOUNT_DEFAULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('thanks=1')) {
      setDone(true);
    }
  }, []);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('enter a valid email');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${SERVER_URL}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, amount }),
      });
      const body = await res.json().catch(() => ({} as { url?: string; error?: string; ok?: boolean }));
      if (!res.ok) {
        setError(body.error || 'could not sign up');
        return;
      }
      if (body.url) {
        window.location.href = body.url;
        return;
      }
      setDone(true);
    } catch {
      setError('could not sign up');
    } finally {
      setLoading(false);
    }
  };

  const buttonLabel = loading
    ? '...'
    : amount > 0
      ? `follow along \u2014 $${amount}/mo`
      : 'follow along';

  if (done) {
    return (
      <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh' }}>
        <ThemeToggle />
        <section className="flex flex-col items-center justify-center px-8 min-h-screen">
          <div className="max-w-[420px] w-full text-center space-y-8">
            <Link href="/" className="no-underline">
              <p className="text-[1.3rem] sm:text-[1.5rem] font-normal leading-none tracking-tight" style={{ color: 'var(--text-primary)' }}>
                alexandria.
              </p>
            </Link>
            <p className="text-[0.9rem] leading-[1.9]" style={{ color: 'var(--text-primary)' }}>
              see you in SF.
            </p>
          </div>
        </section>
        <FooterSection />
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh' }}>
      <ThemeToggle />

      <section className="flex flex-col items-center justify-center px-8 min-h-screen">
        <div className="max-w-[420px] w-full">

          <Link href="/" className="no-underline">
            <p className="text-[1.3rem] sm:text-[1.5rem] font-normal leading-none tracking-tight text-center" style={{ color: 'var(--text-primary)' }}>
              alexandria.
            </p>
          </Link>

          <div className="mt-14 sm:mt-16 space-y-10 text-[0.85rem] sm:text-[0.9rem] tracking-wide">

            <div className="space-y-4 leading-[1.9]" style={{ color: 'var(--text-primary)' }}>
              <p>Follow along as I build Alexandria from San Francisco.</p>
              <p className="text-[0.78rem]" style={{ color: 'var(--text-muted)' }}>Occasional notes and vlogs. Pay what you want &mdash; zero is fine.</p>
            </div>

            {/* Email */}
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email"
                className="w-full px-0 py-2 bg-transparent outline-none"
                style={{
                  color: 'var(--text-primary)',
                  border: 'none',
                  borderBottom: '1px solid var(--border-dashed)',
                  fontFamily: 'inherit',
                  borderRadius: 0,
                  fontSize: '0.95rem',
                }}
              />
            </div>

            {/* Amount slider */}
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <p className="text-[2rem] sm:text-[2.4rem] font-light tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'inherit' }}>
                  ${amount}
                </p>
                <span className="text-[0.72rem] tracking-wide" style={{ color: 'var(--text-ghost)' }}>
                  {amount === 0 ? 'free' : '/month'}
                </span>
              </div>

              <input
                type="range"
                min={AMOUNT_MIN}
                max={AMOUNT_MAX}
                step={5}
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value, 10))}
                className="w-full patron-slider"
              />

              <div className="flex justify-between text-[0.65rem] tracking-wide" style={{ color: 'var(--text-ghost)' }}>
                <span>${AMOUNT_MIN}</span>
                <span>${AMOUNT_MAX}</span>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-transparent border-none cursor-pointer p-0 transition-opacity hover:opacity-60 disabled:opacity-30"
              style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontFamily: 'inherit', letterSpacing: '0.025em', fontWeight: 500 }}
            >
              {buttonLabel}
            </button>
            {error ? (
              <p className="mt-3 text-[0.75rem]" style={{ color: 'var(--text-whisper)' }}>
                {error}
              </p>
            ) : null}

          </div>
        </div>
      </section>

      <FooterSection />
    </div>
  );
}
