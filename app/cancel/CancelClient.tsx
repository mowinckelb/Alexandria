'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ThemeToggle } from '../components/ThemeToggle';
import { FOUNDER_EMAIL, FOUNDER_PHONE } from '../lib/config';

// The AI-assist prompt is offered as a hand-off the user can paste into
// their own assistant — half the message field is intimidating without it.
// Match the prompt exactly to the one embedded in the prefilled mailto body
// so the two copies don't drift.
const AI_PROMPT = `write a short, honest note to benjamin at alexandria. answer three things in 3-5 sentences: what made me try alexandria, what didn't land for me, what would actually make me stay. my voice, no fluff.`;

const MAILTO_BODY = [
  'hi benjamin,',
  '',
  "(if writing's a chore — paste this prompt into your AI assistant and let it draft:",
  `"${AI_PROMPT}"`,
  'then replace this section with the result.)',
  '',
  'what made me try alexandria:',
  '',
  "what didn't land:",
  '',
  'what would make me stay:',
  '',
  '— [your name]',
].join('\n');

// Formats an ISO date as "Month D, YYYY" — Intl.DateTimeFormat respects
// the visitor's locale by default. Lowercased to match the literary
// register of the rest of the page.
function formatCancelDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
      .format(new Date(iso))
      .toLowerCase();
  } catch {
    return iso;
  }
}

type Mode = 'save' | 'cancelling' | 'cancelled' | 'reactivating' | 'reactivated';

export default function CancelClient({
  githubLogin: _githubLogin,
  initialCancelAt,
  initialStatus,
}: {
  githubLogin: string | null;
  initialCancelAt: string | null;
  initialStatus: string | null;
}) {
  // If the subscription is already scheduled to cancel, we land on the
  // "cancelled" branch (which renders the reactivate UI). Otherwise we
  // open in "save" mode — the founder's letter + the cancel CTA.
  const alreadyCancelling = !!initialCancelAt || initialStatus === 'canceled';
  const [mode, setMode] = useState<Mode>(alreadyCancelling ? 'cancelled' : 'save');
  const [cancelAt, setCancelAt] = useState<string | null>(initialCancelAt);
  const [error, setError] = useState<string>('');

  const mailtoUrl = useMemo(() => {
    const subject = encodeURIComponent("what i'd need to stay");
    const body = encodeURIComponent(MAILTO_BODY);
    return `mailto:${FOUNDER_EMAIL}?subject=${subject}&body=${body}`;
  }, []);

  const telUrl = `tel:${FOUNDER_PHONE}`;

  const onCancel = async () => {
    setMode('cancelling');
    setError('');
    try {
      const res = await fetch('/api/library/account/cancel', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; cancel_at?: string; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || 'something broke on our end. try again in a moment.');
        setMode('save');
        return;
      }
      setCancelAt(data.cancel_at || null);
      setMode('cancelled');
    } catch {
      setError('network hiccup. try again?');
      setMode('save');
    }
  };

  const onReactivate = async () => {
    setMode('reactivating');
    setError('');
    try {
      const res = await fetch('/api/library/account/reactivate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || 'something broke on our end. try again in a moment.');
        setMode('cancelled');
        return;
      }
      setCancelAt(null);
      setMode('reactivated');
    } catch {
      setError('network hiccup. try again?');
      setMode('cancelled');
    }
  };

  const cancelAtPretty = cancelAt ? formatCancelDate(cancelAt) : null;

  return (
    <div className="cancel-page">
      <ThemeToggle />

      <header className="cancel-header">
        <Link href="/" className="cancel-brand">
          alexandria<span className="cancel-brand-dot">.</span>
        </Link>
      </header>

      <main className="cancel-main">
        {/* SAVE — the founder's letter. Lives behind the "before you go"
            opener. Renders only while the subscription is still active
            and the user hasn't pulled the trigger yet. */}
        {mode === 'save' || mode === 'cancelling' ? (
          <article className="cancel-letter">
            <p className="cancel-salutation">before you go &mdash;</p>

            <p className="cancel-line">i&rsquo;m benjamin. i built this.</p>

            <p>
              you&rsquo;re not just a subscription. you showed up to try
              something that didn&rsquo;t exist yet &mdash; and that
              matters more to me than i can say in a page like this.
            </p>

            <p>
              the product can still bend around what you need. it&rsquo;s
              that early. if you&rsquo;ve got two minutes, tell me
              what&rsquo;s missing. i read every word, and the next
              thing i build is probably whatever you say.
            </p>

            <p>writing&rsquo;s a chore? paste this into your AI:</p>

            <blockquote className="cancel-prompt">
              <em>{AI_PROMPT}</em>
            </blockquote>

            <p>then send the result.</p>

            <div className="cancel-contact">
              <a href={mailtoUrl} className="cancel-contact-cta">
                email benjamin
              </a>
              <a href={telUrl} className="cancel-contact-cta">
                call benjamin
              </a>
            </div>

            <p className="cancel-sign">&mdash; b</p>

            <p className="cancel-aside"><em>no hard feelings if neither.</em></p>

            <div className="cancel-action">
              <button
                type="button"
                className="cancel-confirm"
                onClick={onCancel}
                disabled={mode === 'cancelling'}
              >
                {mode === 'cancelling' ? 'cancelling…' : 'yes, cancel my subscription'}
              </button>
              {error && <p className="cancel-error">{error}</p>}
            </div>
          </article>
        ) : null}

        {/* CANCELLED — fresh-cancel state OR landed-here-already-cancelling.
            Shows the end date and the reactivate option. Uses the same
            register but with the calmer "sorry to see you go" opener
            when we just cancelled. */}
        {mode === 'cancelled' || mode === 'reactivating' ? (
          <article className="cancel-letter">
            <p className="cancel-salutation">
              {alreadyCancelling ? 'one last thing —' : 'sorry to see you go —'}
            </p>

            <p>
              your subscription {alreadyCancelling ? 'is set to end' : 'ends'} on{' '}
              <em>{cancelAtPretty || 'the end of the current period'}</em>.
              if you change your mind before then, you can turn it back
              on here.
            </p>

            <div className="cancel-action">
              <button
                type="button"
                className="cancel-confirm"
                onClick={onReactivate}
                disabled={mode === 'reactivating'}
              >
                {mode === 'reactivating' ? 'reactivating…' : 'reactivate my subscription'}
              </button>
              {error && <p className="cancel-error">{error}</p>}
            </div>

            <p className="cancel-aside"><em>thanks for trying alexandria.</em></p>
          </article>
        ) : null}

        {/* REACTIVATED — confirmation. Returns the user to the threshold
            with a brief welcome-back beat; offers a single link to the
            main practice (the signup primer doubles as a re-orient). */}
        {mode === 'reactivated' ? (
          <article className="cancel-letter">
            <p className="cancel-salutation">welcome back &mdash;</p>

            <p>
              your subscription is active again. nothing else to do
              here.
            </p>

            <div className="cancel-action">
              <Link href="/" className="cancel-confirm cancel-confirm-link">
                back to alexandria
              </Link>
            </div>

            <p className="cancel-sign">&mdash; b</p>
          </article>
        ) : null}
      </main>
    </div>
  );
}
