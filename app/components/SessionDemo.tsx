'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const MONO = "'SF Mono', Monaco, Consolas, monospace";

interface Block {
  prefix?: string;
  text: string;
  style: 'prompt' | 'engine' | 'path' | 'diff';
  delay: number;
  typing?: boolean;
}

const script: Block[] = [
  { prefix: '> ', text: '/a', style: 'prompt', delay: 400, typing: true },
  {
    text: 'Something shifted in your vault. Three months ago \u2014 rough edges, contradictions, half-formed ideas, sentences that trail off. Last few weeks \u2014 everything\u2019s clean. Polished. Resolved.',
    style: 'engine',
    delay: 2000,
  },
  {
    prefix: '> ',
    text: 'isn\u2019t that... better?',
    style: 'prompt',
    delay: 4500,
    typing: true,
  },
  {
    text: 'It\u2019s smoother. But the rough edges were where you were actually thinking. The recent entries read like you already knew the answer before you started writing.',
    style: 'engine',
    delay: 2000,
  },
  {
    prefix: '> ',
    text: 'yeah. i\u2019ve been letting ai draft more and more',
    style: 'prompt',
    delay: 5000,
    typing: true,
  },
  {
    text: 'Keats had a term for what you\u2019re losing \u2014 \u201cnegative capability.\u201d The ability to stay in uncertainty without reaching for resolution. Your early vault is full of it. Questions you hold without answering. Tensions you let breathe. The recent entries resolve everything by the second sentence.',
    style: 'engine',
    delay: 2000,
  },
  {
    text: 'You don\u2019t feel yourself getting less original. You feel yourself getting more efficient. But those are different muscles \u2014 and you\u2019re only training one.',
    style: 'engine',
    delay: 7000,
  },
  {
    prefix: '> ',
    text: 'so what do i do',
    style: 'prompt',
    delay: 5000,
    typing: true,
  },
  {
    text: 'You don\u2019t stop using ai. You protect the space where you think without it. That\u2019s what this is.',
    style: 'engine',
    delay: 2000,
  },
  { text: 'constitution/Mind.md', style: 'path', delay: 4000 },
  {
    text: 'Currently over-resolving \u2014 reaching for answers before sitting with questions. When this person brings a tension, don\u2019t resolve it. Ask another question. Let ideas stay half-formed longer. Rough edges are signal, not noise.',
    style: 'diff',
    delay: 400,
  },
  {
    prefix: '> ',
    text: '...huh. ok i have a meeting. a.',
    style: 'prompt',
    delay: 6000,
    typing: true,
  },
  {
    text: 'See you. Left a thread in notepad: Keats\u2019 letter to his brothers, 1817. The negative capability passage. Worth a slow read.',
    style: 'engine',
    delay: 2000,
  },
];

const HOLD = 5000;
const FADE = 800;

export default function SessionDemo() {
  const [visible, setVisible] = useState(0);
  const [typed, setTyped] = useState<Record<number, number>>({});
  const [typingIdx, setTypingIdx] = useState(-1);
  const [fading, setFading] = useState(false);
  const runId = useRef(0);

  const play = useCallback(async () => {
    const id = ++runId.current;

    const w = (ms: number) =>
      new Promise<void>((resolve, reject) =>
        setTimeout(() => (runId.current === id ? resolve() : reject()), ms),
      );

    try {
      while (runId.current === id) {
        setFading(false);
        setVisible(0);
        setTyped({});
        setTypingIdx(-1);

        for (let i = 0; i < script.length; i++) {
          const block = script[i];
          await w(block.delay);
          setVisible(i + 1);

          if (block.typing) {
            setTypingIdx(i);
            setTyped(prev => ({ ...prev, [i]: 0 }));
            for (let c = 1; c <= block.text.length; c++) {
              await w(25 + Math.random() * 25);
              setTyped(prev => ({ ...prev, [i]: c }));
            }
            setTypingIdx(-1);
          }
        }

        await w(HOLD);
        setFading(true);
        await w(FADE + 400);
      }
    } catch {
      /* cancelled */
    }
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(script.length);
      const all: Record<number, number> = {};
      script.forEach((b, i) => { if (b.typing) all[i] = b.text.length; });
      setTyped(all);
      return;
    }

    play();
    return () => { ++runId.current; };
  }, [play]);

  const renderBlock = (block: Block, i: number) => {
    const chars = typed[i] ?? (block.typing ? 0 : block.text.length);
    const isTyping = typingIdx === i;
    const text = block.typing ? block.text.slice(0, chars) : block.text;

    switch (block.style) {
      case 'prompt':
        return (
          <p key={i} className="demo-block" style={{ color: 'var(--text-primary)', marginTop: i > 0 ? '0.6em' : 0 }}>
            <span style={{ color: 'var(--text-ghost)' }}>{block.prefix}</span>
            {text}
            {isTyping && <span className="demo-cursor" />}
          </p>
        );
      case 'engine':
        return (
          <p key={i} className="demo-block" style={{ color: 'var(--text-secondary)', marginTop: '0.6em' }}>
            {text}
          </p>
        );
      case 'path':
        return (
          <p key={i} className="demo-block" style={{ color: 'var(--text-ghost)', marginTop: '0.9em', fontSize: '0.68rem' }}>
            {text}
          </p>
        );
      case 'diff':
        return (
          <p
            key={i}
            className="demo-block"
            style={{
              color: 'var(--text-primary)',
              marginTop: '0.15em',
              paddingLeft: '0.9em',
              paddingTop: '0.2em',
              paddingBottom: '0.2em',
              borderLeft: '2px solid var(--border-dashed)',
            }}
          >
            {text}
          </p>
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        height: '18rem',
        overflow: 'hidden',
        position: 'relative',
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE}ms ease`,
      }}
    >
      {/* Top fade */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2rem',
        background: 'linear-gradient(to bottom, var(--bg-primary), transparent)',
        zIndex: 1, pointerEvents: 'none',
      }} />
      {/* Bottom fade */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '2.5rem',
        background: 'linear-gradient(to top, var(--bg-primary), transparent)',
        zIndex: 1, pointerEvents: 'none',
      }} />
      {/* Content — flex-end anchors to bottom, overflow clips at top */}
      <div style={{
        fontFamily: MONO,
        fontSize: '0.73rem',
        lineHeight: 1.8,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '2rem 0',
      }}>
        {script.slice(0, visible).map((block, i) => renderBlock(block, i))}
      </div>
    </div>
  );
}
