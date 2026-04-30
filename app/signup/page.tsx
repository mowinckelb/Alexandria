'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
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

      <section className="flex flex-col items-center justify-center px-8 min-h-screen">
        <div className="max-w-[420px] flex flex-col items-center" style={{ marginTop: '-4vh' }}>

          <Link href="/" className="no-underline">
            <p className="text-[1.3rem] sm:text-[1.5rem] font-normal leading-none tracking-tight text-center" style={{ color: 'var(--text-primary)' }}>
              alexandria.
            </p>
          </Link>

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
            {urlRef ? (
              <p className="text-center text-[0.75rem] tracking-widest" style={{ color: 'var(--text-ghost)' }}>
                via {urlRef}
              </p>
            ) : (
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
            )}
          </div>

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
