import {
  Instrument_Serif,
  Spectral,
  Source_Serif_4,
  Newsreader,
  Cormorant_Garamond,
  EB_Garamond,
  Playfair_Display,
} from 'next/font/google';

const instrument = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
});

const spectral = Spectral({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
});

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
});

const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
});

type Candidate = {
  name: string;
  className: string;
  note: string;
  verdict: string;
};

const CANDIDATES: Candidate[] = [
  {
    name: 'Instrument Serif',
    className: instrument.className,
    note: 'What we use now. Warm, calligraphic, strong italic. Free (Google Fonts).',
    verdict:
      'Close — but more calligraphic than Fleet. The italic terminals curl more; the upright feels less rigid.',
  },
  {
    name: 'Spectral',
    className: spectral.className,
    note:
      'Modern Plantin-family revival by Production Type. The closest free analog to Martina Plantijn in DNA. Free (Google Fonts).',
    verdict:
      'Warmest Plantin analog. Upright is very Fleet-adjacent. Italic is less dramatic than Martina.',
  },
  {
    name: 'Source Serif 4',
    className: sourceSerif.className,
    note:
      'Adobe\'s open-source Plantin-adjacent workhorse. Cleaner, more rigid. Free.',
    verdict:
      'Most rigid of the bunch. Feels institutional. Matches Fleet\'s tone better than its curves.',
  },
  {
    name: 'Newsreader',
    className: newsreader.className,
    note:
      'Designed for long-form reading. Plantin-adjacent with a strong italic. Free (Google Fonts).',
    verdict:
      'Excellent italic. Upright is slightly softer than Fleet. Quiet and readable.',
  },
  {
    name: 'Cormorant Garamond',
    className: cormorant.className,
    note: 'Garamond family (not Plantin). Narrower, high-contrast. Free.',
    verdict:
      'Different DNA — Garamond not Plantin. Elegant but not Fleet-like.',
  },
  {
    name: 'EB Garamond',
    className: ebGaramond.className,
    note: 'Classical Garamond. Traditional, not very contemporary.',
    verdict:
      'Too traditional. Reads as "antique book," not modern research lab.',
  },
  {
    name: 'Playfair Display',
    className: playfair.className,
    note: 'Didone-adjacent display serif. High contrast, dramatic.',
    verdict: 'Wrong family entirely. Too display-y, no warmth.',
  },
];

export default function FontsPage() {
  return (
    <div className="page">
      <header className="head">
        <h1 className="head-title">Font candidates — Alexandria</h1>
        <p className="head-sub">
          Fleet uses <em>Martina Plantijn</em> (Commercial Type, paid —
          ~$200/weight for desktop, web license similar). Closest free
          analogs ranked below. Each block shows the nav wordmark, the H1,
          and a paragraph of body in the candidate font.
        </p>
      </header>

      {CANDIDATES.map((c) => (
        <section key={c.name} className={`block ${c.className}`}>
          <div className="label">
            <h2 className="label-name">{c.name}</h2>
            <p className="label-note">{c.note}</p>
            <p className="label-verdict">
              <em>Verdict:</em> {c.verdict}
            </p>
          </div>

          <div className="preview">
            <div className="wordmark-row">
              <span className="wordmark">
                alexandria<span className="dot">.</span>
              </span>
              <span className="wordmark-italic">
                <em>alexandria</em>
                <span className="dot">.</span>
              </span>
            </div>

            <h3 className="h1">
              A file that makes your ai <em>think with you.</em>
            </h3>

            <p className="body">
              Alexandria is one file about your mind &mdash; how you reason,
              what you value, where you&rsquo;re blind. Your ai reads it
              before every answer. It finally knows not just what you{' '}
              <em>like</em>, but how you <em>think</em>.
            </p>

            <p className="body small">
              I. <em>n.</em> The great ancient library; a gathering-place
              for every mind worth preserving. II. <em>v.</em> To make a
              mind legible; to compound thought across models and years.
            </p>
          </div>
        </section>
      ))}

      <footer className="foot">
        <p>
          <strong>If you want Fleet&rsquo;s exact feel:</strong> license{' '}
          <em>Martina Plantijn</em> from Commercial Type — ~$600 for 3
          weights + italics on web. That&rsquo;s the only way to truly
          match Fleet.
        </p>
        <p>
          <strong>If free is the constraint:</strong> Spectral is the
          closest Plantin-family match. Instrument Serif (current) is more
          calligraphic; Newsreader is the safest reader font.
        </p>
      </footer>

      <style>{`
        :root {
          --ink: #1a1318;
          --ink-muted: #6b5a63;
          --ink-faint: #9a8a84;
          --cream: #f3eee3;
        }
        body {
          background: var(--cream);
          margin: 0;
        }
        .page {
          max-width: 960px;
          margin: 0 auto;
          padding: 48px 32px 96px;
          color: var(--ink);
          font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
        }
        .head-title {
          font-size: 32px;
          font-weight: 500;
          margin: 0 0 12px;
        }
        .head-sub {
          font-size: 15px;
          color: var(--ink-muted);
          line-height: 1.5;
          margin: 0 0 40px;
        }
        .head-sub em {
          font-style: italic;
          color: var(--ink);
        }
        .block {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 40px;
          padding: 40px 0;
          border-top: 1px solid rgba(26, 19, 24, 0.14);
          align-items: start;
        }
        .block:last-of-type {
          border-bottom: 1px solid rgba(26, 19, 24, 0.14);
        }
        .label {
          font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          color: var(--ink-muted);
          font-size: 13px;
          line-height: 1.5;
        }
        .label-name {
          font-size: 20px;
          font-weight: 600;
          color: var(--ink);
          margin: 0 0 10px;
        }
        .label-note {
          margin: 0 0 10px;
        }
        .label-verdict {
          margin: 0;
        }
        .label em {
          font-style: italic;
          color: var(--ink);
        }
        .preview {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .wordmark-row {
          display: flex;
          gap: 40px;
          align-items: baseline;
          flex-wrap: wrap;
        }
        .wordmark,
        .wordmark-italic {
          font-size: 44px;
          line-height: 1;
          color: var(--ink);
          letter-spacing: -0.015em;
        }
        .wordmark-italic em {
          font-style: italic;
        }
        .wordmark .dot,
        .wordmark-italic .dot {
          font-style: normal;
        }
        .h1 {
          font-size: 42px;
          line-height: 1.06;
          letter-spacing: -0.015em;
          font-weight: 400;
          margin: 0;
          color: var(--ink);
        }
        .h1 em {
          font-style: italic;
        }
        .body {
          font-size: 17px;
          line-height: 1.5;
          color: var(--ink);
          margin: 0;
          max-width: 580px;
        }
        .body em {
          font-style: italic;
        }
        .body.small {
          font-size: 14px;
          color: var(--ink-muted);
        }
        .foot {
          margin-top: 48px;
          padding-top: 32px;
          border-top: 1px solid rgba(26, 19, 24, 0.14);
          font-size: 14px;
          line-height: 1.55;
          color: var(--ink-muted);
        }
        .foot p {
          margin: 0 0 12px;
        }
        .foot em {
          font-style: italic;
          color: var(--ink);
        }
        .foot strong {
          color: var(--ink);
          font-weight: 600;
        }
        @media (max-width: 720px) {
          .block {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }
      `}</style>
    </div>
  );
}
