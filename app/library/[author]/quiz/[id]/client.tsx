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
  questions: Array<{ id: string; question: string; text?: string; options: string[] }>;
  result_tiers?: Array<{ min_pct: number; label: string; message: string }>;
  [key: string]: unknown; // flexible format
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

  const selectAnswer = (questionId: string, optionIndex: number) => {
    const letter = ['A', 'B', 'C', 'D'][optionIndex];
    setAnswers(prev => ({ ...prev, [questionId]: letter }));
    // Auto-advance after a beat
    if (quiz && currentQ < quiz.questions.length - 1) {
      setTimeout(() => setCurrentQ(prev => prev + 1), 400);
    }
  };

  const submit = async () => {
    if (!quiz) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${SERVER_URL}/library/${authorId}/quiz/${quizId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      setResult(await res.json());
    } catch {
      setSubmitting(false);
    }
  };

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

  // Result — the reveal
  if (result) return (
    <>
      <ThemeToggle />
      <main style={{ maxWidth: '480px', margin: '0 auto', padding: '8rem 2rem 4rem', fontFamily: 'var(--font-eb-garamond)', textAlign: 'center' }}>

        <p style={{ fontSize: '0.7rem', color: 'var(--text-whisper)', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 3rem' }}>
          {quiz.title}
        </p>

        <p style={{ fontSize: '4rem', fontWeight: 400, color: 'var(--text-primary)', margin: '0', lineHeight: 1 }}>
          {result.score_pct}%
        </p>

        {result.result_tier?.label && (
          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', margin: '1rem 0 0' }}>
            {result.result_tier.label}
          </p>
        )}

        {result.result_tier?.message && (
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.8, margin: '0.8rem 0 0', fontStyle: 'italic' }}>
            {result.result_tier.message}
          </p>
        )}

        <p style={{ fontSize: '0.78rem', color: 'var(--text-ghost)', margin: '2.5rem 0 3rem' }}>
          {result.correct} of {result.total}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
          <a onClick={shareResult} style={{ color: 'var(--text-primary)', textDecoration: 'none', cursor: 'pointer', fontSize: '0.92rem', transition: 'opacity 0.15s' }} className="hover:opacity-60">
            {copied ? 'link copied' : 'share your score'}
          </a>
          <a href={`/library/${authorId}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem', transition: 'opacity 0.15s' }} className="hover:opacity-60">
            read this mind
          </a>
        </div>

        <div style={{ margin: '4rem 0 0', display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'center' }}>
          <a href="/join" style={{ color: 'var(--text-ghost)', textDecoration: 'none', fontSize: '0.78rem', transition: 'opacity 0.15s' }} className="hover:opacity-60">
            build your own
          </a>
          <a href="/" style={{ color: 'var(--text-whisper)', textDecoration: 'none', fontSize: '0.72rem', transition: 'opacity 0.15s' }} className="hover:opacity-60">
            what is this?
          </a>
        </div>

      </main>
    </>
  );

  // The quiz — one question at a time, intimate
  const q = quiz.questions[currentQ];
  const allAnswered = quiz.questions.every(question => answers[question.id]);
  const isLast = currentQ === quiz.questions.length - 1;

  return (
    <>
      <ThemeToggle />
      <main style={{ maxWidth: '480px', margin: '0 auto', padding: '8rem 2rem 4rem', fontFamily: 'var(--font-eb-garamond)' }}>

        <p style={{ fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--text-whisper)', textTransform: 'uppercase', margin: '0 0 3rem' }}>
          {quiz.title}
        </p>

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
                  borderBottom: selected ? '1px solid var(--text-primary)' : '1px solid transparent',
                  cursor: 'pointer',
                  color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '0.95rem',
                  padding: '0.7rem 0',
                  fontFamily: 'var(--font-eb-garamond)',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
                className="hover:opacity-70"
              >
                {option}
              </button>
            );
          })}
        </div>

        {/* navigation — minimal */}
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

          {/* progress — dots not numbers */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {quiz.questions.map((_, i) => (
              <div
                key={i}
                style={{
                  width: '4px', height: '4px', borderRadius: '50%',
                  background: answers[quiz.questions[i].id]
                    ? 'var(--text-primary)'
                    : i === currentQ
                      ? 'var(--text-muted)'
                      : 'var(--border-light)',
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>

          {isLast && allAnswered ? (
            <span
              onClick={submit}
              style={{
                color: submitting ? 'var(--text-whisper)' : 'var(--text-primary)',
                fontSize: '0.8rem', cursor: submitting ? 'default' : 'pointer',
                transition: 'opacity 0.15s',
              }}
              className="hover:opacity-60"
            >
              {submitting ? '...' : 'done'}
            </span>
          ) : (
            <span style={{ color: 'transparent', fontSize: '0.8rem' }}>done</span>
          )}
        </div>

      </main>
    </>
  );
}
