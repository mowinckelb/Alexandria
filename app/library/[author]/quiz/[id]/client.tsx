'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '../../../../components/ThemeProvider';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'https://mcp.mowinckel.ai';

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
        <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1" /></svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="currentColor" /></svg>
      )}
    </button>
  );
}

interface QuizData {
  quiz_id: string;
  author_id: string;
  title: string;
  subtitle?: string;
  questions: Array<{ id: string; question: string; text?: string; options: string[]; correct?: string; reveal?: string }>;
  result_tiers?: Array<{ min_pct: number; label: string; message: string }>;
  [key: string]: unknown;
}

interface QuizResult {
  score_pct: number;
  correct: number;
  total: number;
  result_slug: string;
  result_tier: { label: string; message: string };
  share_url: string;
}

export default function QuizPageClient({ params }: { params: Promise<{ author: string; id: string }> }) {
  const [authorId, setAuthorId] = useState('');
  const [quizId, setQuizId] = useState('');
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    params.then(({ author, id }) => {
      setAuthorId(author);
      setQuizId(id);
      fetch(`${SERVER_URL}/library/${author}/quiz/${id}`)
        .then(r => r.json())
        .then(d => { setQuiz(d); setLoading(false); })
        .catch(() => setLoading(false));
    });
  }, [params]);

  const skipQuestion = () => {
    if (!quiz) return;
    setSkipped(prev => new Set(prev).add(quiz.questions[currentQ].id));
    if (currentQ < quiz.questions.length - 1) {
      setCurrentQ(prev => prev + 1);
    } else {
      // last question skipped — auto-submit
      setTimeout(() => submit(), 100);
    }
  };

  const selectAnswer = (questionId: string, optionIndex: number) => {
    if (answers[questionId]) return; // already answered
    const letter = ['A', 'B', 'C', 'D'][optionIndex];
    setAnswers(prev => ({ ...prev, [questionId]: letter }));
    // auto-advance or auto-submit
    if (quiz && currentQ < quiz.questions.length - 1) {
      setTimeout(() => setCurrentQ(prev => prev + 1), 500);
    } else {
      // last question — auto-submit
      setTimeout(() => {
        submitWithAnswers({ ...answers, [questionId]: letter });
      }, 500);
    }
  };

  const submitWithAnswers = async (finalAnswers: Record<string, string>) => {
    if (!quiz || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${SERVER_URL}/library/${authorId}/quiz/${quizId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: finalAnswers, skipped: Array.from(skipped) }),
      });
      setResult(await res.json());
    } catch {
      setSubmitting(false);
    }
  };

  const submit = async () => submitWithAnswers(answers);

  const shareResult = () => {
    if (!result) return;
    navigator.clipboard.writeText(`${window.location.origin}${result.share_url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <main style={{ maxWidth: '480px', margin: '0 auto', padding: '40vh 2rem', fontFamily: 'var(--font-eb-garamond)', textAlign: 'center' }}>
      <p style={{ color: 'var(--text-ghost)', fontSize: '0.85rem' }}>...</p>
    </main>
  );

  if (!quiz || !quiz.questions?.length) return (
    <main style={{ maxWidth: '480px', margin: '0 auto', padding: '40vh 2rem', fontFamily: 'var(--font-eb-garamond)', textAlign: 'center' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>quiz not found.</p>
    </main>
  );

  // Result
  if (result) return (
    <>
      <ThemeToggle />
      <main style={{ maxWidth: '480px', margin: '0 auto', padding: '8rem 2rem 4rem', fontFamily: 'var(--font-eb-garamond)', textAlign: 'center' }}>

        <p style={{ fontSize: '3.5rem', fontWeight: 400, color: 'var(--text-primary)', margin: '0', lineHeight: 1 }}>
          {result.score_pct}%
        </p>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-ghost)', margin: '0.8rem 0 0' }}>
          {result.correct} of {result.total} aligned
        </p>

        {result.result_tier?.label && (
          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', margin: '1.5rem 0 0' }}>
            {result.result_tier.label}
          </p>
        )}

        {result.result_tier?.message && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.8, margin: '0.5rem 0 0', fontStyle: 'italic' }}>
            {result.result_tier.message}
          </p>
        )}

        <div style={{ margin: '3rem 0 0' }}>
          <a onClick={shareResult} style={{ color: 'var(--text-primary)', textDecoration: 'none', cursor: 'pointer', fontSize: '0.95rem', transition: 'opacity 0.15s' }} className="hover:opacity-60">
            {copied ? 'link copied' : 'share'}
          </a>
        </div>

        <div style={{ margin: '3rem 0 0', display: 'flex', flexDirection: 'column', gap: '1.2rem', alignItems: 'center' }}>
          <div
            onClick={(e) => {
              const el = e.currentTarget;
              el.style.animation = 'none';
              void el.offsetHeight;
              el.style.animation = 'shake 0.4s ease';
            }}
            style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', cursor: 'pointer' }}
          >
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>read the shadow</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-whisper)' }}>$</span>
          </div>
          <a href="/signup" style={{ color: 'var(--text-ghost)', textDecoration: 'none', fontSize: '0.78rem', transition: 'opacity 0.15s' }} className="hover:opacity-60">
            make your own
          </a>
          <a href="/" style={{ color: 'var(--text-whisper)', textDecoration: 'none', fontSize: '0.72rem', transition: 'opacity 0.15s' }} className="hover:opacity-60">
            alexandria.
          </a>
        </div>

      </main>
    </>
  );

  // The quiz — one question at a time
  const q = quiz.questions[currentQ];

  return (
    <>
      <ThemeToggle />
      <main style={{ maxWidth: '480px', margin: '0 auto', padding: '8rem 2rem 4rem', fontFamily: 'var(--font-eb-garamond)' }}>

        <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-whisper)', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>
          {quiz.title}
        </p>
        {quiz.subtitle && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-ghost)', margin: '0 0 3rem', fontStyle: 'italic' }}>
            {quiz.subtitle}
          </p>
        )}

        {/* the question */}
        <p style={{ fontSize: '1.1rem', color: 'var(--text-primary)', lineHeight: 1.8, margin: '0 0 2rem' }}>
          {q.question || q.text}
        </p>

        {/* options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '3rem' }}>
          {q.options.map((option, i) => {
            const letter = ['A', 'B', 'C', 'D'][i];
            const selected = answers[q.id] === letter;
            return (
              <button
                key={i}
                onClick={() => selectAnswer(q.id, i)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid transparent',
                  cursor: answers[q.id] ? 'default' : 'pointer',
                  color: selected ? 'var(--text-primary)' : answers[q.id] ? 'var(--text-whisper)' : 'var(--text-muted)',
                  fontWeight: selected ? 500 : 400,
                  fontSize: '0.95rem',
                  padding: '0.7rem 0',
                  fontFamily: 'var(--font-eb-garamond)',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
                className={answers[q.id] ? '' : 'hover:opacity-70'}
              >
                {option}
              </button>
            );
          })}
        </div>

        {/* navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            onClick={() => currentQ > 0 && setCurrentQ(prev => prev - 1)}
            style={{
              color: currentQ === 0 ? 'transparent' : 'var(--text-whisper)',
              fontSize: '0.8rem', cursor: currentQ === 0 ? 'default' : 'pointer',
              transition: 'opacity 0.15s',
            }}
            className="hover:opacity-60"
          >
            back
          </span>

          {/* progress dots */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {quiz.questions.map((_, i) => (
              <div
                key={i}
                style={{
                  width: '4px', height: '4px', borderRadius: '50%',
                  background: answers[quiz.questions[i].id] || skipped.has(quiz.questions[i].id)
                    ? 'var(--text-primary)'
                    : i === currentQ
                      ? 'var(--text-muted)'
                      : 'var(--border-light)',
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>

          <span style={{ color: 'transparent', fontSize: '0.75rem' }}>.</span>
        </div>

      </main>
    </>
  );
}
