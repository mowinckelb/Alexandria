'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const MONO = "'SF Mono', Monaco, Consolas, monospace";

interface Block {
  text: string;
  style: 'prompt' | 'body' | 'path' | 'diff';
  delay: number;
}

const script: Block[] = [
  { text: '> /a', style: 'prompt', delay: 300 },
  {
    text: 'Twelve entries call yourself a \u201cfirst principles thinker.\u201d But your decisions split \u2014 first principles for technical problems, authority for people decisions. Three times this month you deferred to someone\u2019s track record over your own reasoning.',
    style: 'body',
    delay: 1200,
  },
  {
    text: 'Not a contradiction. First principles is expensive. You\u2019re running an implicit cost-benefit on when to think from scratch vs when to trust.',
    style: 'body',
    delay: 2000,
  },
  { text: 'constitution/Mind.md', style: 'path', delay: 1200 },
  {
    text: 'First principles is a tool, not an identity. Deployed selectively based on stakes and reversibility.',
    style: 'diff',
    delay: 400,
  },
];

const HOLD = 3500;
const FADE = 800;

export default function SessionDemo() {
  const [visible, setVisible] = useState(0);
  const [fading, setFading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const play = useCallback(() => {
    clear();
    setVisible(0);
    setFading(false);

    let t = 0;
    script.forEach((block, i) => {
      t += block.delay;
      timers.current.push(setTimeout(() => setVisible(i + 1), t));
    });

    timers.current.push(setTimeout(() => setFading(true), t + HOLD));
    timers.current.push(setTimeout(() => play(), t + HOLD + FADE + 600));
  }, [clear]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(script.length);
      return;
    }

    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { play(); obs.disconnect(); } },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => { obs.disconnect(); clear(); };
  }, [play, clear]);

  return (
    <div
      ref={ref}
      style={{
        fontFamily: MONO,
        fontSize: '0.73rem',
        lineHeight: 1.8,
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE}ms ease`,
        minHeight: '10rem',
        padding: '1.2rem 0',
      }}
    >
      {script.map((block, i) => {
        const shown = i < visible;
        const base: React.CSSProperties = {
          opacity: shown ? 1 : 0,
          transform: shown ? 'none' : 'translateY(5px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        };

        if (block.style === 'prompt') {
          return (
            <p key={i} style={{ ...base, margin: 0, color: 'var(--text-primary)' }}>
              {block.text}
            </p>
          );
        }

        if (block.style === 'body') {
          return (
            <p key={i} style={{ ...base, margin: '0.7em 0 0', color: 'var(--text-secondary)' }}>
              {block.text}
            </p>
          );
        }

        if (block.style === 'path') {
          return (
            <p key={i} style={{ ...base, margin: '1.1em 0 0', color: 'var(--text-ghost)', fontSize: '0.68rem' }}>
              {block.text}
            </p>
          );
        }

        return (
          <p
            key={i}
            style={{
              ...base,
              margin: '0.2em 0 0',
              padding: '0.3em 0 0.3em 0.9em',
              borderLeft: '2px solid var(--border-dashed)',
              color: 'var(--text-primary)',
            }}
          >
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
