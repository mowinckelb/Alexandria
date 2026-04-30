'use client';

import { useEffect, useState } from 'react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  // Theme is resolved on the client (localStorage + matchMedia), so the
  // first render must not commit to an icon — otherwise SSR and CSR
  // disagree and React logs a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <button
      onClick={toggleTheme}
      className="fixed right-4 top-4 z-[200] bg-transparent border-none cursor-pointer opacity-30 hover:opacity-50 transition-opacity p-0"
      style={{ color: 'var(--text-primary)' }}
      aria-label={mounted ? (theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode') : 'Switch theme'}
      suppressHydrationWarning
    >
      <svg width="10" height="10" viewBox="0 0 10 10" suppressHydrationWarning>
        {mounted && theme === 'dark' ? (
          <circle cx="5" cy="5" r="4" fill="currentColor" />
        ) : (
          <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1" />
        )}
      </svg>
    </button>
  );
}
