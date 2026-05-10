import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Link from 'next/link';
import { ThemeToggle } from '../components/ThemeToggle';
import SignupCTA from './SignupCTA';
import TrustCopy from './TrustCopy';

export const dynamic = 'force-dynamic';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; ref_source?: string }>;
}) {
  const sp = await searchParams;
  const urlRef = sp.ref;
  const refSource = sp.ref_source;

  const trustContent = await readFile(
    path.join(process.cwd(), 'public', 'docs', 'Trust.md'),
    'utf8',
  );

  return (
    <div className="primer-page">
      <ThemeToggle />

      <header className="primer-header">
        <Link href="/" className="primer-brand">
          alexandria<span className="primer-brand-dot">.</span>
        </Link>
      </header>

      <main className="primer-main">
        <article className="primer">
          <p className="primer-salutation">to the new alexandrian.</p>

          <h1 className="primer-h1">
            you have crossed the threshold. read this once before signing up &mdash; what we ask, what we promise, and how to begin.
          </h1>

          <section className="primer-section">
            <p className="primer-label">the covenant.</p>
            <p>
              alexandria is a folder on your own machine; plain
              markdown, your files, your shape. every ai you ever
              use reads it and thinks <em>with</em> you, not for
              you.
            </p>
            <p>
              the one thing we ask: participate in the collective.
              publish a single living file &mdash; your evolving
              thoughts, gated however you choose &mdash; and share
              the modules you build for yourself. the library
              compounds when minds reach across.
            </p>
          </section>

          <section className="primer-section">
            <p className="primer-label">the mindset.</p>
            <p>
              agency is the input. you ask, it answers; you shape,
              it sharpens. wait passively and you get average;
              participate actively and you get something
              specifically yours. you should never sit there
              wondering &mdash; just ask.
            </p>
          </section>

          <section className="primer-section">
            <p className="primer-label">the deal.</p>
            <p>
              <strong>$10 a month</strong>. free if five friends
              sign up through you and keep their accounts active
              &mdash; we call them your kin. after signup you will
              get a kin link; send it to ten people straight away,
              knowing some will not stick.
            </p>
          </section>

          <section className="primer-section">
            <p className="primer-label">the sovereignty.</p>
            <p>
              your files live on your own machine and your
              github. we never see what you do not publish. if
              alexandria disappears tomorrow, you keep everything.{' '}
              <TrustCopy content={trustContent} /> lists every byte that touches our server.
            </p>
          </section>

          <section className="primer-section">
            <p className="primer-label">what happens next.</p>
            <p>
              one click below for github. one curl command in your
              terminal after. the folder appears at <code>~/alexandria/</code>,
              your ai picks it up at the next session, and you are
              in. five minutes to your first session.
            </p>
          </section>
        </article>

        <SignupCTA urlRef={urlRef} refSource={refSource} />

        <p className="primer-coda"><em>welcome to alexandria.</em></p>
      </main>

      <style>{`
        .primer-page {
          background: var(--bg-primary);
          color: var(--text-primary);
          min-height: 100vh;
          font-family: var(--font-serif), ui-serif, Georgia, serif;
        }

        .primer-header {
          padding: 28px 32px 0;
        }
        .primer-brand {
          font-family: var(--font-serif), ui-serif, Georgia, serif;
          font-style: italic;
          font-weight: 400;
          font-size: 22px;
          color: var(--text-primary);
          text-decoration: none;
          letter-spacing: 0.005em;
        }
        .primer-brand-dot {
          font-style: normal;
        }

        .primer-main {
          max-width: 580px;
          margin: 0 auto;
          padding: 5rem 24px 6rem;
        }

        /* SALUTATION — small italic letter-spaced museum-plate
           opener, matching the landing slide's "to the reader."
           pattern. Keeps the same Renaissance epistle register. */
        .primer-salutation {
          margin: 0 0 28px;
          font-style: italic;
          font-size: 13px;
          font-weight: 400;
          letter-spacing: 0.18em;
          color: var(--text-muted, rgba(26, 19, 24, 0.55));
          text-transform: lowercase;
        }

        /* H1 — the threshold sentence. Larger italic serif body
           weight; reads as a primed paragraph rather than a chunk
           heading. The covenant's actual headline. */
        .primer-h1 {
          margin: 0 0 56px;
          font-family: var(--font-serif), ui-serif, Georgia, serif;
          font-style: italic;
          font-weight: 400;
          font-size: 22px;
          line-height: 1.5;
          letter-spacing: 0.005em;
          color: var(--text-primary);
        }

        /* SECTIONS — five short articles of the covenant. Each
           opens with an italic letter-spaced lowercase label
           (matching the salutation register), then 1-2 short
           paragraphs of body prose. */
        .primer-section {
          margin: 0 0 44px;
        }
        .primer-section:last-of-type {
          margin-bottom: 56px;
        }

        .primer-label {
          margin: 0 0 14px;
          font-style: italic;
          font-size: 13px;
          font-weight: 400;
          letter-spacing: 0.18em;
          text-transform: lowercase;
          color: var(--text-muted, rgba(26, 19, 24, 0.55));
        }

        .primer p:not(.primer-label):not(.primer-salutation):not(.primer-coda) {
          margin: 0 0 16px;
          font-family: var(--font-serif), ui-serif, Georgia, serif;
          font-size: 17px;
          line-height: 1.7;
          color: var(--text-secondary, rgba(26, 19, 24, 0.85));
          letter-spacing: 0.005em;
          font-feature-settings: "kern" 1, "liga" 1, "onum" 1;
        }
        .primer p:last-child {
          margin-bottom: 0;
        }

        .primer em {
          font-style: italic;
          color: var(--text-primary);
        }

        .primer strong {
          font-weight: 600;
          font-style: normal;
          color: var(--text-primary);
        }

        .primer code {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 0.88em;
          padding: 0.08em 0.4em;
          border-radius: 3px;
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        /* TRUST LINK — inherits .primer button styling but matches
           the inline link register so it reads as part of the prose. */
        .primer button.trust-copy {
          display: inline-flex;
          align-items: baseline;
          gap: 0.3em;
          background: transparent;
          border: none;
          padding: 0;
          margin: 0;
          font: inherit;
          font-family: inherit;
          font-size: inherit;
          color: var(--text-primary);
          cursor: pointer;
          text-decoration: underline;
          text-decoration-color: var(--text-muted, rgba(26, 19, 24, 0.45));
          text-underline-offset: 3px;
          text-decoration-thickness: 1px;
          transition: opacity 200ms;
        }
        .primer button.trust-copy:hover {
          opacity: 0.6;
        }
        .primer .trust-copy-icon {
          display: inline-flex;
          align-items: center;
          opacity: 0.55;
        }

        /* CTA SECTION — kept dignified. Sign-up link as italic
           serif text-button, kin code as a minimal underlined
           field. No filled buttons; the literary register stays
           through the action moment. */
        .cta-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 28px;
          padding: 48px 0 0;
          margin-top: 24px;
          border-top: 1px solid var(--bg-tertiary, rgba(26, 19, 24, 0.12));
        }

        .primary-cta {
          font-family: var(--font-serif), ui-serif, Georgia, serif;
          font-style: italic;
          font-weight: 500;
          font-size: 22px;
          letter-spacing: 0;
          color: var(--text-primary);
          text-decoration: underline;
          text-decoration-color: var(--text-muted, rgba(26, 19, 24, 0.4));
          text-decoration-thickness: 1px;
          text-underline-offset: 6px;
          padding: 4px 0;
          transition: text-decoration-color 200ms, opacity 200ms;
        }
        .primary-cta:hover {
          text-decoration-color: var(--text-primary);
          opacity: 0.92;
        }

        .kin-form {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .kin-via {
          font-family: var(--font-serif), ui-serif, Georgia, serif;
          font-style: italic;
          font-size: 12px;
          letter-spacing: 0.18em;
          text-align: center;
          text-transform: lowercase;
          color: var(--text-ghost, rgba(26, 19, 24, 0.45));
          margin: 0;
        }

        .kin-input {
          font-family: var(--font-serif), ui-serif, Georgia, serif;
          font-style: italic;
          font-size: 13px;
          letter-spacing: 0.12em;
          text-align: center;
          text-transform: lowercase;
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--bg-tertiary, rgba(26, 19, 24, 0.18));
          outline: none;
          width: 160px;
          padding: 4px 0;
          color: var(--text-ghost, rgba(26, 19, 24, 0.55));
          caret-color: var(--text-ghost, rgba(26, 19, 24, 0.55));
          transition: border-bottom-color 200ms;
        }
        .kin-input:focus {
          border-bottom-color: var(--text-primary);
          color: var(--text-primary);
        }
        .kin-input::placeholder {
          color: var(--text-ghost, rgba(26, 19, 24, 0.4));
          font-style: italic;
        }

        .kin-status {
          display: inline-flex;
          align-items: center;
          padding: 0;
          margin: 0;
          background: transparent;
          border: none;
          font: inherit;
        }
        .kin-status.valid {
          color: var(--accent, #6b3a4a);
        }
        button.kin-status.invalid {
          color: var(--text-muted, rgba(26, 19, 24, 0.5));
          cursor: pointer;
          transition: color 200ms;
        }
        button.kin-status.invalid:hover {
          color: var(--text-primary);
        }
        .kin-feedback {
          font-family: var(--font-serif), ui-serif, Georgia, serif;
          font-style: italic;
          font-size: 12px;
          letter-spacing: 0.04em;
          text-align: center;
          margin: 8px 0 0;
          max-width: 320px;
        }
        .kin-feedback.valid {
          color: var(--accent, #6b3a4a);
        }
        .kin-feedback.invalid {
          color: var(--text-muted, rgba(26, 19, 24, 0.5));
        }

        /* CODA — small italic "welcome." beneath the action.
           The covenant ends with the same word the landing slide
           ends with; closes the loop between the two pages. */
        .primer-coda {
          margin: 56px 0 0;
          text-align: center;
          font-family: var(--font-serif), ui-serif, Georgia, serif;
          font-size: 16px;
          font-style: italic;
          color: var(--text-muted, rgba(26, 19, 24, 0.5));
          letter-spacing: 0.02em;
        }

        @media (max-width: 640px) {
          .primer-main {
            padding: 3rem 20px 4rem;
          }
          .primer-h1 {
            font-size: 19px;
            margin-bottom: 44px;
          }
          .primer p:not(.primer-label):not(.primer-salutation):not(.primer-coda) {
            font-size: 16px;
            line-height: 1.7;
          }
          .primer-section {
            margin-bottom: 36px;
          }
          .cta-section {
            padding-top: 40px;
          }
          .primary-cta {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  );
}
