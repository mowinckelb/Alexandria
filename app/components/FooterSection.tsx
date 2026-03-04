'use client';

export default function FooterSection() {
  return (
    <footer className="py-16 px-8 text-center space-y-3" style={{ borderTop: '1px solid var(--border-light)' }}>
      <p className="text-[0.75rem] italic" style={{ color: 'var(--text-ghost)' }}>
        mentes aeternae
      </p>
      <p className="text-[1.3rem]" style={{ color: 'var(--text-whisper)' }}>
        a.
      </p>
    </footer>
  );
}
