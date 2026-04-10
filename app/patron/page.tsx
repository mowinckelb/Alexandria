'use client';

import { useState } from 'react';
import { ThemeToggle } from '../components/ThemeToggle';
import FooterSection from '../components/FooterSection';

const SLIDER_MIN = 5;
const SLIDER_MAX = 200;
const SLIDER_DEFAULT = 20;

export default function PatronPage() {
  const [amount, setAmount] = useState(SLIDER_DEFAULT);

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(parseInt(e.target.value, 10));
  };

  const [loading, setLoading] = useState(false);

  const handlePatron = async () => {
    setLoading(true);
    const res = await fetch('/api/patron', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
    setLoading(false);
  };

  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh' }}>
      <ThemeToggle />

      <section className="flex flex-col items-center justify-center px-8 min-h-screen">
        <div className="max-w-[420px] w-full">

          <a href="/" className="no-underline">
            <p className="text-[1.3rem] sm:text-[1.5rem] font-normal leading-none tracking-tight text-center" style={{ color: 'var(--text-primary)' }}>
              alexandria.
            </p>
          </a>

          <div className="mt-14 sm:mt-16 space-y-10 text-[0.85rem] sm:text-[0.9rem] tracking-wide">

            <div className="space-y-4 leading-[1.9]" style={{ color: 'var(--text-primary)' }}>
              <p>Not donating&nbsp;&mdash; joining. Patron support keeps the founder building full-time in San Francisco while the product finds its footing.</p>
              <p className="text-[0.78rem]" style={{ color: 'var(--text-muted)' }}>The beta is live for Claude Code and Cursor users. Patrons are first in line when it opens to everyone.</p>
            </div>

            {/* Slider */}
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <p className="text-[2rem] sm:text-[2.4rem] font-light tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'inherit' }}>
                  ${amount}
                </p>
                <span className="text-[0.72rem] tracking-wide" style={{ color: 'var(--text-ghost)' }}>/month</span>
              </div>

              <input
                type="range"
                min={SLIDER_MIN}
                max={SLIDER_MAX}
                step={5}
                value={amount}
                onChange={handleSlider}
                className="w-full patron-slider"
              />

              <div className="flex justify-between text-[0.65rem] tracking-wide" style={{ color: 'var(--text-ghost)' }}>
                <span>${SLIDER_MIN}</span>
                <span>${SLIDER_MAX}</span>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handlePatron}
              disabled={loading}
              className="bg-transparent border-none cursor-pointer p-0 transition-opacity hover:opacity-60 disabled:opacity-30"
              style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontFamily: 'inherit', letterSpacing: '0.025em', fontWeight: 500 }}
            >
              {loading ? '...' : `become a patron \u2014 $${amount}/mo`}
            </button>

          </div>
        </div>
      </section>

      <FooterSection />
    </div>
  );
}
