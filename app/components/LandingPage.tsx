'use client';
import { useTheme } from './ThemeProvider';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="h-screen flex flex-col items-center justify-center px-8 relative" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 p-6 text-center text-[0.85rem] opacity-55 z-50" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-1">
          <span>alexandria.</span>
          <span className="text-[0.75rem] italic opacity-80">mentes aeternae</span>
        </div>
      </div>

      {/* Theme Toggle - subtle in corner */}
      <div className="fixed top-6 right-6 z-50">
        <div className="relative rounded-full p-[1px] inline-flex" style={{ background: 'var(--toggle-bg)' }}>
          <button
            onClick={() => theme !== 'light' && toggleTheme()}
            className="relative z-10 bg-transparent border-none px-2 py-0.5 text-[0.65rem] transition-colors cursor-pointer"
            style={{ color: theme === 'light' ? 'var(--text-primary)' : 'var(--text-muted)' }}
          >
            light
          </button>
          <button
            onClick={() => theme !== 'dark' && toggleTheme()}
            className="relative z-10 bg-transparent border-none px-2 py-0.5 text-[0.65rem] transition-colors cursor-pointer"
            style={{ color: theme === 'dark' ? 'var(--text-primary)' : 'var(--text-muted)' }}
          >
            dark
          </button>
          <div
            className={`absolute top-[1px] left-[1px] w-[calc(50%-1px)] h-[calc(100%-2px)] backdrop-blur-[10px] rounded-full shadow-sm transition-transform duration-300 ease-out ${
              theme === 'dark' ? 'translate-x-full' : ''
            }`}
            style={{ background: 'var(--toggle-pill)' }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[600px] mx-auto text-center space-y-8">
        {/* Description */}
        <div className="text-[0.9rem] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <p>[abstract]</p>
        </div>

        {/* CTA Button */}
        <div className="pt-6">
          <button
            onClick={onGetStarted}
            className="bg-transparent border-none text-[0.85rem] cursor-pointer transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-primary)' }}
          >
            sign in / sign up
          </button>
        </div>
      </div>
    </div>
  );
}

