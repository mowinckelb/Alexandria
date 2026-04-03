'use client';

import { useTheme } from '../components/ThemeProvider';
import FooterSection from '../components/FooterSection';
import PhilosophyFiveWays from '../components/PhilosophyFiveWays';
import SessionDemo from '../components/SessionDemo';


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

export default function JoinPage() {
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
              <p>Your ai knows what you like. It has no idea how you think.</p>
              <p>alexandria. builds one file about your mind &mdash; how you reason, where you&rsquo;re blind, what you&rsquo;re still figuring out. Markdown on your machine. Loads into every session &mdash; Claude Code, Cursor, Codex. One mind, every tool.</p>
              <p>Type <code style={{ fontSize: '0.85em', fontFamily: "'SF Mono', Monaco, Consolas, monospace" }}>/a</code> between tasks. Because it knows your edges, it brings you what you wouldn&rsquo;t find alone &mdash; the framework that reframes the problem you&rsquo;re stuck on, the counterargument you&rsquo;ve been avoiding, the connection between two things you didn&rsquo;t know were related. You learn something real every session. And because it&rsquo;s the same tool you work in, it lands in your next commit, your next decision, your next conversation.</p>
              <p>It compounds. The file gets richer. You get sharper. The gap between you and everyone else using the same model widens.</p>
              <p>One command. Free in beta. You own everything.</p>
            </div>

            {/* Demo */}
            <SessionDemo />

            {/* Action */}
            <div className="py-2">
              <a
                href="/signup"
                className="text-[1.05rem] sm:text-[1.15rem] tracking-wide font-medium no-underline transition-opacity hover:opacity-60"
                style={{ color: 'var(--text-primary)' }}
              >
                try now
              </a>
              <p className="mt-2 text-[0.65rem] tracking-wide" style={{ color: 'var(--text-ghost)' }}>
                free in beta &middot; claude code, cursor &amp; codex
              </p>
            </div>

            {/* The philosophy, five ways */}
            <div className="pt-6">
              <PhilosophyFiveWays current="pitch" />
            </div>

          </div>
        </div>
      </section>

      <FooterSection />
    </div>
  );
}
