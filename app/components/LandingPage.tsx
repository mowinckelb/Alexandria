'use client';
import { useTheme } from './ThemeProvider';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div 
      className="h-screen flex flex-col items-center justify-center px-8 relative"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50" style={{ background: 'var(--bg-primary)' }}>
        <div className="max-w-[740px] mx-auto flex items-center justify-between px-5 py-5">
          <div />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center opacity-55">
            <div className="text-[0.85rem] tracking-wide">alexandria.</div>
            <div className="text-[0.7rem] italic opacity-70">mentes aeternae</div>
          </div>
          <button
            onClick={toggleTheme}
            className="bg-transparent border-none cursor-pointer opacity-25 hover:opacity-50 transition-opacity p-1"
            style={{ color: 'var(--text-primary)' }}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Center content */}
      <div className="flex flex-col items-center gap-10">
        <a
          href="/docs/Alexandria.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[0.85rem] no-underline transition-opacity hover:opacity-60 tracking-wide"
          style={{ color: 'var(--text-primary)', opacity: 0.5 }}
        >
          about
        </a>

        <button
          onClick={onGetStarted}
          className="bg-transparent border-none text-[0.85rem] cursor-pointer transition-opacity hover:opacity-60 tracking-wide py-3 px-8"
          style={{ color: 'var(--text-primary)', opacity: 0.8 }}
        >
          enter
        </button>
      </div>
    </div>
  );
}
