'use client';
import { useState, useRef, KeyboardEvent } from 'react';

interface AuthScreenProps {
  onAuthSuccess: (username: string, token: string, userId: string) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
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
    <div className="h-screen flex flex-col items-center justify-center px-8 relative bg-[#fafafa] text-[#3a3a3a]">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 p-6 text-center text-[0.85rem] opacity-55 z-50 bg-[#fafafa]">
        <div className="flex flex-col items-center gap-1">
          <span>alexandria.</span>
          <span className="text-[0.75rem] italic opacity-80">immortalise the greats</span>
        </div>
      </div>

      {/* Auth Toggle */}
      <div className="relative bg-[#3a3a3a]/[0.06] rounded-full p-[2px] inline-flex mb-6">
        <button
          onClick={() => setAuthMode('login')}
          disabled={isLoading}
          className={`relative z-10 bg-transparent border-none px-3.5 py-1 text-[0.75rem] transition-colors cursor-pointer ${
            authMode === 'login' ? 'text-[#3a3a3a]' : 'text-[#888]'
          }`}
        >
          sign in
        </button>
        <button
          onClick={() => setAuthMode('register')}
          disabled={isLoading}
          className={`relative z-10 bg-transparent border-none px-3.5 py-1 text-[0.75rem] transition-colors cursor-pointer ${
            authMode === 'register' ? 'text-[#3a3a3a]' : 'text-[#888]'
          }`}
        >
          sign up
        </button>
        <div
          className={`absolute top-[2px] left-[2px] w-[calc(50%-2px)] h-[calc(100%-4px)] bg-white/55 backdrop-blur-[10px] rounded-full shadow-sm transition-transform duration-300 ease-out ${
            authMode === 'register' ? 'translate-x-full' : ''
          }`}
        />
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
          className="w-full bg-[#f4f4f4] border-none rounded-2xl text-[#3a3a3a] text-[0.9rem] px-5 py-4 mb-3 outline-none transition-colors shadow-md caret-[#3a3a3a]/40 focus:bg-[#efefef] disabled:opacity-50 placeholder:text-[#999]"
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
            className="w-full bg-[#f4f4f4] border-none rounded-2xl text-[#3a3a3a] text-[0.9rem] px-5 py-4 pr-[60px] outline-none transition-colors shadow-md caret-[#3a3a3a]/40 focus:bg-[#efefef] disabled:opacity-50 placeholder:text-[#999]"
          />
          <button
            onClick={handleAuth}
            disabled={isLoading}
            className="absolute right-4 top-1/2 -translate-y-1/2 scale-y-[0.8] bg-transparent border-none rounded-md text-[#ccc] text-[1.2rem] cursor-pointer px-2 py-1 transition-colors hover:text-[#999] focus:text-[#999] disabled:opacity-50"
          >
            →
          </button>
        </div>
      </div>

      {/* Message */}
      <div className="text-center mt-4 text-[0.8rem] text-[#888] min-h-6">
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
      `}</style>
    </div>
  );
}

