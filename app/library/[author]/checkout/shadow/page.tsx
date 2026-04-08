'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '../../../../components/ThemeProvider';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'https://mcp.mowinckel.ai';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="fixed right-4 top-4 z-[200] bg-transparent border-none cursor-pointer opacity-30 hover:opacity-50 transition-opacity p-0"
      style={{ color: 'var(--text-primary)' }}
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? (
        <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1" /></svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="currentColor" /></svg>
      )}
    </button>
  );
}

const SLIDER_MIN = 2;
const SLIDER_MAX = 20;
const SLIDER_DEFAULT = 2;

export default function ShadowCheckoutPage({ params }: { params: Promise<{ author: string }> }) {
  const [authorId, setAuthorId] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [chapters, setChapters] = useState<string[]>([]);
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
          setChapters(data.shadow_chapters || []);
          const settings = JSON.parse(data.author?.settings || '{}');
          if (settings.paid_price_cents) {
            const min = Math.round(settings.paid_price_cents / 100);
            setAmount(min);
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
        setPromoStatus('invalid code');
      }
    } catch {
      setPromoStatus('invalid code');
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
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh' }}>
      <ThemeToggle />

      <section className="flex flex-col items-center px-8" style={{ paddingTop: '8rem', paddingBottom: '6rem' }}>
        <div className="max-w-[420px] w-full">

          <a href={`/library/${authorId}`} className="no-underline">
            <p className="text-[0.7rem] tracking-widest" style={{ color: 'var(--text-whisper)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              shadow
            </p>
          </a>

          <p className="text-[1.3rem] font-normal tracking-tight mt-2" style={{ color: 'var(--text-primary)' }}>
            {authorName}
          </p>

          <p className="text-[0.85rem] mt-4 leading-[1.9]" style={{ color: 'var(--text-muted)' }}>
            the full mind, published as a file. give the url to any ai and it will know this person.
          </p>

          {/* Chapter preview */}
          {chapters.length > 0 && (
            <div className="mt-8 space-y-2">
              {chapters.map((title, i) => (
                <p key={i} style={{ fontSize: '0.82rem', color: 'var(--text-ghost)', opacity: Math.max(0.4, 1 - (i * 0.07)), margin: 0 }}>
                  {title}
                </p>
              ))}
            </div>
          )}

          {/* Slider */}
          <div className="mt-12 space-y-4">
            <div className="flex items-baseline justify-between">
              <p className="text-[2rem] font-light tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'inherit' }}>
                ${amount}
              </p>
            </div>

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
            />

            <div className="flex justify-between text-[0.65rem] tracking-wide" style={{ color: 'var(--text-ghost)' }}>
              <span>$0</span>
              <span>${SLIDER_MAX}</span>
            </div>
          </div>

          {/* Promo code */}
          <div className="mt-8 flex items-center gap-3">
            <input
              type="text"
              placeholder="promo code"
              value={promoCode}
              onChange={e => { setPromoCode(e.target.value); setPromoStatus(''); }}
              onBlur={applyPromo}
              onKeyDown={e => e.key === 'Enter' && applyPromo()}
              style={{
                background: 'none', border: 'none', borderBottom: '1px solid var(--border-light)',
                color: 'var(--text-ghost)', fontSize: '0.75rem', fontFamily: 'var(--font-eb-garamond)',
                width: '120px', padding: '4px 0', outline: 'none',
              }}
            />
            {promoStatus && (
              <span style={{ fontSize: '0.68rem', color: promoStatus === 'invalid code' ? 'var(--text-whisper)' : 'var(--text-muted)' }}>
                {promoStatus}
              </span>
            )}
          </div>

          {/* Pay */}
          <div className="mt-10">
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="bg-transparent border-none cursor-pointer p-0 transition-opacity hover:opacity-60 disabled:opacity-30"
              style={{ color: 'var(--text-primary)', fontSize: '1rem', fontFamily: 'inherit', letterSpacing: '0.025em', fontWeight: 500 }}
            >
              {loading ? '...' : `${authorId}.md — $${amount}`}
            </button>
            {error && <p className="mt-3 text-[0.75rem]" style={{ color: 'var(--text-whisper)' }}>{error}</p>}
          </div>

          {/* Footer */}
          <div className="mt-16 flex gap-8">
            <a href={`/library/${authorId}`} style={{ fontSize: '0.72rem', color: 'var(--text-whisper)', textDecoration: 'none' }} className="hover:opacity-60">back</a>
            <a href="/" style={{ fontSize: '0.72rem', color: 'var(--text-whisper)', textDecoration: 'none' }} className="hover:opacity-60">alexandria.</a>
          </div>

        </div>
      </section>
    </div>
  );
}
