'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SERVER_URL } from '../lib/config';

const AMOUNT_MIN = 0;
const AMOUNT_MAX = 200;
const AMOUNT_DEFAULT = 0;

const INK = '#1a1318';
const PAPER = '#f7f2ec';
const INK_MUTED = 'rgba(26, 19, 24, 0.55)';
const INK_FAINT = 'rgba(26, 19, 24, 0.32)';
const RULE = 'rgba(26, 19, 24, 0.20)';

export default function FollowForm({ initialDone }: { initialDone: boolean }) {
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState(AMOUNT_DEFAULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const [done, setDone] = useState(initialDone);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setShakeKey((k) => k + 1);
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

  if (done) {
    return (
      <main className="follow-root">
        <Link href="/" className="nav-brand" aria-label="alexandria">
          <em>alexandria</em>
          <span className="nav-dot">.</span>
        </Link>
        <div className="done-mark" aria-hidden>
          <em>a.</em>
        </div>
        <style jsx>{styles}</style>
      </main>
    );
  }

  const isHonourary = amount > 0;

  return (
    <main className="follow-root">
      <Link href="/" className="nav-brand" aria-label="alexandria">
        <em>alexandria</em>
        <span className="nav-dot">.</span>
      </Link>

      <section className="form-wrap">
        <div className="form">

          <label className="field">
            <input
              key={shakeKey}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              data-follow-shake={shakeKey > 0 ? 'on' : 'off'}
              placeholder="email"
              autoComplete="email"
              spellCheck={false}
              aria-label="email"
            />
          </label>

          <div className="amount-block">
            <div className="amount-line">
              <span className="amount-value">${amount}</span>
              <span className="amount-unit">{amount === 0 ? '' : '/ month'}</span>
            </div>
            <input
              type="range"
              min={AMOUNT_MIN}
              max={AMOUNT_MAX}
              step={5}
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value, 10))}
              className="slider"
              aria-label="monthly amount"
            />
            <div className="tier-row" aria-live="polite">
              <span className={`tier ${isHonourary ? 'is-dim' : 'is-on'}`}>
                <em>follower of alexandria.</em>
              </span>
              <span className={`tier tier-right ${isHonourary ? 'is-on' : 'is-dim'}`}>
                <em>honourary alexandrian.</em>
              </span>
            </div>
            <div className="hint-row" aria-hidden>
              <span className="hint" data-mute={amount >= 45 ? 'on' : 'off'}>
                <em>avg. honourary &mdash; $45 / month</em>
              </span>
            </div>
          </div>

          <p className="caption">
            pay what you want &mdash; or just follow for free.
          </p>

          <div className="cta-row">
            {error ? <span className="error">{error}</span> : null}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="cta"
            >
              {loading ? '…' : 'follow.'}
            </button>
          </div>

        </div>
      </section>

      <span className="watermark" aria-hidden><em>a.</em></span>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  :global(html), :global(body) {
    background: ${PAPER};
  }

  .follow-root {
    position: relative;
    min-height: 100vh;
    min-height: 100dvh;
    background: ${PAPER};
    color: ${INK};
    font-family: var(--font-eb-garamond), Georgia, 'Times New Roman', serif;
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
  }

  .nav-brand {
    position: fixed;
    top: 22px;
    left: clamp(24px, 6vw, 120px);
    z-index: 10;
    font-style: italic;
    font-weight: 500;
    font-size: 28px;
    line-height: 1;
    color: ${INK};
    text-decoration: none;
    letter-spacing: -0.01em;
    display: inline-flex;
    align-items: baseline;
    transition: opacity 200ms ease;
  }
  .nav-brand:hover { opacity: 0.7; }
  .nav-brand :global(em) { font-style: italic; }
  .nav-brand .nav-dot {
    font-style: normal;
    display: inline-block;
    animation: dotBreathe 3.2s ease-in-out infinite;
  }
  @keyframes dotBreathe {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.42; }
  }

  .form-wrap {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 96px clamp(24px, 6vw, 80px);
  }
  .form {
    width: 100%;
    max-width: 540px;
    display: flex;
    flex-direction: column;
    gap: 56px;
  }

  .field input {
    width: 100%;
    background: transparent;
    border: none;
    border-bottom: 1px solid ${RULE};
    border-radius: 0;
    outline: none;
    color: ${INK};
    font-family: inherit;
    font-size: 22px;
    line-height: 1.4;
    padding: 10px 0;
    letter-spacing: -0.005em;
    transition: border-color 200ms ease;
  }
  .field input::placeholder {
    color: ${INK_FAINT};
    font-style: italic;
  }
  .field input:focus {
    border-bottom-color: ${INK};
  }
  .field input[data-follow-shake="on"] {
    animation: follow-shake 320ms ease-in-out;
  }
  @keyframes follow-shake {
    0%, 100%   { transform: translateX(0);    border-bottom-color: ${RULE}; }
    25%        { transform: translateX(-3px); border-bottom-color: #b3261e; }
    75%        { transform: translateX(3px);  border-bottom-color: #b3261e; }
  }

  .amount-block {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .amount-line {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .amount-value {
    font-size: 38px;
    line-height: 1;
    font-weight: 400;
    letter-spacing: -0.015em;
  }
  .amount-unit {
    font-size: 14px;
    font-style: italic;
    color: ${INK_MUTED};
    letter-spacing: 0.02em;
  }

  .slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 1px;
    background: ${RULE};
    outline: none;
    cursor: pointer;
    margin: 4px 0 2px;
  }
  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: ${INK};
    cursor: pointer;
    transition: transform 160ms ease;
  }
  .slider::-webkit-slider-thumb:hover { transform: scale(1.18); }
  .slider:focus-visible::-webkit-slider-thumb {
    box-shadow: 0 0 0 4px rgba(26, 19, 24, 0.18);
  }
  .slider::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: ${INK};
    border: none;
    cursor: pointer;
  }
  .slider:focus-visible::-moz-range-thumb {
    box-shadow: 0 0 0 4px rgba(26, 19, 24, 0.18);
  }

  .tier-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    font-size: 14px;
    letter-spacing: 0.015em;
  }
  .tier {
    transition: color 320ms ease, opacity 320ms ease;
  }
  .tier-right { text-align: right; }
  .tier.is-on  { color: ${INK};       opacity: 1;    }
  .tier.is-dim { color: ${INK_MUTED}; opacity: 0.42; }

  .hint-row {
    display: flex;
    justify-content: flex-end;
    margin-top: 6px;
    font-size: 12px;
    letter-spacing: 0.02em;
  }
  .hint {
    color: ${INK_MUTED};
    opacity: 0.55;
    transition: opacity 320ms ease;
  }
  .hint[data-mute="on"] { opacity: 0.18; }

  .caption {
    margin: 0;
    font-size: 14px;
    line-height: 1.55;
    color: ${INK_MUTED};
    letter-spacing: 0.005em;
    text-align: center;
    font-style: italic;
  }

  .cta-row {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 18px;
    min-height: 28px;
  }
  .error {
    font-size: 13px;
    font-style: italic;
    color: ${INK_MUTED};
  }
  .cta {
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    font-family: inherit;
    font-size: 22px;
    color: ${INK};
    letter-spacing: -0.005em;
    transition: opacity 200ms ease;
  }
  .cta:hover:not(:disabled) { opacity: 0.62; }
  .cta:disabled { opacity: 0.32; cursor: default; }
  .cta:focus { outline: none; }
  .cta:focus-visible {
    outline: none;
    text-decoration: underline;
    text-underline-offset: 6px;
    text-decoration-thickness: 1px;
  }

  .watermark {
    position: fixed;
    bottom: 22px;
    right: clamp(24px, 6vw, 120px);
    z-index: 10;
    font-size: 22px;
    font-style: italic;
    color: ${INK};
    pointer-events: none;
  }
  .watermark :global(em) { font-style: italic; }

  .done-mark {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 64px;
    font-style: italic;
    color: ${INK};
    letter-spacing: -0.02em;
  }
  .done-mark :global(em) { font-style: italic; }

  @media (max-width: 600px) {
    .nav-brand { font-size: 24px; top: 18px; left: 22px; }
    .watermark { font-size: 20px; bottom: 18px; right: 22px; }
    .form { gap: 48px; }
    .field input { font-size: 20px; }
    .amount-value { font-size: 32px; }
    .cta { font-size: 20px; }
    .done-mark { font-size: 52px; }
  }
`;
