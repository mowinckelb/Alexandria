'use client';
import { useState, useRef, KeyboardEvent } from 'react';
import { useTheme } from './ThemeProvider';

interface AuthScreenProps {
  onAuthSuccess: (username: string, token: string, userId: string) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
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
    <div className="h-screen flex flex-col items-center justify-center px-8 relative overflow-y-auto" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 p-6 text-center text-[0.85rem] opacity-55 z-50" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-1">
          <span>alexandria.</span>
          <span className="text-[0.75rem] italic opacity-80">immortalise the greats</span>
        </div>
      </div>

      {/* Content Section */}
      <div className="w-full max-w-[600px] mb-8 mt-24 px-4">
        <div className="space-y-6 text-[0.8rem] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <div>
            <div className="text-[0.75rem] mb-2 opacity-60" style={{ color: 'var(--text-subtle)' }}>Thesis</div>
            <ul className="space-y-1.5 list-none pl-0">
              <li>• The human brain is a biological neural net with carbon weights; AI is a digital neural net with silicon weights</li>
              <li>• If trained on enough personal data, a digital neural net can approximate any specific biological neural net</li>
              <li>• If you translate your carbon weights into silicon weights; you can digitalise & optimise your cognition</li>
            </ul>
          </div>
          
          <div>
            <div className="text-[0.75rem] mb-2 opacity-60" style={{ color: 'var(--text-subtle)' }}>Product</div>
            <ul className="space-y-1.5 list-none pl-0">
              <li>• Once you digitalise your subjective/objective data, you create a high-fidelity Personal Language Model (PLM)</li>
              <li>• This PLM enables a transition from zero-sum to positive-sum attention as it can autonomously approximate your output and synthesise pre-processed inputs; a personal function approximator</li>
              <li>• There is a structural delta between general LLMs with personal context and a PLM; while leveraged to SOTA LLMs, PLMs are specifically fine-tuned for each individual on their unique data</li>
              <li>• If something is to represent you it must know you; personalised LLMs are valuable assistants, PLMs are extensions of your cognition</li>
            </ul>
          </div>
          
          <div>
            <div className="text-[0.75rem] mb-2 opacity-60" style={{ color: 'var(--text-subtle)' }}>Market</div>
            <ul className="space-y-1.5 list-none pl-0">
              <li>• Frontier labs won't build PLMs, but individuals who want to own, monetise, and optimise their data will</li>
              <li>• It's easier to be first than best – but if you build a personal data flywheel, you can be both</li>
            </ul>
          </div>
          
          <div>
            <div className="text-[0.75rem] mb-2 opacity-60" style={{ color: 'var(--text-subtle)' }}>Execution</div>
            <ul className="space-y-1.5 list-none pl-0">
              <li>• The bottleneck to high-fidelity PLMs is the digital transcription of explicit/implicit subjective data</li>
              <li>• Once the benefits are internalised, it becomes simply an agency/friction problem</li>
            </ul>
          </div>
          
          <div>
            <div className="text-[0.75rem] mb-2 opacity-60" style={{ color: 'var(--text-subtle)' }}>Vision</div>
            <ul className="space-y-1.5 list-none pl-0">
              <li>• AI enables infinite leverage on fixed attention – but what if that attention wasn't fixed?</li>
              <li>• In an age of leveraged abundance, the opportunity cost of zero-sum attention is infinite</li>
              <li>• Positive-sum attention is all you need.</li>
            </ul>
          </div>
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

      {/* Auth Toggle */}
      <div className="relative rounded-full p-[2px] inline-flex mb-6" style={{ background: 'var(--toggle-bg)' }}>
        <button
          onClick={() => setAuthMode('login')}
          disabled={isLoading}
          className="relative z-10 bg-transparent border-none px-3.5 py-1 text-[0.75rem] transition-colors cursor-pointer"
          style={{ color: authMode === 'login' ? 'var(--text-primary)' : 'var(--text-muted)' }}
        >
          sign in
        </button>
        <button
          onClick={() => setAuthMode('register')}
          disabled={isLoading}
          className="relative z-10 bg-transparent border-none px-3.5 py-1 text-[0.75rem] transition-colors cursor-pointer"
          style={{ color: authMode === 'register' ? 'var(--text-primary)' : 'var(--text-muted)' }}
        >
          sign up
        </button>
        <div
          className={`absolute top-[2px] left-[2px] w-[calc(50%-2px)] h-[calc(100%-4px)] backdrop-blur-[10px] rounded-full shadow-sm transition-transform duration-300 ease-out ${
            authMode === 'register' ? 'translate-x-full' : ''
          }`}
          style={{ background: 'var(--toggle-pill)' }}
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
