'use client';
import { useState, useRef, KeyboardEvent, FormEvent } from 'react';

interface AuthScreenProps {
  onAuthSuccess: (userId: string, token: string) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleUsernameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
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
    const user = username.trim().toLowerCase();
    const pass = password.trim();

    if (!user || !pass) {
      setMessage('please fill in all fields');
      shakeInput();
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      if (authMode === 'register') {
        // TODO: Replace with actual registration endpoint
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user, password: pass })
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ detail: 'registration failed' }));
          throw new Error(error.detail || 'registration failed');
        }

        // Auto-login after registration
        await handleLogin(user, pass);
      } else {
        await handleLogin(user, pass);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'unknown error';
      setMessage(`error: ${errorMsg.toLowerCase()}`);
      setIsLoading(false);
    }
  };

  const handleLogin = async (user: string, pass: string) => {
    try {
      // TODO: Replace with actual login endpoint
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user, password: pass })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'login failed' }));
        throw new Error(error.detail || 'login failed');
      }

      const result = await response.json();
      
      // Store auth data
      localStorage.setItem('alexandria_token', result.access_token);
      localStorage.setItem('alexandria_user_id', user);
      
      // Call success handler
      onAuthSuccess(user, result.access_token);
    } catch (error) {
      throw error;
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center px-8 relative bg-[#fafafa]">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 p-6 text-center text-[0.85rem] opacity-55 z-50 bg-[#fafafa]">
        <div className="flex flex-col items-center gap-1">
          <span>alexandria</span>
          <span className="text-[0.85rem] italic opacity-80">Immortalise the Greats</span>
        </div>
      </div>

      {/* Auth Toggle */}
      <div className="relative bg-black/[0.06] rounded-xl p-[2px] inline-flex mb-6">
        <button
          onClick={() => setAuthMode('login')}
          disabled={isLoading}
          className={`relative z-10 bg-transparent border-none px-4 py-1 text-[0.85rem] transition-colors cursor-pointer ${
            authMode === 'login' ? 'text-[#1a1a1a]' : 'text-[#666]'
          }`}
        >
          sign in
        </button>
        <button
          onClick={() => setAuthMode('register')}
          disabled={isLoading}
          className={`relative z-10 bg-transparent border-none px-4 py-1 text-[0.85rem] transition-colors cursor-pointer ${
            authMode === 'register' ? 'text-[#1a1a1a]' : 'text-[#666]'
          }`}
        >
          sign up
        </button>
        <div
          className={`absolute top-[2px] left-[2px] w-[calc(50%-2px)] h-[calc(100%-4px)] bg-white/55 backdrop-blur-[10px] rounded-[10px] shadow-sm transition-transform duration-300 ease-out ${
            authMode === 'register' ? 'translate-x-full' : ''
          }`}
        />
      </div>

      {/* Auth Form */}
      <div className="w-full max-w-[360px]">
        <input
          ref={usernameRef}
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={handleUsernameKeyDown}
          placeholder=""
          autoComplete="off"
          spellCheck="false"
          disabled={isLoading}
          className="w-full bg-[#f0f0f0] border-none rounded-xl text-[#1a1a1a] text-[1.05rem] px-[18px] py-[14px] mb-3 outline-none transition-colors shadow-sm caret-[#1a1a1a]/40 focus:bg-[#e8e8e8] disabled:opacity-50"
        />
        
        <div className="relative mb-3">
          <input
            ref={passwordRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handlePasswordKeyDown}
            placeholder=""
            autoComplete="off"
            spellCheck="false"
            disabled={isLoading}
            className="w-full bg-[#f0f0f0] border-none rounded-xl text-[#1a1a1a] text-[1.05rem] px-[18px] py-[14px] pr-[50px] outline-none transition-colors shadow-sm caret-[#1a1a1a]/40 focus:bg-[#e8e8e8] disabled:opacity-50"
          />
          <button
            onClick={handleAuth}
            disabled={isLoading}
            className="absolute right-[14px] top-1/2 -translate-y-1/2 scale-y-[0.8] bg-transparent border-none rounded-md text-[#ccc] text-[1rem] cursor-pointer px-2 py-1 transition-colors hover:text-[#999] focus:text-[#999] focus:shadow-[0_0_0_2px_rgba(0,0,0,0.1)] disabled:opacity-50"
          >
            →
          </button>
        </div>
      </div>

      {/* Message */}
      <div className="text-center mt-4 text-[0.95rem] text-[#666] min-h-6">
        {message}
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

        input::-webkit-input-placeholder {
          color: #999;
        }

        @supports (caret-width: 2px) {
          input {
            caret-width: 2px;
          }
        }
      `}</style>
    </div>
  );
}

