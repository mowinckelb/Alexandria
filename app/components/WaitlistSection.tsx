'use client';

import { useState } from 'react';

interface WaitlistSectionProps {
  confidential?: boolean;
  inline?: boolean;
}

export default function WaitlistSection({ confidential = false, inline = false }: WaitlistSectionProps) {
  const [email, setEmail] = useState('');
  const [type, setType] = useState<'author' | 'investor'>(confidential ? 'investor' : 'author');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === 'submitting') return;

    setStatus('submitting');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), type, source: confidential ? 'confidential' : 'public' }),
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

  if (status === 'success') {
    return (
      <div className={inline ? 'text-center' : 'py-24 px-8 text-center'}>
        <p className="text-[0.8rem] italic" style={{ color: 'var(--text-muted)' }}>
          noted.
        </p>
      </div>
    );
  }

  const form = (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-5">
      <div className="relative w-56">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="w-full px-0 py-1.5 text-[16px] sm:text-[0.8rem] bg-transparent outline-none text-center"
          style={{
            color: 'var(--text-primary)',
            border: 'none',
            borderBottom: '1px solid var(--border-dashed)',
            fontFamily: 'var(--font-eb-garamond)',
            borderRadius: 0,
          }}
        />
        {email.trim() && status !== 'submitting' && (
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
      </div>

      {/* Author / Investor toggle */}
      <div className="flex items-center gap-4">
        {(['author', 'investor'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className="text-[0.65rem] tracking-wider bg-transparent border-none cursor-pointer transition-opacity capitalize"
            style={{
              color: 'var(--text-primary)',
              opacity: type === t ? 0.6 : 0.2,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {status === 'submitting' && (
        <span className="text-[0.7rem] italic thinking-pulse" style={{ color: 'var(--text-ghost)' }}>...</span>
      )}
      {status === 'error' && (
        <button
          type="submit"
          className="text-[0.65rem] bg-transparent border-none cursor-pointer transition-opacity hover:opacity-40 tracking-wider"
          style={{ color: 'var(--text-ghost)' }}
        >
          try again
        </button>
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
