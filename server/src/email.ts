/** Email primitives — Resend API (hybrid dependency, API-controllable, free 100/day). */

export const FOUNDER_EMAIL = process.env.FOUNDER_EMAIL || 'benjamin@mowinckel.com';
export const MAX_FOLLOWUPS = 7;
export const DEFAULT_ENGAGEMENT_DAYS = 3;
const DEFAULT_BRIEF_QUOTE = '\u201cWe are what we repeatedly do. Excellence, then, is not an act, but a habit.\u201d';

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

export async function sendWelcomeEmail(email: string, githubLogin?: string): Promise<void> {
  const WEBSITE_URL = process.env.WEBSITE_URL || 'https://mowinckel.ai';

  await sendEmail(email, 'alexandria. — sign in to set up',
    `<div style="font-family: 'EB Garamond', Georgia, 'Times New Roman', serif; max-width: 420px; margin: 0 auto; padding: 40px 20px; color: #3d3630; text-align: center;">
  <div style="margin-bottom: 2.5rem;">
    <p style="font-size: 1rem; line-height: 1.9; color: #8a8078; margin: 0 0 1.5rem;">your setup command is at <a href="${WEBSITE_URL}/signup" style="color: #3d3630;">${WEBSITE_URL}/signup</a></p>
    <p style="font-size: 0.85rem; line-height: 1.7; color: #8a8078;">sign in. copy the three steps. everything lives on your machine &mdash; we never see your data.</p>
  </div>
  <p style="font-size: 1.15rem; color: #3d3630;">welcome to alexandria.</p>
  <div style="margin-top: 2rem;">
    <p style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.15em; color: #bbb4aa; margin: 0 0 0.5rem;">kin</p>
    <p style="font-size: 0.9rem; color: #8a8078; line-height: 1.7;">5 active kin and it&rsquo;s free. your link:<br><a href="${WEBSITE_URL}/signup?ref=${encodeURIComponent(githubLogin || '')}" style="color: #3d3630;">${WEBSITE_URL}/signup?ref=${githubLogin || 'you'}</a></p>
  </div>
  <p style="font-size: 0.78rem; color: #bbb4aa; margin-top: 1.5rem;"><a href="${WEBSITE_URL}/docs/Trust.md" style="color: #8a8078;">Trust.md</a></p>
</div>`);
}

export async function sendFollowupEmail(email: string, emailToken: string, day: number): Promise<void> {
  const WEBSITE_URL = process.env.WEBSITE_URL || 'https://mowinckel.ai';
  const SERVER_URL = process.env.SERVER_URL || 'https://mcp.mowinckel.ai';
  const followupTag = day > 1 ? ` (follow-up ${day})` : '';

  await sendEmail(email, `alexandria. — sign in to finish setup${followupTag}`,
    `<div style="font-family: 'EB Garamond', Georgia, 'Times New Roman', serif; max-width: 420px; margin: 0 auto; padding: 40px 20px; color: #3d3630; text-align: center;">
  <p style="font-size: 1rem; line-height: 1.9; color: #8a8078; margin: 0 0 1.5rem;">you signed up but haven&rsquo;t installed yet.</p>
  <p style="font-size: 1.1rem; line-height: 1.9; margin: 0 0 2rem;"><a href="${WEBSITE_URL}/signup" style="color: #3d3630;">sign in</a> to get your setup command.</p>
  <p style="font-size: 0.72rem; color: #bbb4aa; margin-top: 1.5rem;"><a href="${SERVER_URL}/email/stop?t=${emailToken}" style="color: #8a8078;">stop these emails</a></p>
</div>`);
}

export async function sendUpgradeEmail(email: string): Promise<void> {
  await sendEmail(email, 'alexandria. — upgrade needed',
    `<div style="font-family: 'EB Garamond', Georgia, 'Times New Roman', serif; max-width: 440px; margin: 0 auto; padding: 40px 20px; color: #3d3630; text-align: center;">
  <p style="font-size: 1rem; line-height: 1.9; color: #8a8078; margin: 0 0 1.5rem;">your alexandria install is calling a removed endpoint.</p>
  <p style="font-size: 1rem; line-height: 1.9; color: #8a8078; margin: 0 0 1.5rem;">the local cache is stale. reinstall to pick up the current version:</p>
  <pre style="font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 0.82rem; background: #f5f3f0; padding: 1rem; text-align: left; overflow-x: auto; color: #3d3630;">curl -fsSL https://raw.githubusercontent.com/mowinckelb/alexandria/main/factory/setup.sh | bash</pre>
  <p style="font-size: 0.78rem; color: #bbb4aa; margin-top: 1.5rem;">one-time note per week.</p>
</div>`);
}

export async function sendEngagementEmail(email: string, emailToken: string): Promise<void> {
  const SERVER_URL = process.env.SERVER_URL || 'https://mcp.mowinckel.ai';

  await sendEmail(email, 'share to alexandria. /a to start; a. to close.',
    `<div style="font-family: 'EB Garamond', Georgia, 'Times New Roman', serif; max-width: 420px; margin: 0 auto; padding: 40px 20px; color: #3d3630; text-align: center;">
  <p style="font-size: 1rem; line-height: 1.9; color: #8a8078; font-style: italic; margin: 0 0 2rem;">&ldquo;We are what we repeatedly do. Excellence, then, is not an act, but a habit.&rdquo;</p>
  <p style="font-size: 1.15rem; color: #3d3630; margin: 0 0 2.5rem;">a.</p>
  <p style="font-size: 0.72rem; color: #bbb4aa; margin: 0;">
    <a href="${SERVER_URL}/email/less?t=${emailToken}" style="color: #8a8078;">send less</a>
    &nbsp;&middot;&nbsp;
    <a href="${SERVER_URL}/email/stop?t=${emailToken}" style="color: #8a8078;">send none</a>
  </p>
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
