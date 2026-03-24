'use client';

export default function FooterSection() {
  return (
    <footer className="pb-8 pt-16 px-8 text-center">
      <div className="flex justify-center gap-4 text-[0.55rem]" style={{ color: 'var(--text-ghost)' }}>
        <a href="/privacy" className="hover:underline">Privacy</a>
        <a href="/terms" className="hover:underline">Terms</a>
      </div>
      <div className="mt-8 space-y-2">
        <p className="text-[0.6rem] italic" style={{ color: 'var(--text-ghost)' }}>
          mentes aeternae
        </p>
        <p className="text-[0.6rem]" style={{ color: 'var(--text-ghost)' }}>
          a.
        </p>
      </div>
    </footer>
  );
}
