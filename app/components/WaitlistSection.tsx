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
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className="w-56 px-0 py-1.5 text-[0.8rem] bg-transparent outline-none text-center"
        style={{
          color: 'var(--text-primary)',
          border: 'none',
          borderBottom: '1px solid var(--border-dashed)',
          fontFamily: 'var(--font-eb-garamond)',
          borderRadius: 0,
        }}
      />

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

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="text-[0.7rem] bg-transparent border-none cursor-pointer transition-opacity hover:opacity-40 tracking-wider disabled:opacity-20"
        style={{ color: 'var(--text-primary)', opacity: 0.4 }}
      >
        {status === 'submitting' ? (
          <span className="italic thinking-pulse">...</span>
        ) : status === 'error' ? (
          'try again'
        ) : (
          'join'
        )}
      </button>
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
