'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ThemeToggle } from '../components/ThemeToggle';
import { SERVER_URL } from '../lib/config';

function SignupPageContent() {
  const searchParams = useSearchParams();
  const urlRef = searchParams.get('ref');
  const refSource = searchParams.get('ref_source');
  const [kinCode, setKinCode] = useState('');
  const ref = kinCode.trim() || urlRef;
  const authParams = [ref && `ref=${encodeURIComponent(ref)}`, refSource && `ref_source=${encodeURIComponent(refSource)}`].filter(Boolean).join('&');
  const authUrl = `${SERVER_URL}/auth/github${authParams ? `?${authParams}` : ''}`;

  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh' }}>
      <ThemeToggle />

      {/* Step 1 — Sign up */}
      <section className="flex flex-col items-center justify-center px-8 min-h-screen relative">
        <div className="max-w-[420px] flex flex-col items-center" style={{ marginTop: '-4vh' }}>

          <a href="/" className="no-underline">
            <p className="text-[1.3rem] sm:text-[1.5rem] font-normal leading-none tracking-tight text-center" style={{ color: 'var(--text-primary)' }}>
              alexandria.
            </p>
          </a>

          <div className="mt-14 sm:mt-16">
            <a
              href={authUrl}
              className="text-[1.05rem] sm:text-[1.15rem] tracking-wide font-medium no-underline transition-opacity hover:opacity-60"
              style={{ color: 'var(--text-primary)' }}
            >
              sign up with github
            </a>
          </div>

          <div className="mt-8">
            <input
              type="text"
              value={kinCode}
              onChange={(e) => setKinCode(e.target.value)}
              placeholder="kin code"
              className="text-center text-[0.75rem] tracking-widest bg-transparent border-none outline-none w-[140px]"
              style={{ color: 'var(--text-ghost)', caretColor: 'var(--text-ghost)' }}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-ghost)', animation: 'bounce 2.5s ease-in-out infinite' }}>
            <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
          </svg>
        </div>
      </section>

      {/* Step 2 — What the command does */}
      <section className="flex flex-col items-center justify-center px-8 min-h-screen">
        <div className="max-w-[420px] space-y-8">

          <p className="text-[0.6rem] tracking-widest uppercase text-center" style={{ color: 'var(--text-ghost)', letterSpacing: '0.2em' }}>
            the command
          </p>

          <div className="space-y-5 text-[0.85rem] sm:text-[0.9rem] tracking-wide leading-[1.9]" style={{ color: 'var(--text-secondary)' }}>
            <p>Creates <code style={{ fontSize: '0.82em', color: 'var(--text-primary)' }}>~/.alexandria/</code> on your machine.</p>
            <p>Installs two hooks &mdash; one captures your sessions, one loads your profile at the start of each conversation.</p>
            <p>A file about you builds itself over time. Your <em>constitution</em>. Structured markdown you can read, edit, and take anywhere.</p>
            <p>Works with Claude Code and Cursor. Nothing leaves your machine except anonymous metadata to improve the product.</p>
          </div>

        </div>
      </section>

      {/* Step 3 — What you get */}
      <section className="flex flex-col items-center justify-center px-8 min-h-screen">
        <div className="max-w-[420px] space-y-8">

          <p className="text-[0.6rem] tracking-widest uppercase text-center" style={{ color: 'var(--text-ghost)', letterSpacing: '0.2em' }}>
            what you get
          </p>

          <div className="space-y-5 text-[0.85rem] sm:text-[0.9rem] tracking-wide leading-[1.9]" style={{ color: 'var(--text-secondary)' }}>
            <p><span style={{ color: 'var(--text-primary)' }}>Every AI knows you.</span> Your constitution loads at the start of every session. No more repeating yourself.</p>
            <p><span style={{ color: 'var(--text-primary)' }}>Your thinking develops.</span> Run <code style={{ fontSize: '0.82em', color: 'var(--text-primary)' }}>/a</code> for active sessions that push your cognition &mdash; patterns, contradictions, blind spots.</p>
            <p><span style={{ color: 'var(--text-primary)' }}>Everything compounds.</span> Drop voice memos, notes, articles into your vault. The more you put in, the sharper the file gets.</p>
          </div>

        </div>
      </section>

      {/* Step 4 — CTA repeat */}
      <section className="flex flex-col items-center justify-center px-8 min-h-screen">
        <div className="max-w-[420px] flex flex-col items-center gap-10">

          <div className="text-center space-y-4">
            <p className="text-[0.95rem] sm:text-[1.05rem] tracking-wide leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              one command. local files. you own everything.
            </p>
            <p className="text-[0.75rem] tracking-wide" style={{ color: 'var(--text-ghost)' }}>
              free in beta
            </p>
          </div>

          <a
            href={authUrl}
            className="text-[1.05rem] sm:text-[1.15rem] tracking-wide font-medium no-underline transition-opacity hover:opacity-60"
            style={{ color: 'var(--text-primary)' }}
          >
            sign up with github
          </a>

        </div>
      </section>

    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }} />}>
      <SignupPageContent />
    </Suspense>
  );
}
