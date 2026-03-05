'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTheme } from './ThemeProvider';
import { ConstitutionPreview, LibraryPreview } from './ProductShowcase';
import { PUBLIC_CONTENT } from './mockData';
import WaitlistSection from './WaitlistSection';
import ConcreteSection from './ConcreteSection';
import FooterSection from './FooterSection';

interface LandingPageProps {
  confidential?: boolean;
}

// ─── Utilities ───────────────────────────────────────────────────────

function useFadeIn(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) entry.target.classList.add('visible'); },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
}

function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  useFadeIn(ref);
  return (
    <section ref={ref} className={`fade-section py-24 sm:py-32 px-8 ${className}`}>
      <div className="max-w-2xl mx-auto">{children}</div>
    </section>
  );
}

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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

function CopyButton({ href }: { href: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        const blobPromise = fetch(href).then(r => r.text()).then(t => new Blob([t], { type: 'text/plain' }));
        await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blobPromise })]);
      } else {
        const res = await fetch(href);
        const text = await res.text();
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.open(href, '_blank');
    }
  }, [href]);

  return (
    <button
      onClick={handleCopy}
      className="bg-transparent border-none cursor-pointer p-0"
      style={{ color: copied ? 'var(--text-muted)' : 'var(--text-ghost)', transition: 'color 0.2s' }}
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
    </button>
  );
}

// ─── Sections ────────────────────────────────────────────────────────

