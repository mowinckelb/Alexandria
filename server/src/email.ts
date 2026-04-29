/** Email primitives — Resend API (hybrid dependency, API-controllable, free 100/day). */

export const FOUNDER_EMAIL = process.env.FOUNDER_EMAIL || 'benjamin@mowinckel.com';
const DEFAULT_BRIEF_QUOTE = '“We are what we repeatedly do. Excellence, then, is not an act, but a habit.”';

/**
 * Run up to `concurrency` email sends in parallel, draining the task list in
 * batches. Keeps us comfortably under Resend's 2 req/s free-tier limit while
 * not being so serialised that cron jobs wall-clock forever at scale.
 */
export async function sendEmailsBatched<T>(
  tasks: T[],
  sendOne: (task: T) => Promise<{ ok: boolean; error?: string }>,
  concurrency = 5,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const results = await Promise.all(batch.map(sendOne));
    for (const r of results) { if (r.ok) sent++; else failed++; }
  }
  return { sent, failed };
}

export async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Alexandria <a@mowinckel.ai>',
        to,
        subject,
        html,
      }),
    });
    if (!resp.ok) {
      const error = `Resend ${resp.status}: ${await resp.text()}`;
      console.error(error);
      return { ok: false, error };
    }
    return { ok: true };
  } catch (err) {
    const error = `Email send failed: ${err}`;
    console.error(error);
    return { ok: false, error };
  }
}

export async function sendWelcomeEmail(email: string): Promise<void> {
  const WEBSITE_URL = process.env.WEBSITE_URL || 'https://mowinckel.ai';

  await sendEmail(email, 'alexandria.',
    `<div style="font-family: 'EB Garamond', Georgia, 'Times New Roman', serif; max-width: 420px; margin: 0 auto; padding: 80px 20px; color: #1a1318; text-align: center;">
  <p style="font-size: 1.1rem; margin: 0 0 2.5rem;"><em>alexandria</em>.</p>
  <p style="font-size: 1rem; margin: 0 0 2.5rem;"><a href="${WEBSITE_URL}/signup" style="color: #1a1318;">sign in</a>.</p>
  <p style="font-size: 1.4rem; margin: 0;"><em>a.</em></p>
</div>`);
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function sendMorningBrief(
  email: string,
  emailToken: string,
  brief: string,
  notepad?: string,
  quote?: string,
): Promise<void> {
  const SERVER_URL = process.env.SERVER_URL || 'https://mcp.mowinckel.ai';
  const q = esc(quote || DEFAULT_BRIEF_QUOTE);
  const safeBrief = esc(brief);

  let notepadSection = '';
  if (notepad) {
    notepadSection = `
  <p style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.15em; color: #bbb4aa; margin: 0 0 0.8rem;">notepad</p>
  <p style="font-size: 1.1rem; line-height: 1.9; color: #3d3630; margin: 0 0 2.5rem;">${esc(notepad)}</p>`;
  }

  await sendEmail(email, 'alexandria.',
    `<div style="font-family: 'EB Garamond', Georgia, 'Times New Roman', serif; max-width: 420px; margin: 0 auto; padding: 40px 20px; color: #3d3630; text-align: center;">
  <p style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.15em; color: #bbb4aa; margin: 0 0 0.8rem;">overnight</p>
  <p style="font-size: 1rem; line-height: 1.9; color: #8a8078; margin: 0 0 2.5rem;">${safeBrief}</p>${notepadSection}
  <p style="font-size: 1rem; line-height: 1.9; color: #8a8078; margin: 0 0 0.5rem;">/a to start a session. a. to close it.</p>
  <p style="font-size: 1rem; line-height: 1.9; color: #8a8078; font-style: italic; margin: 0 0 2.5rem;">${q}</p>
  <p style="font-size: 0.72rem; color: #bbb4aa; margin: 0;">
    <a href="${SERVER_URL}/brief/less?t=${emailToken}" style="color: #8a8078; text-decoration: none;">send less</a>
    &nbsp;&middot;&nbsp;
    <a href="${SERVER_URL}/brief/stop?t=${emailToken}" style="color: #8a8078; text-decoration: none;">send none</a>
  </p>
</div>`);
}
