'use client';
import { useState, useRef, KeyboardEvent } from 'react';
import { useTheme } from './ThemeProvider';

interface AuthScreenProps {
  onAuthSuccess: (username: string, token: string, userId: string) => void;
  onBack?: () => void;
}

export default function AuthScreen({ onAuthSuccess, onBack }: AuthScreenProps) {
  const { theme, toggleTheme } = useTheme();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleEmailKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      passwordRef.current?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAuthMode(authMode === 'login' ? 'register' : 'login');
    }
  };

  const handlePasswordKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAuth();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAuthMode(authMode === 'login' ? 'register' : 'login');
    }
  };

  const shakeInput = () => {
    const passwordInput = passwordRef.current;
    if (passwordInput) {
      passwordInput.classList.add('animate-shake');
      setTimeout(() => passwordInput.classList.remove('animate-shake'), 500);
    }
  };

  const handleAuth = async () => {
    const emailVal = email.trim().toLowerCase();
    const pass = password.trim();

    if (!emailVal || !pass) {
      setMessage('please fill in all fields');
      shakeInput();
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      if (authMode === 'register') {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailVal, password: pass })
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ detail: 'registration failed' }));
          throw new Error(error.detail || 'registration failed');
        }

        setMessage('check your email to confirm');
        setIsLoading(false);
      } else {
        await handleLogin(emailVal, pass);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'unknown error';
      setMessage(`error: ${errorMsg.toLowerCase()}`);
      setIsLoading(false);
    }
  };

  const handleLogin = async (emailVal: string, pass: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailVal, password: pass })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'login failed' }));
      throw new Error(error.detail || 'login failed');
    }

    const result = await response.json();
    
    // Call success handler with username, token, and real user_id
    onAuthSuccess(result.username, result.access_token, result.user_id);
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center px-8 relative" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50" style={{ background: 'var(--bg-primary)' }}>
        <div className="max-w-[740px] mx-auto flex items-center justify-between px-5 py-5 relative">
          {onBack ? (
            <button
              onClick={onBack}
              className="bg-transparent border-none rounded-md text-[1.2rem] cursor-pointer px-2 py-1 transition-colors disabled:opacity-50 scale-y-[0.8]"
              style={{ color: 'var(--text-whisper)' }}
              disabled={isLoading}
            >
              ←
            </button>
          ) : <div />}
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

      {/* Auth Toggle */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <button
          onClick={() => setAuthMode('login')}
          disabled={isLoading}
          className={`bg-transparent border-none text-[0.75rem] cursor-pointer transition-opacity duration-300 ${authMode === 'login' ? 'opacity-50' : 'opacity-15 hover:opacity-30'}`}
          style={{ color: 'var(--text-primary)' }}
        >
          sign in
        </button>
        <span className="text-[0.4rem]" style={{ color: 'var(--text-primary)', opacity: 0.08 }}>·</span>
        <button
          onClick={() => setAuthMode('register')}
          disabled={isLoading}
          className={`bg-transparent border-none text-[0.75rem] cursor-pointer transition-opacity duration-300 ${authMode === 'register' ? 'opacity-50' : 'opacity-15 hover:opacity-30'}`}
          style={{ color: 'var(--text-primary)' }}
        >
          sign up
        </button>
      </div>

      {/* Auth Form */}
      <div className="w-full max-w-[320px]">
        <input
          ref={emailRef}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleEmailKeyDown}
          placeholder={authMode === 'register' ? 'email' : ''}
          autoComplete="off"
          spellCheck="false"
          autoFocus
          disabled={isLoading}
          className="w-full border-none rounded-2xl text-[0.9rem] px-5 py-4 mb-3 outline-none transition-colors shadow-md disabled:opacity-50"
          style={{ 
            background: 'var(--bg-secondary)', 
            color: 'var(--text-primary)',
            caretColor: 'var(--caret-color)'
          }}
        />
        
        <div className="relative">
            <input
            ref={passwordRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handlePasswordKeyDown}
            placeholder={authMode === 'register' ? 'password' : ''}
            autoComplete="off"
            spellCheck="false"
            disabled={isLoading}
            className="w-full border-none rounded-2xl text-[0.9rem] px-5 py-4 pr-[60px] outline-none transition-colors shadow-md disabled:opacity-50"
            style={{ 
              background: 'var(--bg-secondary)', 
              color: 'var(--text-primary)',
              caretColor: 'var(--caret-color)'
            }}
          />
          <button
            onClick={handleAuth}
            disabled={isLoading}
            className="absolute right-4 top-1/2 -translate-y-1/2 scale-y-[0.8] bg-transparent border-none rounded-md text-[1.2rem] cursor-pointer px-2 py-1 transition-colors disabled:opacity-50"
            style={{ color: 'var(--text-whisper)' }}
          >
            →
          </button>
        </div>
      </div>

      {/* Message */}
      <div className="text-center mt-4 text-[0.8rem] min-h-6" style={{ color: 'var(--text-muted)' }}>
        {isLoading ? <span className="animate-pulse">thinking</span> : message}
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }

        .animate-shake {
          animation: shake 0.2s ease-in-out;
        }

        input::placeholder {
          color: var(--text-subtle);
        }

        input:focus {
          background: var(--bg-tertiary) !important;
        }

        button:hover:not(:disabled) {
          color: var(--text-muted) !important;
        }
      `}</style>
    </div>
  );
}
