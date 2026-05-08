'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  const checkSeq = useRef(0);

  const checkKin = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) { setKinStatus('idle'); return; }
    setKinStatus('checking');
    const seq = ++checkSeq.current;
    try {
      const res = await fetch(`${SERVER_URL}/check-kin?code=${encodeURIComponent(trimmed)}`);
      if (seq !== checkSeq.current) return; // a newer check superseded this one
      if (!res.ok) { setKinStatus('idle'); return; }
      const data = await res.json() as { valid?: boolean };
      setKinStatus(data.valid ? 'valid' : 'invalid');
    } catch {
      if (seq === checkSeq.current) setKinStatus('idle');
    }
  }, []);

  // Passive debounced check while typing — for users who never press enter.
  // Set 'checking' immediately so a stale ✓/✗ from the previous code doesn't linger
  // while the user types more characters.
  useEffect(() => {
    if (!kinCode.trim()) { setKinStatus('idle'); return; }
    setKinStatus('checking');
    const t = setTimeout(() => checkKin(kinCode), 350);
    return () => clearTimeout(t);
  }, [kinCode, checkKin]);

  // Include ref unless we know it's invalid; server callback gate is the actual loop-closer.
  const ref = urlRef || (kinStatus !== 'invalid' && kinCode.trim() ? kinCode.trim() : '');
  const authParams = [ref && `ref=${encodeURIComponent(ref)}`, refSource && `ref_source=${encodeURIComponent(refSource)}`].filter(Boolean).join('&');
  const authUrl = `${SERVER_URL}/auth/github${authParams ? `?${authParams}` : ''}`;

  // Form submit (Enter or arrow click) triggers an immediate check — does NOT navigate.
  // Navigation is reserved for the "sign up with github" button so the user always sees feedback first.
  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    checkKin(kinCode);
  };

  const showSubmit = kinCode.trim().length > 0;
  const statusIcon = kinStatus === 'valid' ? ICON_CHECK : kinStatus === 'invalid' ? ICON_X : null;
  const statusClass = `kin-status ${kinStatus === 'valid' ? 'valid' : 'invalid'}`;

  return (
    <section className="cta-section">
      <a href={authUrl} className="primary-cta">sign up with github</a>
      <form onSubmit={handleConfirm} className="kin-form">
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
              aria-label="check kin code"
              hidden={!showSubmit}
            >
              {ICON_ARROW}
            </button>
          </>
        )}
      </form>
      <span className="sr-only" aria-live="polite">
        {kinStatus === 'valid' ? `kin code confirmed: ${kinCode.trim()}` : kinStatus === 'invalid' ? 'kin code not found' : ''}
      </span>
      {kinStatus === 'valid' && !urlRef && <p className="kin-feedback valid">confirmed via {kinCode.trim()}.</p>}
      {kinStatus === 'invalid' && <p className="kin-feedback invalid">not a kin we know &mdash; double-check the code, or proceed without it.</p>}
    </section>
  );
}
