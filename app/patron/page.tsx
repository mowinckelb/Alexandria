'use client';

import { useState } from 'react';
import { useTheme } from '../components/ThemeProvider';
import FooterSection from '../components/FooterSection';

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
        <svg width="10" height="10" viewBox="0 0 10 10">
          <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 10 10">
          <circle cx="5" cy="5" r="4" fill="currentColor" />
        </svg>
      )}
    </button>
  );
}

const SLIDER_MIN = 5;
const SLIDER_MAX = 200;
const SLIDER_DEFAULT = 20;

export default function PatronPage() {
  const [amount, setAmount] = useState(SLIDER_DEFAULT);

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(parseInt(e.target.value, 10));
  };

  const handlePatron = () => {
    // TODO: Replace with Stripe payment link or checkout session URL.
    // Recurring monthly. Pass amount as parameter.
    const url = `https://buy.stripe.com/placeholder?amount=${amount}`;
    window.open(url, '_blank');
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
              className="bg-transparent border-none cursor-pointer p-0 transition-opacity hover:opacity-60"
              style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontFamily: 'inherit', letterSpacing: '0.025em', fontWeight: 500 }}
            >
              become a patron &mdash; ${amount}/mo
            </button>

          </div>
        </div>
      </section>

      <FooterSection />
    </div>
  );
}