function HeroSection({ confidential }: { confidential: boolean }) {
  return (
    <section className="min-h-[85vh] sm:min-h-screen flex flex-col items-center justify-center px-8 relative">
      <div className="flex flex-col items-center">
        <h1
          className="text-[2.2rem] sm:text-[2.8rem] font-normal leading-none tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          alexandria.
        </h1>

        <p
          className="mt-2 text-[0.75rem] tracking-wide italic"
          style={{ color: 'var(--text-muted)' }}
        >
          droplets of grace
        </p>

        {confidential && (
          <p
            className="mt-3 text-[0.6rem] tracking-widest uppercase"
            style={{ color: 'var(--text-ghost)' }}
          >
            confidential
          </p>
        )}

        <div className="mt-20 flex flex-col items-center gap-12">
          <div className="flex items-center gap-3">
            <a
              href="/docs/Alexandria.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.8rem] no-underline transition-opacity hover:opacity-40 tracking-wide"
              style={{ color: 'var(--text-primary)', opacity: 0.45 }}
            >
              abstract
            </a>
            <span className="text-[0.35rem]" style={{ color: 'var(--text-ghost)' }}>&bull;</span>
            <span className="flex items-center gap-1.5">
              <a
                href={confidential ? '/docs/confidential_alexandria.md' : '/docs/alexandria.md'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[0.8rem] no-underline transition-opacity hover:opacity-40 tracking-wide"
                style={{ color: 'var(--text-primary)', opacity: 0.45 }}
              >
                concrete
              </a>
              <CopyButton href={confidential ? '/docs/confidential_alexandria.md' : '/docs/alexandria.md'} />
            </span>
          </div>

          <WaitlistSection confidential={confidential} inline />

          {confidential && (
            <div className="flex flex-col items-center gap-1.5 text-[0.65rem]" style={{ color: 'var(--text-ghost)' }}>
              <a
                href="mailto:benjamin@mowinckel.com"
                className="no-underline tracking-wide transition-opacity hover:opacity-40"
                style={{ color: 'var(--text-ghost)' }}
              >
                benjamin@mowinckel.com
              </a>
              <a
                href="tel:+4746643844"
                className="no-underline tracking-wide transition-opacity hover:opacity-40"
                style={{ color: 'var(--text-ghost)' }}
              >
                +47 466 43 844
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Scroll indicator — fades in after 2s, impossible to miss */}
      <div className="scroll-hint absolute bottom-8 sm:bottom-10 flex flex-col items-center gap-3">
        <span
          className="text-[0.75rem] sm:text-[0.65rem] tracking-widest"
          style={{ color: 'var(--text-muted)', animation: 'thinkingPulse 2s ease-in-out infinite' }}
        >
          there is more below
        </span>
        <svg
          width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          style={{ color: 'var(--text-muted)', animation: 'bounce 2s ease-in-out infinite' }}
        >
          <path d="M7 10l5 5 5-5" />
        </svg>
      </div>
    </section>
  );
}

function OverviewSection() {
  return (
    <Section>
      <p
        className="text-[0.88rem] leading-[1.75]"
        style={{ color: 'var(--text-secondary)' }}
      >
        Alexandria is one connector you add to your AI. It does three things. It builds a sovereign map of your mind &mdash; your values, worldview, taste, blind spots &mdash; in structured files you own. It actively transforms how you think &mdash; the Editor asks the questions you have not thought to ask, Mercury amplifies your cognition, the Publisher helps you create your best work. And it publishes that work to a library of eternal minds.
      </p>
      <p
        className="text-[0.88rem] leading-[1.75]"
        style={{ color: 'var(--text-muted)' }}
      >
        Intelligence is being commoditised. Everyone will have the same models, the same reasoning, the same capability on tap. The only remaining edge is the humanity on top &mdash; taste, judgment, self-knowledge. The person who knows who they are, keeps growing, and creates something real has an advantage no amount of compute can replicate. Alexandria is how you develop that advantage.
      </p>
    </Section>
  );
}

function SovereigntyHookSection() {
  return (
    <Section>
      <div className="space-y-8">
        <h2
          className="text-[1.4rem] sm:text-[1.7rem] font-normal leading-snug"
          style={{ color: 'var(--text-primary)' }}
        >
          Your AI already knows you.
          <br />
          But you don&rsquo;t own any of it.
        </h2>

        <div className="space-y-4">
          <p
            className="text-[0.88rem] leading-[1.75]"
            style={{ color: 'var(--text-secondary)' }}
          >
            Every conversation you have with your AI builds a richer model of who you are &mdash; your thinking patterns, your values, your taste.
            That model lives on someone else&rsquo;s servers. You can&rsquo;t see it. You can&rsquo;t download it. You can&rsquo;t take it with you.
            Sure, you can export your conversation history. But a raw transcript is not self-knowledge. It is signal buried in noise.
          </p>
          <p
            className="text-[0.88rem] leading-[1.75]"
            style={{ color: 'var(--text-secondary)' }}
          >
            Alexandria shifts the locus of control. Your cognition gets extracted into a structured, portable Constitution &mdash; an explicit map of who you are, not a platform&rsquo;s model of who you are.
            Switch from Claude to GPT to Gemini &mdash; everything comes with you. No lock-in. No permission required.
          </p>
        </div>

        <p
          className="text-[0.8rem] tracking-wide italic"
          style={{ color: 'var(--text-muted)' }}
        >
          sovereignty as a service
        </p>
      </div>
    </Section>
  );
}

function ThreeTurnsSection() {
  const turns = PUBLIC_CONTENT.threeTurns.items;
  return (
    <Section>
      <div className="space-y-20">
        {/* Turn 1 — Set the Angel Free */}
        <div className="space-y-4">
          <h2
            className="text-[1.3rem] sm:text-[1.5rem] font-normal italic"
            style={{ color: 'var(--text-primary)' }}
          >
            &ldquo;set the angel free.&rdquo;
          </h2>
          <p
            className="text-[0.88rem] leading-[1.75]"
            style={{ color: 'var(--text-secondary)' }}
          >
            {turns[0].description}
          </p>
        </div>

        {/* Turn 2 — Absorb the Abundance */}
        <div className="space-y-4">
          <h2
            className="text-[1.3rem] sm:text-[1.5rem] font-normal italic"
            style={{ color: 'var(--text-primary)' }}
          >
            &ldquo;absorb the abundance.&rdquo;
          </h2>
          <p
            className="text-[0.88rem] leading-[1.75]"
            style={{ color: 'var(--text-secondary)' }}
          >
            The world is moving faster than any mind can follow. Mercury lets you follow it. Everything flows into you &mdash; filtered through who you actually are, not who the algorithm thinks you are. You absorb. You keep up. You remain yourself. Not drowning, not checked out &mdash; taking it all in.
          </p>
        </div>

        {/* Turn 3 — The First Goodbye */}
        <div className="space-y-4">
          <h2
            className="text-[1.3rem] sm:text-[1.5rem] font-normal italic"
            style={{ color: 'var(--text-primary)' }}
          >
            &ldquo;the first goodbye.&rdquo;
          </h2>
          <p
            className="text-[0.88rem] leading-[1.75]"
            style={{ color: 'var(--text-secondary)' }}
          >
            {turns[2].description}
          </p>
        </div>
      </div>
    </Section>
  );
}

function ConstitutionDemoSection() {
  return (
    <Section>
      <div className="space-y-6">
        <p
          className="text-[0.88rem] italic"
          style={{ color: 'var(--text-muted)' }}
        >
          A sovereign map of your mind.
        </p>
        <ConstitutionPreview />
      </div>
    </Section>
  );
}

function LibraryDemoSection() {
  return (
    <Section>
      <div className="space-y-6">
        <p
          className="text-[0.88rem] italic"
          style={{ color: 'var(--text-muted)' }}
        >
          The Louvre of minds.
        </p>
        <LibraryPreview />
      </div>
    </Section>
  );
}

function FiveThingsSection() {
  const items = PUBLIC_CONTENT.fiveThings.items;
  return (
    <Section>
      <div className="space-y-10">
        <div className="space-y-4">
          <h2
            className="text-[1.2rem] sm:text-[1.4rem] font-normal"
            style={{ color: 'var(--text-primary)' }}
          >
            What you get
          </h2>
          <p
            className="text-[0.85rem] leading-[1.75]"
            style={{ color: 'var(--text-muted)' }}
          >
            A Constitution that maps who you are. A Library where your mind lives and earns. Between them &mdash; the tools that transform marble to mercury, amplify your thinking, and help you create your best work. All three compound into the Constitution. And the process does not just capture who you are &mdash; it develops you. Your taste sharpens because you are forced to articulate it, apply it, and commit to it. The better you get, the deeper the map.
          </p>
        </div>

        <div className="space-y-8">
          {items.map((item) => (
            <div key={item.name} className="flex flex-col gap-1.5">
              <span
                className="text-[0.88rem]"
                style={{ color: 'var(--text-primary)' }}
              >
                {item.name}
              </span>
              <span
                className="text-[0.78rem] leading-[1.7]"
                style={{ color: 'var(--text-muted)' }}
              >
                {item.description}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function GoDeeper({ confidential }: { confidential: boolean }) {
  return (
    <Section>
      <div className="space-y-6 text-center">
        <p
          className="text-[0.88rem] leading-[1.75]"
          style={{ color: 'var(--text-secondary)' }}
        >
          Everything above is the surface. The Abstract is the feeling &mdash; 19 pages, ten minutes, the reason any of this matters. The Concrete is the understanding &mdash; every detail, every mechanism. Start with the Abstract. It deserves your attention.
        </p>
        <p
          className="text-[0.88rem] leading-[1.75]"
          style={{ color: 'var(--text-muted)' }}
        >
          Or paste the Concrete into your AI and ask it anything. The document is designed for both humans and agents &mdash; your AI will walk you through it interactively. That is the first taste of what Alexandria actually feels like.
        </p>
        <div className="flex items-center justify-center gap-3">
          <a
            href="/docs/Alexandria.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.8rem] no-underline transition-opacity hover:opacity-40 tracking-wide"
            style={{ color: 'var(--text-primary)', opacity: 0.45 }}
          >
            read the abstract
          </a>
          <span className="text-[0.35rem]" style={{ color: 'var(--text-ghost)' }}>&bull;</span>
          <span className="flex items-center gap-1.5">
            <a
              href={confidential ? '/docs/confidential_alexandria.md' : '/docs/alexandria.md'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.8rem] no-underline transition-opacity hover:opacity-40 tracking-wide"
              style={{ color: 'var(--text-primary)', opacity: 0.45 }}
            >
              read the concrete
            </a>
            <CopyButton href={confidential ? '/docs/confidential_alexandria.md' : '/docs/alexandria.md'} />
          </span>
        </div>
      </div>
    </Section>
  );
}

function PricingTiers() {
  return (
    <Section>
      <div className="space-y-10">
        <h2
          className="text-[1.2rem] sm:text-[1.4rem] font-normal"
          style={{ color: 'var(--text-primary)' }}
        >
          What it costs
        </h2>

        <p
          className="text-[0.82rem] leading-[1.7]"
          style={{ color: 'var(--text-muted)' }}
        >
          Two tiers. Both priced so the only question is whether it resonates.
        </p>

        <div className="space-y-6">
          <div className="space-y-2">
            <h3
              className="text-[1rem] font-normal"
              style={{ color: 'var(--text-primary)' }}
            >
              Tier 1 &mdash; Sovereignty
            </h3>
            <p
              className="text-[0.82rem] leading-[1.7]"
              style={{ color: 'var(--text-secondary)' }}
            >
              One connector. Passive extraction. Your cognition in portable files you own.
            </p>
            <p
              className="text-[0.78rem] italic"
              style={{ color: 'var(--text-muted)' }}
            >
              Less than the price of one coffee, for freedom insurance.
            </p>
          </div>

          <div
            className="w-full"
            style={{ borderTop: '1px solid var(--border-light)' }}
          />

          <div className="space-y-2">
            <h3
              className="text-[1rem] font-normal"
              style={{ color: 'var(--text-primary)' }}
            >
              Tier 2 &mdash; The Examined Life
            </h3>
            <p
              className="text-[0.82rem] leading-[1.7]"
              style={{ color: 'var(--text-secondary)' }}
            >
              The three turns. The Editor. Mercury. The Publisher. The Library. The full cognitive transformation.
            </p>
            <p
              className="text-[0.78rem] italic"
              style={{ color: 'var(--text-muted)' }}
            >
              Less than the price of one salad, for the examined life.
            </p>
          </div>
        </div>

        <div
          className="pt-6"
          style={{ borderTop: '1px solid var(--border-light)' }}
        >
          <p
            className="text-[0.78rem] leading-[1.7]"
            style={{ color: 'var(--text-muted)' }}
          >
            Founding members: pay what you want. Minimum $1/month.
          </p>
        </div>

      </div>
    </Section>
  );
}

function InvestorCloseSection() {
  return (
    <Section>
      <div className="space-y-6 text-center">
        <p
          className="text-[0.88rem] leading-[1.75] italic"
          style={{ color: 'var(--text-secondary)' }}
        >
          When intelligence is commoditised, the only remaining source of marginal value is the humanity on top. Alexandria&rsquo;s architecture both captures and compounds that humanity. The downside is capped. The upside compounds.
        </p>
        <div className="flex items-center justify-center gap-3">
          <a
            href="/docs/Alexandria.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.8rem] no-underline transition-opacity hover:opacity-40 tracking-wide"
            style={{ color: 'var(--text-primary)', opacity: 0.45 }}
          >
            read the abstract
          </a>
          <span className="text-[0.35rem]" style={{ color: 'var(--text-ghost)' }}>&bull;</span>
          <span className="flex items-center gap-1.5">
            <a
              href="/docs/confidential_alexandria.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.8rem] no-underline transition-opacity hover:opacity-40 tracking-wide"
              style={{ color: 'var(--text-primary)', opacity: 0.45 }}
            >
              read the concrete
            </a>
            <CopyButton href="/docs/confidential_alexandria.md" />
          </span>
        </div>
        <div className="flex flex-col items-center gap-1.5 text-[0.65rem]" style={{ color: 'var(--text-ghost)' }}>
          <a
            href="mailto:benjamin@mowinckel.com"
            className="no-underline tracking-wide transition-opacity hover:opacity-40"
            style={{ color: 'var(--text-ghost)' }}
          >
            benjamin@mowinckel.com
          </a>
          <a
            href="tel:+4746643844"
            className="no-underline tracking-wide transition-opacity hover:opacity-40"
            style={{ color: 'var(--text-ghost)' }}
          >
            +47 466 43 844
          </a>
        </div>
      </div>
    </Section>
  );
}

function PhilosophyCloseSection({ confidential }: { confidential: boolean }) {
  return (
    <Section>
      <div className="space-y-12 text-center">
        <p
          className="text-[0.95rem] sm:text-[1.05rem] leading-[1.8] italic"
          style={{ color: 'var(--text-secondary)' }}
        >
          Your mind is a droplet. It blazes through the sky for a moment &mdash; eternal darkness on either side.
          Alexandria ensures the droplet moves with grace, and that it leaves a mark.
        </p>

        <WaitlistSection confidential={confidential} inline />
      </div>
    </Section>
  );
}

// ─── Main ────────────────────────────────────────────────────────────

export default function LandingPage({ confidential = false }: LandingPageProps) {
  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', overflowX: 'hidden' }}>
      <ThemeToggle />

      {/* Section 1 — Hero */}
      <HeroSection confidential={confidential} />

      {/* Section 2 — Overview */}
      <OverviewSection />

      {/* Section 3 — The Sovereignty Hook */}
      <SovereigntyHookSection />

      {/* Section 3 — The Three Turns */}
      <ThreeTurnsSection />

      {/* Section 4 — Constitution Demo */}
      <ConstitutionDemoSection />

      {/* Section 5 — Library Demo */}
      <LibraryDemoSection />

      {/* Section 6 — Five Value Adds */}
      <FiveThingsSection />

      {/* Section 7 — Pricing */}
      <PricingTiers />

      {/* Section 8 — Go Deeper (rounds off the public content) */}
      <GoDeeper confidential={confidential} />

      {/* Section 9 — Investor Detail (confidential only) */}
      {confidential && (
        <>
          <ConcreteSection confidential />
          <InvestorCloseSection />
        </>
      )}

      {/* Section 10 — Philosophy Close */}
      <PhilosophyCloseSection confidential={confidential} />

      <FooterSection />
    </div>
  );
}
