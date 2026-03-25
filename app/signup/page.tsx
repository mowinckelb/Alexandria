'use client';

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

export default function SignupPage() {
  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh' }}>
      <ThemeToggle />

      <section className="flex flex-col items-center justify-center px-8 min-h-screen" style={{ paddingTop: '6vh' }}>
        <div className="max-w-[420px]">

          <a href="/" className="no-underline">
            <p className="text-[1.3rem] sm:text-[1.5rem] font-normal leading-none tracking-tight text-center" style={{ color: 'var(--text-primary)' }}>
              alexandria.
            </p>
          </a>

          <div className="mt-14 sm:mt-16 space-y-10 text-[0.85rem] sm:text-[0.9rem] tracking-wide">

            <div className="space-y-4 leading-[1.9]" style={{ color: 'var(--text-primary)' }}>
              <p>a gym for cognition.</p>
              <p>your ai learns who you are &mdash; not from surveillance, but from practice. you put signal in, your constitution builds itself. the more you invest, the sharper it gets.</p>
              <p>everything stays on your machine. local markdown files you own. portable, readable, yours.</p>
            </div>

            <div className="py-2">
              <a
                href="https://mcp.mowinckel.ai/auth/github"
                className="text-[1.05rem] sm:text-[1.15rem] tracking-wide font-medium no-underline transition-opacity hover:opacity-60"
                style={{ color: 'var(--text-primary)' }}
              >
                sign up with github
              </a>
            </div>

            <div className="space-y-3 leading-[1.9]" style={{ color: 'var(--text-muted)' }}>
              <p className="text-[0.75rem]">for claude code and cursor users. takes 30 seconds.</p>
              <p className="text-[0.75rem]">we&rsquo;ll email you one command to run on your laptop. that&rsquo;s it.</p>
            </div>

            <div className="pt-6 flex flex-col gap-3 text-[0.72rem] tracking-wide">
              <span style={{ color: 'var(--text-ghost)' }}>want to understand the philosophy first?</span>
              <div className="flex flex-col gap-2">
                <p style={{ color: 'var(--text-muted)' }}>
                  <a href="/#philosophy" className="no-underline transition-opacity hover:opacity-40" style={{ color: 'var(--text-primary)' }}>frame</a>
                  {' '}&mdash; the argument in two minutes
                </p>
                <p style={{ color: 'var(--text-muted)' }}>
                  <a href="/docs/Vision.pdf" target="_blank" rel="noopener noreferrer" className="no-underline transition-opacity hover:opacity-40" style={{ color: 'var(--text-primary)' }}>vision</a>
                  {' '}&mdash; the full philosophy in plain english
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      <FooterSection />
    </div>
  );
}
