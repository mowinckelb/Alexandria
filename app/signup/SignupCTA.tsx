'use client';

import { useState } from 'react';
import { SERVER_URL } from '../lib/config';

const ICON_ARROW = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

export default function SignupCTA({ urlRef, refSource }: { urlRef?: string; refSource?: string }) {
  const [kinCode, setKinCode] = useState('');
  const ref = kinCode.trim() || urlRef;
  const authParams = [ref && `ref=${encodeURIComponent(ref)}`, refSource && `ref_source=${encodeURIComponent(refSource)}`].filter(Boolean).join('&');
  const authUrl = `${SERVER_URL}/auth/github${authParams ? `?${authParams}` : ''}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = authUrl;
  };

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
            <button
              type="submit"
              className="kin-submit"
              aria-label="continue with kin code"
              hidden={!kinCode.trim()}
            >
              {ICON_ARROW}
            </button>
          </>
        )}
      </form>
    </section>
  );
}
