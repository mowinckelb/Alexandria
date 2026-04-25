'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

interface Props {
  brandClassName?: string;
}

/*
 * Structurally a carbon copy of fleetai.com. Only the words change.
 *
 * Layer stack (fixed position, peel-scroll like Fleet):
 *   1. .nav                 — fixed top over everything
 *   2. .top-slide           — fixed hero (cream bg, H1, orb cluster, prose card)
 *   3. .bottom-slide        — fixed colophon, revealed as top peels up
 *   4. .runway              — 200vh spacer so scroll drives the peel
 *
 * Bottom slide rotates: background color, ornamental mark, text polarity.
 */

/*
 * Theme variants for the bottom slide. Each theme pairs a generated
 * ornamental "a." image with the exact page background it was produced on,
 * so the image blends seamlessly into the slide. Foreground colors are
 * tuned so nav / wordmark / dict stay readable.
 */
type Theme = {
  id: string;
  image: string;
  bg: string;
  fg: string;
  fgMuted: string;
  fgFaint: string;
  borderSoft: string;
};

/*
 * Palette coordination: for each variant, fg pulls from the ornament's
 * dominant pigment (deep wax blue, mosaic navy, terracotta umber, jade
 * forest, muscle rose, etc.) rather than generic ink. Muted + faint are
 * softer descendants of the same family. This makes the wordmark and dict
 * read as part of the same artifact rather than text pasted on top.
 */
const THEMES: Theme[] = [
  {
    // Blue wax seal on paper — pull deep navy from the wax into the text.
    id: 'wax-circle',
    image: '/ornaments/wax-circle.png',
    bg: '#f7f2ec',
    fg: '#0e1a4c',
    fgMuted: '#4a5080',
    fgFaint: '#8288a8',
    borderSoft: 'rgba(14,26,76,0.18)',
  },
  {
    // Cross-stitch on cobalt — pure white thread on cobalt ground.
    id: 'cross-stitch',
    image: '/ornaments/cross-stitch.png',
    bg: '#00198a',
    fg: '#ffffff',
    fgMuted: '#c8d0f4',
    fgFaint: '#8a96d4',
    borderSoft: 'rgba(255,255,255,0.22)',
  },
  {
    // Quarry-hewn marble — warm stone ink, nothing fluorescent.
    id: 'marble-incise',
    image: '/ornaments/marble-incise.png',
    bg: '#dcdfd8',
    fg: '#1f1a14',
    fgMuted: '#6a5f52',
    fgFaint: '#958e80',
    borderSoft: 'rgba(31,26,20,0.16)',
  },
  {
    // Pale marble relief — same stone family, slightly warmer.
    id: 'marble-relief',
    image: '/ornaments/marble-relief.png',
    bg: '#efeae4',
    fg: '#1f1a14',
    fgMuted: '#6a5f52',
    fgFaint: '#958e80',
    borderSoft: 'rgba(31,26,20,0.16)',
  },
  {
    // Burl wood with brass inlay — text stays cream for legibility;
    // muted leans brass so the palette reads as polished wood.
    id: 'burl-wood',
    image: '/ornaments/burl-wood.png',
    bg: '#3a1d0c',
    fg: '#f0e0c0',
    fgMuted: '#c8a668',
    fgFaint: '#8a7050',
    borderSoft: 'rgba(240,224,192,0.22)',
  },
  {
    // Hand-forged iron — warm cream with tan muted (rust highlights).
    id: 'wrought-iron',
    image: '/ornaments/wrought-iron.png',
    bg: '#26262a',
    fg: '#e0d8c8',
    fgMuted: '#a8947c',
    fgFaint: '#6e6454',
    borderSoft: 'rgba(224,216,200,0.18)',
  },
  {
    // Roman mosaic — navy tesserae against parchment; palette = navy.
    id: 'roman-mosaic',
    image: '/ornaments/roman-mosaic.png',
    bg: '#dcc7a8',
    fg: '#1c2869',
    fgMuted: '#4e5a8a',
    fgFaint: '#8a94a8',
    borderSoft: 'rgba(28,40,105,0.2)',
  },
  {
    // Hand-painted faience — majolica blue on cream.
    id: 'faience',
    image: '/ornaments/faience.png',
    bg: '#d5cec0',
    fg: '#1c2869',
    fgMuted: '#4e5a8a',
    fgFaint: '#7a84a0',
    borderSoft: 'rgba(28,40,105,0.22)',
  },
  {
    // Tooled leather — warm amber cream on near-black.
    id: 'leather-tool',
    image: '/ornaments/leather-tool.png',
    bg: '#20100a',
    fg: '#e4cca0',
    fgMuted: '#a88868',
    fgFaint: '#6e5a44',
    borderSoft: 'rgba(228,204,160,0.2)',
  },
  {
    // Verdigris bronze — cream text with bronze muted tones.
    id: 'verdigris',
    image: '/ornaments/verdigris.png',
    bg: '#62615f',
    fg: '#f0e6d0',
    fgMuted: '#b89878',
    fgFaint: '#8a7058',
    borderSoft: 'rgba(240,230,208,0.2)',
  },
  {
    // Greek red-figure terracotta — deep umber from the painted figures.
    id: 'greek-shard',
    image: '/ornaments/greek-shard.png',
    bg: '#e18558',
    fg: '#2a1008',
    fgMuted: '#6a3020',
    fgFaint: '#964a34',
    borderSoft: 'rgba(42,16,8,0.26)',
  },
  {
    // Roman bronze tablet — near-black with ruby muted (echoing the gem).
    id: 'roman-bronze',
    image: '/ornaments/roman-bronze.png',
    bg: '#a77a18',
    fg: '#1a1006',
    fgMuted: '#6a1a10',
    fgFaint: '#8a4a20',
    borderSoft: 'rgba(26,16,6,0.26)',
  },
  {
    // Jade and gold circuitry — deep forest with gold muted (the wire).
    id: 'jade-circuit',
    image: '/ornaments/jade-circuit.png',
    bg: '#71d795',
    fg: '#0e2412',
    fgMuted: '#4a6a18',
    fgFaint: '#6a8a3a',
    borderSoft: 'rgba(14,36,18,0.24)',
  },
  {
    // Alexandrian limestone with projected gold light — dark ochre text.
    id: 'light-stone',
    image: '/ornaments/light-stone.png',
    bg: '#f5ede2',
    fg: '#2a2014',
    fgMuted: '#7a6240',
    fgFaint: '#9e8a68',
    borderSoft: 'rgba(42,32,20,0.18)',
  },
  {
    // Egyptian alabaster — umber, warm and Ptolemaic.
    id: 'alabaster',
    image: '/ornaments/alabaster.png',
    bg: '#d6cab8',
    fg: '#3a2a1a',
    fgMuted: '#7a6a50',
    fgFaint: '#a09680',
    borderSoft: 'rgba(58,42,26,0.18)',
  },
  {
    // Optical computing chip — translucent block with amber light traces.
    // Bg matches the cool gray-blue chip body; amber pulled into muted.
    id: 'optical-chip',
    image: '/ornaments/optical-chip.png',
    bg: '#acb6c6',
    fg: '#1a1822',
    fgMuted: '#8a5a10',
    fgFaint: '#6a6478',
    borderSoft: 'rgba(26,24,34,0.2)',
  },
  {
    // Ptolemaic faience — vibrant cyan glaze tile with navy hand-painted a.
    // The whole slide becomes the glaze.
    id: 'ptolemaic-faience',
    image: '/ornaments/ptolemaic-faience.png',
    bg: '#2d8a98',
    fg: '#0e1a4c',
    fgMuted: '#08305a',
    fgFaint: '#1a4a74',
    borderSoft: 'rgba(14,26,76,0.28)',
  },
  {
    // Chrome typography on a cool pale glass pool — timeless quantum feel.
    id: 'chrome-glass',
    image: '/ornaments/chrome-glass.png',
    bg: '#c9d0e2',
    fg: '#1a1c2a',
    fgMuted: '#5a5e74',
    fgFaint: '#8a8ea0',
    borderSoft: 'rgba(26,28,42,0.2)',
  },
];

