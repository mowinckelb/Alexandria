'use client';

import { useState, useCallback } from 'react';

function CopyConcreteButton({ ghost }: { ghost?: boolean }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try {
      const res = await fetch('/docs/Concrete.md');
      const text = await res.text();
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        const range = document.createRange();
        range.selectNodeContents(textarea);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        textarea.setSelectionRange(0, text.length);
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.open('/docs/Concrete.md', '_blank');
    }
  }, []);
  return (
    <button
      onClick={handleCopy}
      className="bg-transparent border-none cursor-pointer p-0 transition-opacity hover:opacity-40 inline-flex items-center gap-1.5"
      style={{ color: ghost ? 'var(--text-ghost)' : 'var(--text-primary)', fontSize: 'inherit', fontFamily: 'inherit', letterSpacing: 'inherit' }}
    >
      concrete {copied ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>}
    </button>
  );
}

type Way = 'frame' | 'pitch' | 'concrete' | 'vision' | 'abstract' | 'library';

export default function PhilosophyFiveWays({ current }: { current?: Way }) {
  const linkStyle = (way: Way) => ({
    color: current === way ? 'var(--text-ghost)' : 'var(--text-primary)',
  });
  const linkClass = "no-underline transition-opacity hover:opacity-40";

  return (
    <div className="flex flex-col gap-3 text-[0.72rem] tracking-wide">
      <span style={{ color: 'var(--text-ghost)' }}>the philosophy, six ways</span>
      <div className="flex flex-col gap-2">
        <p style={{ color: 'var(--text-muted)' }}>
          <a href="/#philosophy" className={linkClass} style={linkStyle('frame')}>frame</a>
          {' '}&mdash; two minutes
        </p>
        <p style={{ color: 'var(--text-muted)' }}>
          <a href="/join" className={linkClass} style={linkStyle('pitch')}>pitch</a>
          {' '}&mdash; one page
        </p>
        <p style={{ color: 'var(--text-muted)' }}>
          <CopyConcreteButton ghost={current === 'concrete'} />
          {' '}&mdash; one prompt
        </p>
        <p style={{ color: 'var(--text-muted)' }}>
          <a href="/vision" className={linkClass} style={linkStyle('vision')}>vision</a>
          {' '}&mdash; twenty minutes
        </p>
        <p style={{ color: 'var(--text-muted)' }}>
          <a href="/docs/abstract.pdf" target="_blank" rel="noopener noreferrer" className={linkClass} style={linkStyle('abstract')}>abstract</a>
          {' '}&mdash; one breath
        </p>
        <p style={{ color: 'var(--text-muted)' }}>
          <a href="/library" className={linkClass} style={linkStyle('library')}>library</a>
          {' '}&mdash; in action
        </p>
      </div>
    </div>
  );
}
