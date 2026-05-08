'use client';

import { useEffect, useState } from 'react';
import { SERVER_URL } from '../lib/config';

const ICON_ARROW = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const ICON_CHECK = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ICON_X = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

type KinStatus = 'idle' | 'checking' | 'valid' | 'invalid';

export default function SignupCTA({ urlRef, refSource }: { urlRef?: string; refSource?: string }) {
  const [kinCode, setKinCode] = useState('');
  const [kinStatus, setKinStatus] = useState<KinStatus>('idle');

  // Debounced kin code validation
  useEffect(() => {
    const trimmed = kinCode.trim();
    if (!trimmed) { setKinStatus('idle'); return; }
    setKinStatus('checking');
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${SERVER_URL}/check-kin?code=${encodeURIComponent(trimmed)}`, { signal: ctrl.signal });
        if (!res.ok) { setKinStatus('idle'); return; }
        const data = await res.json() as { valid?: boolean };
        setKinStatus(data.valid ? 'valid' : 'invalid');
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setKinStatus('idle');
      }
    }, 350);
    return () => { ctrl.abort(); clearTimeout(t); };
  }, [kinCode]);

  // Include ref in auth URL unless we explicitly know it's invalid; server-side gate is the actual loop-closer.
  // This handles both "user clicks before debounce fires" and "network error during check" without dropping valid refs.
  const ref = urlRef || (kinStatus !== 'invalid' && kinCode.trim() ? kinCode.trim() : '');
  const authParams = [ref && `ref=${encodeURIComponent(ref)}`, refSource && `ref_source=${encodeURIComponent(refSource)}`].filter(Boolean).join('&');
  const authUrl = `${SERVER_URL}/auth/github${authParams ? `?${authParams}` : ''}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = authUrl;
  };

  const showSubmit = kinCode.trim().length > 0;
  const statusIcon = kinStatus === 'valid' ? ICON_CHECK : kinStatus === 'invalid' ? ICON_X : null;
  const statusClass = kinStatus === 'valid' ? 'kin-status valid' : kinStatus === 'invalid' ? 'kin-status invalid' : 'kin-status';

  return (
    <section className="cta-section">
      <a href={authUrl} className="primary-cta">sign up with github</a>
      <form onSubmit={handleSubmit} className="kin-form">
        {urlRef ? (
          <p className="kin-via">via {urlRef}</p>
        ) : (
          <>
            <input
              type="text"
              value={kinCode}
              onChange={(e) => setKinCode(e.target.value)}
              placeholder="kin code"
              className="kin-input"
              autoComplete="off"
              spellCheck={false}
              aria-label="kin code"
            />
            {statusIcon && <span className={statusClass} aria-hidden>{statusIcon}</span>}
            <button
              type="submit"
              className="kin-submit"
              aria-label="continue with kin code"
              hidden={!showSubmit}
            >
              {ICON_ARROW}
            </button>
          </>
        )}
      </form>
      {kinStatus === 'invalid' && <p className="kin-warn">not a kin we know &mdash; double-check the code, or proceed without it.</p>}
    </section>
  );
}