export default function LandingPageDraft({ brandClassName = '' }: Props) {
  const [themeIdx, setThemeIdx] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // Randomize theme on first client render.
  useEffect(() => {
    setThemeIdx(Math.floor(Math.random() * THEMES.length));
  }, []);

  // Peel mechanic — top slide translates up as user scrolls; revealing bottom.
  useEffect(() => {
    let frame = 0;
    const peelDistance =
      typeof window !== 'undefined' ? window.innerHeight : 900;

    const onScroll = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, peelDistance);
        const progress = y / peelDistance;
        if (topRef.current) {
          topRef.current.style.transform = `translate3d(0, ${-y}px, 0)`;
          topRef.current.style.setProperty(
            '--peel-shadow',
            `0 ${16 + progress * 60}px ${40 + progress * 60}px -20px rgba(26,19,24,${
              0.04 + progress * 0.14
            })`,
          );
        }
        // Nav stays fixed; color phase flips once the top is mostly peeled.
        if (navRef.current) {
          navRef.current.classList.toggle('on-bottom', progress > 0.5);
        }
        // Cycle theme once the bottom is fully revealed and user scrolls back up past threshold.
        if (progress >= 0.98 || progress <= 0.02) {
          // stable — do nothing
        }
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Every time the top slide fully covers the bottom again (scrollY → 0 after
  // having been deep), pick a fresh theme — mirrors Fleet's per-visit change.
  useEffect(() => {
    let wasRevealed = false;
    const onScroll = () => {
      const y = window.scrollY;
      const h = window.innerHeight;
      if (y > h * 0.6) wasRevealed = true;
      if (y < h * 0.05 && wasRevealed) {
        wasRevealed = false;
        setThemeIdx((i) => {
          let next = Math.floor(Math.random() * THEMES.length);
          while (next === i && THEMES.length > 1) {
            next = Math.floor(Math.random() * THEMES.length);
          }
          return next;
        });
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const theme = THEMES[themeIdx];
  return (
    <div className="draft-root" data-theme={theme.id}>
      {/* ═════ PERSISTENT NAV — fixed over both slides. Colors switch at
             the peel midpoint so it stays readable on top (cream) and on
             any bottom-slide theme. ═════ */}
      <nav className="nav" ref={navRef} aria-label="Primary">
        <div className="nav-inner">
          <Link href="/" className={`nav-brand ${brandClassName}`}>
            alexandria<span className="nav-dot">.</span>
          </Link>
          <div className="nav-links">
            <Link href="/vision">Vision</Link>
            <Link href="/blueprint">Blueprint</Link>
            <Link href="/library">Library</Link>
            <Link href="/join" className="nav-cta">try now</Link>
          </div>
        </div>
      </nav>

      {/* ═════ TOP SLIDE ═════
           Three blocks. Everything conversion-critical.
             H1    → the tribe pitch (locked public headline, from a4)
             lede  → mechanic + cost in one read
             CTAs  → the action moment
           Form is content: typography does the work. The italic rhythm
           carries the "voice inside your head" register. Whitespace
           is the only ornament. */}
      <div className="top-slide" ref={topRef}>
        <div className="top-inner">
          {/* Three-line H1. Italic-normal-italic rhythm with the tribal
              line tinted in the house burgundy — the identity carries
              colour; the act is plain ink; the purpose returns to italic.
              Form is content: the first line is who we are, second is what
              we do, third is why it matters. */}
          <h1 className="hero-h1">
            <span className="hero-tribe">A tribe of humans</span>
            <br />
            who put their minds into writing,
            <br />
            <em>so ai thinks with them, not for them.</em>
          </h1>

          {/* Manifesto body. Fleuron separates the stance from the
              civilisational closer — an old-book ornament earning its
              place as a rhetorical beat, not a decoration. */}
          <div className="manifesto">
            <p>
              We have decided ai will not replace our thinking &mdash; it
              will <em>augment</em>{' '}it. Together we find the optimal
              systems for putting our minds into a medium ai can read. Your
              data &mdash; <em>sovereign, model-agnostic, optimised</em>
              {' '}&mdash; lets ai apply its intelligence to your mind, and
              you ride with ai through the singularity.
            </p>
            <span className="fleuron" aria-hidden>
              ❦
            </span>
            <p className="manifesto-close">
              <em>
                Evolutionary pressure renders human thought extinct unless
                we proactively apply natural law in our favour.
              </em>
            </p>
          </div>

          <div className="cta-row">
            <Link href="/join" className="cta cta-primary">
              try now
            </Link>
            <Link href="/follow" className="cta cta-ghost">
              follow along
            </Link>
          </div>
        </div>
      </div>

      {/* ═════ BOTTOM SLIDE — Fleet colophon, theme rotates ═════ */}
      <section className="bottom-slide" aria-label="Colophon">
        <div className="bottom-inner">
          {/* Upper band — Fleet anchors:
                LEFT  : wordmark TOP, ornament BOTTOM (space-between)
                RIGHT : statement
              The wordmark dominates the slide; the ornament tucks
              into the empty corner like a maker's mark. */}
          <div className="upper">
            <div className="upper-left">
              <div className="wordmark-block">
                <h2 className="big-word">
                  alexandria<span className="big-word-dot">.</span>
                </h2>
                <p className="dict-line">
                  <em>n.</em>{' '}
                  <a href="/vision">
                    The vanished library of antiquity
                  </a>{' '}
                  &mdash; rebuilt in markdown, one Author at a time.
                </p>
              </div>

              <div className="ornament-wrap">
                <Ornament src={theme.image} id={theme.id} />
              </div>
            </div>

            {/* Statement — six numbered beats + one unnumbered dagger.
                I. stakes · II. root node · III. mechanism · IV. product ·
                V. collective · VI. signature · ❦ · dagger. Roman numerals
                live in the margin; the fleuron separates the argument
                from the call to action. */}
            <div className="statement">
              <p>
                AGI is inevitable. You can ignore it &mdash; and get
                replaced. You can let it think for you &mdash; and get
                replaced. Or you can let it think with you &mdash; and
                keep thinking, <em>think better</em>.
              </p>

              <p>
                How you think is the <em>root node</em>. Thoughts become
                decisions, decisions become behaviours, behaviours become
                outcomes.
              </p>

              <p>
                But ai can&rsquo;t read your mind. It reads words. So you
                must transcribe your inner theatre &mdash; think out
                loud, however you want, over time. ai augments your
                thinking with what you write &mdash; the more you write,
                the more there is to multiply. You learn yourself; ai
                learns you. Your thinking is the point; ai is the
                multiplier.
              </p>

              <p>
                Everyone using ai ends up with a personal file and a
                system for building it. The file is the output. You are
                the input. The system is the process &mdash; the{' '}
                <em>mental gym</em>. Alexandria maintains the floor of
                that gym full-time: always current, designed to be
                personalised. The optimal thing a stranger can give you.
                Take it, make it yours.
              </p>

              <p>
                We also open the collective &mdash; everyone&rsquo;s
                systems, plus whatever files they choose to publish. All
                in service of your own file. Your file stays yours; we
                never see it. Pure marginal value. Free. No one else is
                deliberately doing this &mdash; we&rsquo;re neutral,
                public, open, determined to become the{' '}
                <em>global protocol</em>.
              </p>

              <p>
                This is the <em>protocol for human thought</em>. The{' '}
                <em>thinking republic</em> &mdash; humans tilting
                evolutionary pressure in our favour, so human thought
                survives and thrives.
              </p>

              <div className="statement-fleuron" aria-hidden>
                ❦
              </div>

              <p className="statement-close">
                If you don&rsquo;t agree, fine. But agreeing and not
                acting is just low agency &mdash; and low agency gets
                replaced too. Click <em>try now</em>, sign up, start
                your file. Five minutes, free. Every thought stays;
                every session compounds. <em>Keep thinking.</em>
              </p>
            </div>
          </div>

          {/* Middle band — three branches, full width.
              Plain Fleet-style links, no descriptive italics. The
              statement does the persuading; these are just doors. */}
          <div className="cols-band">
            <div className="upper-cols">
              <div className="col">
                <span className="col-head">Begin</span>
                <Link href="/join" className="col-primary">try now</Link>
                <Link href="/follow">follow along</Link>
                <a href="tel:+14155038178">call the founder</a>
                <a href="/docs/abstract.pdf">Abstract (PDF)</a>
              </div>
              <div className="col">
                <span className="col-head">Read</span>
                <Link href="/vision">Vision</Link>
                <a href="/docs/concrete.md">Concrete</a>
                <Link href="/library">Library</Link>
                <Link href="/blueprint">Blueprint</Link>
              </div>
              <div className="col">
                <span className="col-head">Build</span>
                <a
                  href="https://github.com/mowinckelb/Alexandria"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
                <a href="/docs/trust.md">trust.md</a>
                <Link href="/canon">Canon</Link>
                <a
                  href="https://mcp.mowinckel.ai/health"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Status
                </a>
              </div>
            </div>
          </div>

          {/* Lower band — colophon footer.
              LEFT empty.  CENTER motto (replacing the status pill).
              RIGHT the legal row, then copyright, then founder line. */}
          <div className="lower">
            <span className="motto-center" aria-hidden>
              <em>Keep thinking.</em>
            </span>

            <span className="copyright">
              <span className="legal-row">
                <a
                  href="https://x.com/benmowinckel"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  X
                </a>
                <span className="sep">·</span>
                <a
                  href="https://linkedin.com/in/mowinckel"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  LinkedIn
                </a>
                <span className="sep">·</span>
                <Link href="/terms">Terms</Link>
                <span className="sep">·</span>
                <Link href="/privacy">Privacy</Link>
              </span>
              <span className="footer-line">2026, written in SF.</span>
              <span className="founder-line">
                Benjamin Mowinckel{' '}
                <span className="sep">·</span>{' '}
                <a href="mailto:benjamin@mowinckel.com">
                  benjamin@mowinckel.com
                </a>
              </span>
            </span>
          </div>
        </div>
      </section>

      {/* Runway gives scroll range for the peel */}
      <div className="runway" aria-hidden />

      <style jsx>{`
        :global(body) {
          background: ${theme.bg};
          transition: background 400ms ease;
        }

        .draft-root {
          position: relative;
          min-height: 100vh;
          font-family: var(--font-serif), ui-serif, Georgia, serif;
          color: ${theme.fg};
          -webkit-font-smoothing: antialiased;
        }

        .runway {
          height: 200vh;
        }

        /* ─── NAV ─── */
        /* Persistent nav — fixed over both slides. Lives above the peel
           animation. Colors default to dark (for the cream top slide);
           flip to the active theme fg when .on-bottom is set via JS
           once peel progress crosses the midpoint. */
        .nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          padding: 28px 40px;
          pointer-events: none;
        }
        .nav-inner {
          max-width: 1440px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          pointer-events: auto;
        }
        /* Default = "top" phase (cream slide, dark ink) */
        :global(.nav .nav-brand) {
          color: #1a1318;
          transition: color 320ms ease;
        }
        :global(.nav .nav-brand .nav-dot) {
          color: #1a1318;
          transition: color 320ms ease;
        }
        .nav-links :global(a) {
          color: rgba(26, 19, 24, 0.6);
          transition: color 320ms ease;
        }
        .nav-links :global(a):hover {
          color: #1a1318;
        }
        .nav-links :global(a sup) {
          color: rgba(26, 19, 24, 0.38);
          transition: color 320ms ease;
        }
        /* Bottom phase — swap to theme fg once peel crosses midpoint */
        .nav.on-bottom :global(.nav-brand),
        .nav.on-bottom :global(.nav-brand .nav-dot) {
          color: ${theme.fg};
        }
        .nav.on-bottom .nav-links :global(a) {
          color: ${theme.fgMuted};
        }
        .nav.on-bottom .nav-links :global(a):hover {
          color: ${theme.fg};
        }
        .nav.on-bottom .nav-links :global(a sup) {
          color: ${theme.fgFaint};
        }

        :global(.nav-brand) {
          font-family: inherit;
          font-style: italic;
          font-weight: 500;
          font-size: 32px;
          line-height: 1;
          text-decoration: none;
          letter-spacing: -0.01em;
          display: inline-flex;
          align-items: baseline;
          transition: opacity 200ms ease;
        }
        :global(.nav-brand) .nav-dot {
          font-style: normal;
        }
        :global(.nav-brand):hover {
          opacity: 0.72;
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 36px;
        }
        .nav-links :global(a) {
          font-family: inherit;
          font-size: 16px;
          font-weight: 400;
          text-decoration: none;
          transition: color 180ms ease;
        }
        .nav-links :global(a sup) {
          font-size: 0.6em;
          margin-left: 1px;
          font-variant-numeric: lining-nums;
        }

        /* ─── TOP SLIDE (the peel layer) ─── */
        /* Top slide never scrolls — everything fits in the viewport. */
        .top-slide {
          position: fixed;
          inset: 0;
          z-index: 20;
          background: #f3eee3;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(60px, 7vh, 88px) 32px clamp(20px, 3vh, 32px);
          overflow: hidden;
          will-change: transform;
          box-shadow: var(--peel-shadow, 0 0 0 rgba(0, 0, 0, 0));
          color: #1a1318;
        }
        .top-inner {
          width: 100%;
          max-width: 980px;
          max-height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: clamp(22px, 3.2vh, 36px);
        }

        /* H1 — three lines, three jobs.
           Tribal line: italic, house burgundy, a hair of tracking.
           Middle line: roman, plain ink (the matter-of-fact act).
           Closing line: italic, plain ink (the purpose, the turn).
           The burgundy tint carries the identity colour through from
           the CTA; the roman middle is the anchor; the italics frame. */
        .hero-h1 {
          font-family: var(--font-serif), ui-serif, Georgia, serif;
          font-weight: 400;
          font-style: normal;
          font-size: clamp(30px, 3.9vw, 52px);
          line-height: 1.1;
          letter-spacing: -0.014em;
          color: #1a1318;
          text-align: center;
          margin: 0;
          max-width: 980px;
        }
        .hero-h1 em {
          font-style: italic;
        }
        .hero-tribe {
          font-style: italic;
          color: #3a0f3d;
          letter-spacing: 0.002em;
        }

        /* Manifesto — prose + fleuron + italic closer. The fleuron is
           the rhetorical beat between stance and civilisational claim,
           not decoration. Old book discipline. */
        .manifesto {
          font-family: var(--font-serif), ui-serif, Georgia, serif;
          color: #2a1f28;
          text-align: center;
          max-width: 640px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: clamp(10px, 1.4vh, 18px);
        }
        .manifesto p {
          margin: 0;
          font-size: clamp(15.5px, 1.3vw, 18px);
          line-height: 1.5;
        }
        .manifesto em {
          font-style: italic;
          color: #1a1318;
        }
        .fleuron {
          font-family: var(--font-serif), ui-serif, Georgia, serif;
          font-size: clamp(13px, 1.1vw, 15px);
          color: rgba(58, 15, 61, 0.55);
          line-height: 1;
          user-select: none;
          letter-spacing: 0.1em;
        }
        .manifesto-close {
          font-style: italic;
          color: #1a1318;
          font-size: clamp(14.5px, 1.2vw, 17px) !important;
          letter-spacing: 0.002em;
          max-width: 560px;
          margin: 0 auto !important;
        }
        .manifesto-close em {
          font-style: italic;
        }

        /* Nav CTA — pill that swaps to theme colors when on bottom. */
        .nav-links :global(.nav-cta) {
          color: #f4efe2;
          background: #3a0f3d;
          padding: 7px 16px;
          border-radius: 999px;
          font-weight: 500;
          transition:
            background 320ms ease,
            color 320ms ease;
        }
        .nav-links :global(.nav-cta):hover {
          background: #6b2259;
          color: #f4efe2;
        }
        .nav.on-bottom .nav-links :global(.nav-cta) {
          color: ${theme.bg};
          background: ${theme.fg};
        }
        .nav.on-bottom .nav-links :global(.nav-cta):hover {
          color: ${theme.bg};
          opacity: 0.85;
        }

        /* CTA row — the conversion pair under the prose card. */
        /* Two CTAs. Sized for the eye to see them as the action moment. */
        .cta-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .cta-row :global(a.cta) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 13px 28px;
          border-radius: 10px;
          text-decoration: none;
          font-family: var(--font-serif), ui-serif, Georgia, serif;
          font-size: 17px;
          font-weight: 500;
          letter-spacing: 0.003em;
          transition:
            transform 160ms ease,
            background 180ms ease,
            border-color 180ms ease;
        }
        .cta-row :global(a.cta-primary) {
          background: #3a0f3d;
          color: #f4efe2;
          box-shadow:
            0 1px 0 rgba(58, 15, 61, 0.2),
            0 10px 26px -8px rgba(58, 15, 61, 0.35);
        }
        .cta-row :global(a.cta-primary:hover) {
          background: #6b2259;
          transform: translateY(-1px);
        }
        .cta-row :global(a.cta-ghost) {
          background: transparent;
          color: #1a1318;
          border: 1px solid rgba(26, 19, 24, 0.28);
        }
        .cta-row :global(a.cta-ghost:hover) {
          border-color: rgba(26, 19, 24, 0.55);
          background: rgba(26, 19, 24, 0.03);
        }

        /* ─── BOTTOM SLIDE ─── */
        /* Three bands. Upper: ornament + statement. Middle: columns.
           Lower: wordmark + status + copyright. Never scrolls. */
        .bottom-slide {
          position: fixed;
          inset: 0;
          z-index: 10;
          background: ${theme.bg};
          color: ${theme.fg};
          overflow: hidden;
          padding: clamp(52px, 7vh, 72px) 48px 14px;
          display: flex;
          flex-direction: column;
          transition: background 400ms ease, color 400ms ease;
        }
        .bottom-inner {
          max-width: 1440px;
          margin: 0 auto;
          width: 100%;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: clamp(10px, 1.8vh, 18px);
          min-height: 0;
        }

        /* UPPER BAND — big ornament | statement column
           The ornament returns to its proper size. The statement takes
           the full vertical column to the right, freed from having the
           three branch columns beside it. */
        .upper {
          display: grid;
          grid-template-columns: clamp(280px, 30vh, 360px) 1fr;
          gap: clamp(32px, 4vw, 56px);
          align-items: start;
          padding-top: 2px;
        }
        .ornament-wrap {
          display: flex;
          align-items: flex-start;
          justify-content: flex-start;
          padding-top: clamp(0px, 1vh, 8px);
        }
        .upper-right {
          max-width: 720px;
          padding-top: 2px;
        }

        /* Statement — 6 numbered paragraphs + 1 unnumbered dagger.
           Roman numerals live in the margin, scarlet-muted. The dagger
           is separated by a fleuron, not a border — an old-book device
           earning its place. Form IS the content here. */
        .statement {
          counter-reset: beat;
          max-width: 640px;
          margin: 0;
          padding-left: clamp(20px, 1.8vw, 30px);
          display: flex;
          flex-direction: column;
          gap: clamp(6px, 0.9vh, 11px);
        }
        .statement p {
          font-family: var(--font-serif), ui-serif, Georgia, serif;
          font-size: clamp(12.5px, 1.65vh, 14.8px);
          line-height: 1.48;
          color: ${theme.fg};
          margin: 0;
          position: relative;
          hanging-punctuation: first last;
        }
        .statement em {
          font-style: italic;
        }
        /* Roman numerals on the six numbered beats. Absolute positioned
           into the left margin so the prose column stays clean. */
        .statement > p:not(.statement-close) {
          counter-increment: beat;
        }
        .statement > p:not(.statement-close)::before {
          content: counter(beat, upper-roman) ".";
          position: absolute;
          left: clamp(-30px, -1.8vw, -20px);
          top: 0.06em;
          font-size: 0.72em;
          font-style: italic;
          letter-spacing: 0.06em;
          color: ${theme.fgFaint};
          font-variant-numeric: lining-nums;
        }
        /* Fleuron before the dagger — a proper rhetorical pause.
           Lives centered in its own row, so the dagger reads as
           something apart from the argument that preceded it. */
        .statement-fleuron {
          font-family: var(--font-serif), ui-serif, Georgia, serif;
          font-size: 0.95em;
          color: ${theme.fgFaint};
          text-align: center;
          margin: clamp(2px, 0.4vh, 6px) auto clamp(2px, 0.4vh, 4px);
          letter-spacing: 0.14em;
          user-select: none;
          line-height: 1;
          padding-right: clamp(20px, 1.8vw, 30px);
        }
        .statement-close {
          font-style: italic;
          letter-spacing: 0.003em;
        }
        .statement-close em {
          font-style: italic;
          color: ${theme.fg};
        }

        /* MIDDLE BAND — three branch columns, full-width.
           Freed from the statement, these can breathe horizontally. */
        .cols-band {
          padding: 0 clamp(4px, 1vw, 12px);
        }
        .upper-cols {
          display: grid;
          grid-template-columns: repeat(3, minmax(180px, 1fr));
          gap: clamp(28px, 4vw, 56px);
          max-width: 1040px;
          margin: 0 auto;
        }
        .col {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .col-head {
          font-family: var(--font-serif), ui-serif, Georgia, serif;
          font-style: italic;
          font-size: 11.5px;
          color: ${theme.fgFaint};
          margin-bottom: 3px;
          font-weight: 400;
          letter-spacing: 0.08em;
          text-transform: lowercase;
        }
        .col :global(a) {
          font-family: var(--font-serif), ui-serif, Georgia, serif;
          font-size: 12.5px;
          color: ${theme.fg};
          text-decoration: none;
          line-height: 1.24;
          transition: color 150ms ease;
        }
        .col :global(a em) {
          font-style: italic;
          color: ${theme.fgMuted};
          font-size: 10.5px;
          margin-left: 1px;
        }
        .col :global(a):hover {
          opacity: 0.72;
        }
        .col :global(a.col-primary) {
          color: ${theme.fg};
          font-weight: 500;
          text-decoration: underline;
          text-decoration-color: ${theme.borderSoft};
          text-underline-offset: 3px;
        }

        /* LOWER BAND — wordmark + one-line dict | status | copyright */
        .lower {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: end;
          gap: 40px;
          padding-bottom: 6px;
        }
        .wordmark-block {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-width: 560px;
        }
        .big-word {
          font-family: var(--font-serif), ui-serif, Georgia, serif;
          font-weight: 400;
          font-style: normal;
          font-size: clamp(40px, 5.4vw, 76px);
          line-height: 0.9;
          letter-spacing: -0.022em;
          color: ${theme.fg};
          margin: 0 0 2px;
          white-space: nowrap;
        }
        .big-word-dot {
          font-style: normal;
          color: ${theme.fg};
          margin-left: -0.04em;
        }
        .dict-line {
          font-family: var(--font-serif), ui-serif, Georgia, serif;
          font-size: 12.5px;
          line-height: 1.44;
          color: ${theme.fg};
          margin: 0;
        }
        .dict-line em {
          font-style: italic;
          color: ${theme.fgFaint};
          margin-right: 2px;
        }
        .dict-line :global(a) {
          color: ${theme.fg};
          text-decoration: underline;
          text-decoration-color: ${theme.borderSoft};
          text-underline-offset: 2px;
          transition: text-decoration-color 180ms ease;
        }
        .dict-line :global(a):hover {
          text-decoration-color: ${theme.fg};
        }

        .status {
          font-family: var(--font-serif), ui-serif, Georgia, serif;
          font-size: 13px;
          color: ${theme.fgMuted};
          text-decoration: none;
          justify-self: center;
          padding-bottom: 4px;
        }
        .status:hover {
          color: ${theme.fg};
        }
        .copyright {
          font-family: var(--font-serif), ui-serif, Georgia, serif;
          font-size: 12.5px;
          color: ${theme.fgMuted};
          justify-self: end;
          padding-bottom: 4px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
          text-align: right;
        }
        .legal-row {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .legal-row :global(a) {
          color: ${theme.fgMuted};
          text-decoration: none;
        }
        .legal-row :global(a):hover {
          color: ${theme.fg};
        }
        .legal-row .sep {
          color: ${theme.fgFaint};
        }
        /* Motto sign-off — italic, slightly brighter than muted. The
           two-word anti-WALL-E, tucked into the bottom bar where it
           closes the page like a sign-off on a letter. */
        .copyright .motto {
          font-style: italic;
          color: ${theme.fg};
        }

        /* ─── RESPONSIVE ─── */
        @media (max-width: 900px) {
          .upper {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .ornament-wrap {
            justify-content: center;
          }
          .statement {
            margin-bottom: 40px;
          }
          .upper-cols {
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }
          .lower {
            grid-template-columns: 1fr;
            gap: 20px;
            text-align: left;
          }
          .status,
          .copyright {
            justify-self: start;
          }
          .big-word {
            font-size: clamp(60px, 16vw, 96px);
          }
        }

        @media (max-width: 680px) {
          .nav {
            padding: 18px 18px;
          }
          :global(.nav-brand) {
            font-size: 24px;
          }
          .nav-links {
            gap: 16px;
          }
          .nav-links :global(a) {
            font-size: 13px;
          }
          .top-slide,
          .bottom-slide {
            padding: 72px 20px 28px;
          }
          .orb-cluster {
            width: 94vw;
          }
          .prose-card {
            padding: 16px 18px;
            font-size: 14.5px;
          }
          .hero-h1 {
            font-size: clamp(32px, 10vw, 44px);
          }
          .statement {
            font-size: 17px;
          }
          .upper-cols {
            grid-template-columns: 1fr 1fr;
          }
          .big-word {
            font-size: clamp(52px, 18vw, 80px);
          }
        }
      `}</style>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   SEAL — rotating Greek + English text rings around the a.
   mark. The centerpiece of the front slide.
   ════════════════════════════════════════════════════════ */
function Seal() {
  return (
    <div className="seal">
      <svg viewBox="-150 -150 300 300" className="seal-svg">
        <defs>
          <path
            id="seal-outer"
            d="M 0,0 m -128, 0 a 128,128 0 1,1 256,0 a 128,128 0 1,1 -256,0"
          />
          <path
            id="seal-inner"
            d="M 0,0 m -98, 0 a 98,98 0 1,1 196,0 a 98,98 0 1,1 -196,0"
          />
          <radialGradient id="seal-halo" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#fff2c9" stopOpacity="0.95" />
            <stop offset="42%" stopColor="#f4d18a" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#d4a04f" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle r="144" fill="url(#seal-halo)" />

        <g className="ring ring-outer">
          <text className="seal-text">
            <textPath href="#seal-outer" startOffset="0">
              · ΜΕΝΤΕΣ ΑΕΤΕΡΝΑΕ · ΑΛΕΞΑΝΔΡΕΙΑ · ΒΙΒΛΙΟΘΗΚΗ ·
            </textPath>
          </text>
        </g>

        <circle
          r="116"
          fill="none"
          stroke="#b68a3c"
          strokeWidth="0.5"
          strokeDasharray="0.6 3"
        />
        <circle r="110" fill="none" stroke="#b68a3c" strokeWidth="0.35" />

        <g className="ring ring-inner">
          <text className="seal-text seal-text-en">
            <textPath href="#seal-inner" startOffset="0">
              · THE THINKING REPUBLIC · THE INTENT LAYER · YOURS ·
            </textPath>
          </text>
        </g>

        {[0, 90, 180, 270].map((deg) => (
          <g key={deg} transform={`rotate(${deg})`}>
            <line
              x1="0"
              y1="-128"
              x2="0"
              y2="-118"
              stroke="#3a0f3d"
              strokeWidth="1"
            />
          </g>
        ))}

        <g className="seal-center">
          <circle r="46" fill="#3a0f3d" />
          <text
            x="0"
            y="12"
            textAnchor="middle"
            fill="#efe9e0"
            fontSize="44"
            fontFamily="var(--font-serif), serif"
            fontStyle="italic"
          >
            a.
          </text>
        </g>
      </svg>

      <style jsx>{`
        .seal {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .seal-svg {
          width: 100%;
          height: 100%;
          overflow: visible;
        }
        .ring-outer {
          transform-origin: 0 0;
          animation: spinOuter 80s linear infinite;
        }
        .ring-inner {
          transform-origin: 0 0;
          animation: spinInner 55s linear infinite reverse;
        }
        @keyframes spinOuter {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes spinInner {
          to {
            transform: rotate(360deg);
          }
        }
        :global(.seal-text) {
          font-family: var(--font-serif), serif;
          font-size: 11.4px;
          font-style: italic;
          fill: #3a0f3d;
          letter-spacing: 0.22em;
        }
        :global(.seal-text-en) {
          font-size: 9px;
          letter-spacing: 0.36em;
          fill: #6b3a5a;
        }
        .seal-center {
          filter: drop-shadow(0 4px 12px rgba(58, 15, 61, 0.3));
        }
      `}</style>
    </div>
  );
}


/* ════════════════════════════════════════════════════════
   ORNAMENT — renders the generated "a." image for the
   active theme. The image's solid background matches the
   slide's `theme.bg`, so it composites seamlessly.
   ════════════════════════════════════════════════════════ */
function Ornament({ src, id }: { src: string; id: string }) {
  return (
    <div className="orn" aria-hidden>
      <Image
        key={id}
        src={src}
        alt=""
        width={1024}
        height={1024}
        className="orn-img"
        priority
      />
      <style jsx>{`
        .orn {
          width: clamp(260px, 30vh, 360px);
          aspect-ratio: 1;
          position: relative;
        }
        :global(.orn-img) {
          width: 100%;
          height: 100%;
          object-fit: contain;
          user-select: none;
          animation: ornFade 500ms ease-out;
        }
        @keyframes ornFade {
          from {
            opacity: 0;
            transform: scale(0.985);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @media (max-width: 900px) {
          .orn {
            width: 320px;
            height: 320px;
          }
        }
        @media (max-width: 680px) {
          .orn {
            width: 240px;
            height: 240px;
          }
        }
      `}</style>
    </div>
  );
}
