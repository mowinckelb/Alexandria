'use client';

import { useState } from 'react';
import { SERVER_URL } from '../lib/config';

interface WaitlistSectionProps {
  inline?: boolean;
  source?: string;
}

export default function WaitlistSection({ inline = false, source = 'public' }: WaitlistSectionProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === 'submitting') return;

    setStatus('submitting');
    try {
      const res = await fetch(`${SERVER_URL}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source }),
      });
      if (res.ok) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  const form = (
    <form onSubmit={handleSubmit} className="flex items-center gap-0">
      {status === 'success' ? (
        <span className="italic" style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
          noted.
        </span>
      ) : (
        <div className="relative" style={{ width: `${Math.max(2, email.length * 0.32 + 0.7)}rem` }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder=""
            required
            className="w-full px-0 py-0.5 bg-transparent outline-none"
            style={{
              color: 'var(--text-primary)',
              border: 'none',
              borderBottom: '1px solid var(--border-dashed)',
              fontFamily: 'var(--font-eb-garamond)',
              borderRadius: 0,
              opacity: 0.55,
              fontSize: '0.72rem',
            }}
          />
          {email.trim() && status === 'idle' && (
            <button
              type="submit"
              className="absolute right-0 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-1 transition-opacity hover:opacity-60"
              style={{ color: 'var(--text-ghost)' }}
              aria-label="Submit"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          )}
          {status === 'submitting' && (
            <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[0.7rem] italic thinking-pulse" style={{ color: 'var(--text-ghost)' }}>...</span>
          )}
          {status === 'error' && (
            <button
              type="submit"
              className="absolute right-0 top-1/2 -translate-y-1/2 text-[0.65rem] bg-transparent border-none cursor-pointer transition-opacity hover:opacity-40 tracking-wider"
              style={{ color: 'var(--text-ghost)' }}
            >
              retry
            </button>
          )}
        </div>
      )}
    </form>
  );

  if (inline) return form;

  return (
    <section className="py-24 px-8">
      <div className="max-w-md mx-auto text-center">
        {form}
      </div>
    </section>
  );
}
