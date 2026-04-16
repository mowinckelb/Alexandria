'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ThemeToggle } from '../../../../components/ThemeToggle';
import { SERVER_URL } from '../../../../lib/config';

const SLIDER_MIN = 20;
const SLIDER_MAX = 200;
const SLIDER_DEFAULT = 20;

function clampAmount(value: number): number {
  return Math.min(SLIDER_MAX, Math.max(SLIDER_MIN, value));
}

function WorkCheckoutPageContent({ params }: { params: Promise<{ author: string }> }) {
  const searchParams = useSearchParams();
  const workId = searchParams.get('work_id') || '';

  const [authorId, setAuthorId] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [workTitle, setWorkTitle] = useState('');
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
          let settings: Record<string, unknown> = {};
          try { settings = JSON.parse(data.author?.settings || '{}'); } catch {}
          const paidPriceCents = typeof settings.paid_price_cents === 'number' ? settings.paid_price_cents : 0;
          if (paidPriceCents > 0) {
            const min = Math.round(paidPriceCents / 100);
            setAmount(clampAmount(min));
          }
          // Find work title
          const works = data.works || [];
          const work = works.find((w: { id: string; title: string }) => w.id === workId);
          if (work) setWorkTitle(work.title);
          setPageLoading(false);
        })
        .catch(() => setPageLoading(false));
    });
  }, [params, workId]);

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
    if (!workId) {
      setError('missing work id');
      setLoading(false);
      return;
    }
    try {
      const body: Record<string, unknown> = { work_id: workId, amount_cents: amount * 100 };
      if (promoCode) body.promo_code = promoCode;

      const res = await fetch(`${SERVER_URL}/library/${authorId}/checkout/work`, {
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
              work
            </p>
          </a>

          <p className="text-[1.3rem] font-normal tracking-tight mt-2" style={{ color: 'var(--text-primary)' }}>
            {workTitle || 'untitled'}
          </p>

          <p className="text-[0.85rem] mt-1" style={{ color: 'var(--text-ghost)' }}>
            {authorName}
          </p>

          {/* Slider */}
          <div className="mt-12 space-y-4">
            <div className="flex items-baseline justify-between">
              <p className="text-[2rem] font-light tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'inherit' }}>
                ${amount}
              </p>
            </div>

            <input
              type="range"
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step={5}
              value={amount}
              onChange={e => setAmount(clampAmount(parseInt(e.target.value, 10)))}
              className="w-full patron-slider"
            />

            <div className="flex justify-between text-[0.65rem] tracking-wide" style={{ color: 'var(--text-ghost)' }}>
              <span>${SLIDER_MIN}</span>
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
              {loading ? '...' : `${workTitle || 'work'} — $${amount}`}
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

export default function WorkCheckoutPage({ params }: { params: Promise<{ author: string }> }) {
  return (
    <Suspense
      fallback={(
        <main style={{ maxWidth: '420px', margin: '0 auto', padding: '40vh 2rem', fontFamily: 'var(--font-eb-garamond)', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-ghost)', fontSize: '0.85rem' }}>...</p>
        </main>
      )}
    >
      <WorkCheckoutPageContent params={params} />
    </Suspense>
  );
}
