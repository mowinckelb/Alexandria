'use client';

import { useTheme } from './ThemeProvider';
import FooterSection from './FooterSection';
import ScrollPhilosophy from './ScrollPhilosophy';

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

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', overflowX: 'hidden' }}>
      <ThemeToggle />

      {/* Hero — pure minimal */}
      <section className="flex flex-col items-center justify-center px-8 min-h-screen relative">
        <div className="flex flex-col items-center" style={{ marginTop: '-4vh' }}>
          <h1 className="text-[1.5rem] sm:text-[1.7rem] font-normal leading-none tracking-tight" style={{ color: 'var(--text-primary)' }}>
            alexandria.
          </h1>
          <p className="mt-1.5 text-[0.65rem] tracking-wide italic" style={{ color: 'var(--text-muted)' }}>
            droplets of grace
          </p>

          <div className="mt-14 sm:mt-16">
            <a
              href="/join"
              className="bg-transparent border-none cursor-pointer transition-opacity hover:opacity-60 no-underline cta-float"
              style={{ color: 'var(--text-primary)' }}
            >
              <span className="text-[1rem] sm:text-[1.15rem] tracking-wide font-medium">
                press here
              </span>
            </a>
          </div>

        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 scroll-hint">
          <span className="text-[0.7rem] tracking-wide" style={{ color: 'var(--text-muted)' }}>
            or keep scrolling
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', animation: 'bounce 2.5s ease-in-out infinite' }}>
            <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
          </svg>
        </div>
      </section>

      {/* The Frame — immediately after hero */}
      <section className="px-8 pt-16 sm:pt-24 pb-8">
        <div className="max-w-[520px] mx-auto flex flex-col items-center gap-6 text-center">
          <p className="text-[0.6rem] tracking-widest uppercase" style={{ color: 'var(--text-ghost)', letterSpacing: '0.2em' }}>
            the frame
          </p>
        </div>
      </section>

      <ScrollPhilosophy />

      {/* Investor — natural continuation */}
      <section className="px-8 py-20 sm:py-28">
        <div className="max-w-[520px] mx-auto flex flex-col items-center gap-6 text-center">
          <p className="text-[0.82rem] sm:text-[0.88rem] tracking-wide italic" style={{ color: 'var(--text-muted)' }}>
            believe in this?
          </p>
          <a
            href="tel:+4746643844"
            className="text-[1rem] sm:text-[1.1rem] tracking-wide font-medium no-underline transition-opacity hover:opacity-60"
            style={{ color: 'var(--text-primary)' }}
          >
            call
          </a>
          <p className="text-[0.65rem] tracking-wide" style={{ color: 'var(--text-ghost)' }}>
            if you have five minutes, call me right now.
          </p>
        </div>
      </section>

      <FooterSection />
    </div>
  );
}
