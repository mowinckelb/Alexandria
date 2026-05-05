/** Email primitives — Resend API (hybrid dependency, API-controllable, free 100/day). */

export const FOUNDER_EMAIL = process.env.FOUNDER_EMAIL || 'benjamin@mowinckel.com';

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

export async function sendFollowerWelcome(email: string): Promise<{ ok: boolean; error?: string }> {
  const WEBSITE_URL = process.env.WEBSITE_URL || 'https://mowinckel.ai';
  const html = `<div style="font-family: 'EB Garamond', Georgia, 'Times New Roman', serif; max-width: 480px; margin: 0 auto; padding: 48px 24px; color: #3d3630; font-size: 1.05rem; line-height: 1.7;">
  <p style="margin: 0 0 1.4rem;">welcome to alexandria. :)</p>
  <p style="margin: 0 0 1.4rem;">
    every week or so i'll send an email with updates on the project; stories, photos, vlogs, etc. keeping you in the loop with how things are going -- both good and bad!<br>
    when we come out with new products or its available for new users then you will also be the first to know.
  </p>
  <p style="margin: 0 0 1.4rem;">
    feel free to reply whenever you want. i'll read all of them!<br>
    and also if there are others you know who might be interested in following then just send them <a href="${WEBSITE_URL}" style="color: #3d3630;">the website link</a>.
  </p>
  <p style="margin: 0 0 1.8rem;">ok, that's all. bye for now :)</p>
  <p style="margin: 0 0 0.4rem;">Benjamin a. Mowinckel</p>
  <p style="margin: 0; font-style: italic; color: #8a8078;">a.</p>
</div>`;

  return await sendEmail(email, 'welcome to alexandria.', html);
}

export async function sendPatronAck(
  email: string,
  amountDollars: number,
  portalUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  const html = `<div style="font-family: 'EB Garamond', Georgia, 'Times New Roman', serif; max-width: 420px; margin: 0 auto; padding: 48px 24px; color: #3d3630; text-align: center; line-height: 1.7;">
  <p style="margin: 0 0 1.4rem; font-size: 1.05rem;">$${amountDollars.toFixed(0)} / month received.</p>
  <p style="margin: 0 0 1.8rem; font-style: italic; font-size: 1.05rem;">honourary alexandrian.</p>
  <p style="margin: 0; font-size: 0.85rem; color: #8a8078;"><a href="${portalUrl}" style="color: #8a8078;">manage subscription</a></p>
</div>`;
  return await sendEmail(email, 'honourary alexandrian.', html);
}

export async function sendWelcomeEmail(email: string): Promise<void> {
  const WEBSITE_URL = process.env.WEBSITE_URL || 'https://mowinckel.ai';
  await sendEmail(email, 'welcome to alexandria.',
    `<div style="font-family: 'EB Garamond', Georgia, 'Times New Roman', serif; max-width: 480px; margin: 0 auto; padding: 48px 24px; color: #3d3630; text-align: left; line-height: 1.7;">
  <p style="font-size: 1.1rem; margin: 0 0 1.75rem;">welcome to alexandria.</p>
  <p style="font-size: 1rem; color: #8a8078; margin: 0 0 1.75rem;">your data lives on your machine. your kin code is your GitHub username. share it with new authors, or send them your invite link.</p>
  <p style="font-size: 0.95rem; margin: 0;"><a href="${WEBSITE_URL}/signup" style="color: #3d3630; text-decoration: none;">open alexandria</a></p>
</div>`);
}

// sendMorningBrief / sendMorningNudge removed: morning brief + nudge are now
// fully sovereign on each Author's machine (factory/scripts/brief.py + their
// own SMTP creds + their own launchd schedule). Email-on-behalf-of-users is
// out of scope for the company server — see factory/skills/brief-setup.md.
