'use client';

import { useTheme } from '../components/ThemeProvider';

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

export default function ShortcutPage() {
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

          <div className="mt-14 sm:mt-16 space-y-8 text-[0.85rem] sm:text-[0.9rem] tracking-wide leading-[1.9]" style={{ color: 'var(--text-primary)' }}>

            <p className="text-[0.95rem]">save to vault from your phone.</p>

            <div className="space-y-2">
              <p style={{ color: 'var(--text-muted)' }}>open Shortcuts on your iPhone and create a new shortcut:</p>
              <ol className="space-y-3 pl-5" style={{ color: 'var(--text-secondary)', listStyleType: 'decimal' }}>
                <li>add action: <strong>Save File</strong></li>
                <li>set destination to: <strong>iCloud Drive &rsaquo; Alexandria &rsaquo; vault</strong></li>
                <li>toggle off &ldquo;Ask Where to Save&rdquo;</li>
                <li>set input to: <strong>Shortcut Input</strong></li>
                <li>name it <strong>a.</strong></li>
                <li>enable <strong>Show in Share Sheet</strong></li>
              </ol>
            </div>

            <div style={{ color: 'var(--text-muted)' }}>
              <p>now share anything &mdash; articles, voice memos, screenshots, notes &mdash; tap <em>a.</em> and it lands in your vault.</p>
              <p className="mt-3">next time you run <em>/a</em> in claude code, it processes everything.</p>
            </div>

            <div className="pt-4">
              <p style={{ color: 'var(--text-muted)' }}>
                <strong>mac:</strong> drag files into iCloud Drive &rsaquo; Alexandria &rsaquo; vault in Finder.
              </p>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
