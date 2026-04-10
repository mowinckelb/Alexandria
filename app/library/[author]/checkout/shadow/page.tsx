'use client';

import { useState, useEffect } from 'react';
import { ThemeToggle } from '../../../../components/ThemeToggle';
import { SERVER_URL } from '../../../../lib/config';

const SLIDER_MIN = 2;
const SLIDER_MAX = 20;
const SLIDER_DEFAULT = 2;

export default function ShadowCheckoutPage({ params }: { params: Promise<{ author: string }> }) {
  const [authorId, setAuthorId] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [amount, setAmount] = useState(SLIDER_DEFAULT);
  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    params.then(({ author }) => {
      setAuthorId(author);
      fetch(`${SERVER_URL}/library/${author}`)
        .then(r => r.json())
        .then(data => {
          setAuthorName(data.author?.display_name || author);
          let settings: Record<string, any> = {};
          try { settings = JSON.parse(data.author?.settings || '{}'); } catch {}
          if (settings.paid_price_cents) {
            setAmount(Math.round(settings.paid_price_cents / 100));
          }
          setPageLoading(false);
        })
        .catch(() => setPageLoading(false));
    });
  }, [params]);

  const applyPromo = async () => {
    if (!promoCode) return;
    try {
      const res = await fetch(`${SERVER_URL}/library/promo/${promoCode}`);
      const data = await res.json();
      if (data.valid) {
        setPromoStatus(data.discount_pct >= 100 ? 'free access' : `${data.discount_pct}% off`);
      } else {
        setPromoStatus('invalid');
      }
    } catch {
      setPromoStatus('invalid');
    }
  };

  const handleCheckout = async () => {
    setLoading(true);
    setError('');
    try {
      const body: Record<string, unknown> = { amount_cents: amount * 100 };
      if (promoCode) body.promo_code = promoCode;
      const res = await fetch(`${SERVER_URL}/library/${authorId}/checkout/shadow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; }
      setError(data.error || 'checkout failed');
    } catch {
      setError('could not reach server');
    }
    setLoading(false);
  };

  if (pageLoading) return (
    <main style={{ maxWidth: '420px', margin: '0 auto', padding: '40vh 2rem', fontFamily: 'var(--font-eb-garamond)', textAlign: 'center' }}>
      <p style={{ color: 'var(--text-ghost)', fontSize: '0.85rem' }}>...</p>
    </main>
  );

  return (
    <>
      <ThemeToggle />
      <main style={{ maxWidth: '420px', margin: '0 auto', padding: '8rem 2rem 4rem', fontFamily: 'var(--font-eb-garamond)' }}>

        <a href={`/library/${authorId}`} style={{ textDecoration: 'none' }}>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', margin: '0 0 0.2rem' }}>{authorName}</p>
        </a>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-ghost)', margin: '0 0 3rem' }}>{authorId}-paid.md</p>

        {/* Amount */}
        <p style={{ fontSize: '2.5rem', fontWeight: 300, color: 'var(--text-primary)', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
          ${amount}
        </p>

        <input
          type="range"
          min={0}
          max={SLIDER_MAX}
          step={1}
          value={amount}
          onChange={e => {
            const v = parseInt(e.target.value, 10);
            setAmount(v < SLIDER_MIN ? SLIDER_MIN : v);
          }}
          className="w-full patron-slider"
          style={{ margin: '0 0 0.3rem' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-ghost)' }}>
          <span>$0</span>
          <span>${SLIDER_MAX}</span>
        </div>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-ghost)', margin: '0.5rem 0 0' }}>pay what you want. most of it goes to the author.</p>

        {/* Promo */}
        <div style={{ margin: '2rem 0 0', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <input
            type="text"
            placeholder="promo code"
            value={promoCode}
            onChange={e => { setPromoCode(e.target.value); setPromoStatus(''); }}
            onBlur={applyPromo}
            onKeyDown={e => e.key === 'Enter' && applyPromo()}
            style={{
              background: 'none', border: 'none', borderBottom: '1px solid var(--border-light)',
              color: 'var(--text-ghost)', fontSize: '0.72rem', fontFamily: 'var(--font-eb-garamond)',
              width: '100px', padding: '4px 0', outline: 'none',
            }}
          />
          {promoStatus && (
            <span style={{ fontSize: '0.65rem', color: promoStatus === 'invalid' ? 'var(--text-whisper)' : 'var(--text-muted)' }}>
              {promoStatus}
            </span>
          )}
        </div>

        {/* Pay */}
        <div style={{ margin: '2.5rem 0 0' }}>
          <span
            onClick={loading ? undefined : handleCheckout}
            style={{ fontSize: '0.95rem', color: 'var(--text-primary)', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.3 : 1, transition: 'opacity 0.15s' }}
            className="hover:opacity-60"
          >
            {loading ? '...' : `${authorId}-paid.md — $${amount}`}
          </span>
          {error && <p style={{ fontSize: '0.72rem', color: 'var(--text-whisper)', margin: '0.8rem 0 0' }}>{error}</p>}
        </div>

        {/* Footer */}
        <div style={{ margin: '4rem 0 0', display: 'flex', gap: '1.5rem' }}>
          <a href={`/library/${authorId}`} style={{ fontSize: '0.72rem', color: 'var(--text-whisper)', textDecoration: 'none' }} className="hover:opacity-60">back</a>
          <a href="/" style={{ fontSize: '0.72rem', color: 'var(--text-whisper)', textDecoration: 'none' }} className="hover:opacity-60">alexandria.</a>
        </div>

      </main>
    </>
  );
}
