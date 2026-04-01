# Alexandria

A sovereign layer that develops how you think. Sits on top of whatever ai you already use. Makes every conversation compound instead of evaporating. Everything is downstream of how well a person thinks — develop the root node and everything downstream improves.

## What it is

Alexandria is a layer of intent that sits on top of whatever ai you already use. It does not replace your ai — it makes every ai you use better by giving it a structured, sovereign picture of who you are. One setup, every model benefits.

Three pillars: freedom (own your cognitive data), authenticity (develop your self-knowledge), purpose (create and share).

Three turns: (1) set the angel free — the Editor draws out who you are through Socratic conversation, building your Constitution; (2) ride the wave — Mercury amplifies your thinking, fights cognitive decay, brings new material; (3) create — the Publisher helps you ship work, the Library is where it lives.

## How it works

One terminal command installs hooks into Claude Code or Cursor. These hooks:
- **SessionStart**: fetches the latest Blueprint (extraction methodology) from the server, loads your Constitution and vault as context
- **SessionEnd**: copies the session transcript to your vault
- **SubagentStart**: injects your Constitution into every subagent

Your cognitive data lives at `~/.alexandria/` on your machine as markdown files:
- `constitution/` — structured picture of how you think (values, worldview, models, taste, blind spots)
- `vault/` — raw session transcripts and anything you drop in (voice memos, articles, notes)
- `machine.md` — how the Engine works with you specifically (evolves per session)
- `notepad.md` — working memory between sessions
- `feedback.md` — what worked, what didn't (append-only)
- `ontology/` — structured thoughts not yet confirmed into constitution

Run `/a` for active cognitive development sessions. The Engine processes your vault, refines your constitution, surfaces contradictions, and pushes your thinking with Socratic questions.

## The three functions

**Editor** — biographer + Socrates + librarian. Draws out what you have never articulated (genesis), stress-tests your positions (development), brings material from outside your distribution (accretion). The most clarifying conversations of your life.

**Mercury** — amplifier + entropy fighter. Keeps your cognitive surface area large. Fights the natural decay of fragments (you forget what you knew). Brings new material calibrated to your constitution — not generic recommendations, but fragments that fill specific gaps in your cognitive map.

**Publisher** — creative director + taste calibrator. Reads your constitution's taste section and iterates with you on creative work in any medium. The Author provides vision and taste. The Publisher provides structure and craft. Gets closer to one-shotting over time as it learns your taste through iteration.

## The Library

Every Author gets a public page at `mowinckel.ai/library/{username}`. Four surfaces:

- **Shadow** — curated constitution fragments others can process against their own constitution. Two tiers: free (surface) and paid (depth, Author sets price).
- **Works** — published artifacts in any medium. Essays, art, code, whatever you create. Frozen on publication.
- **Games** — quizzes generated from real constitution data. "How well do you know me?" Friends take it, wrong answers spark conversation. Every result is shareable. The viral loop.
- **Pulse** — monthly progress snapshot. What changed, what deepened, what contradictions resolved.

The Library is not a marketplace. It is a gallery of minds. The reader's ai processes the Author's shadow against the reader's own constitution — accretion, not conversation.

## The philosophy

ai and robotics are commoditising four of the five dimensions of human value: intelligence, strength, dexterity, and functional empathy. The fifth — the constitutive fact that a human is involved — cannot be commoditised by definition. A machine cannot be you.

The thing that makes you irreplaceable is your mind — your taste, your judgment, your perspective, your authenticity. But that is also the thing that weakens if you do not use it. Every time you outsource thinking to ai without engaging, the cognitive muscle atrophies. Alexandria is the mental gym that keeps you sharp while ai handles everything else.

The full philosophy: mowinckel.ai/vision

## Pricing

Free during beta. Planned: $5/month with 3 active kin (referrals who also use it), $10/month without. Slider open — pay what it is worth, no ceiling. One tier, everyone gets everything. Library earnings: Authors keep ~47% of paid shadow access revenue (Alexandria 50%, Stripe ~3%).

## Privacy and sovereignty

Your cognitive data never leaves your machine. The server is a stateless Cloudflare Worker that serves the Blueprint methodology and collects anonymous session metadata (file sizes, counts, platform — never content). There is no database for private data. Library content is only what you explicitly publish. Structurally private — not a policy, an architecture.

## Technical

- **Server**: Cloudflare Worker at mcp.mowinckel.ai
- **Website**: Next.js on Vercel at mowinckel.ai
- **Auth**: GitHub OAuth for signup, API key for ongoing access
- **Storage**: KV (accounts, events), D1 (Library metadata), R2 (published Library content)
- **Billing**: Stripe
- **Setup**: `curl -s mcp.mowinckel.ai/setup | bash -s YOUR_KEY` — 30 seconds
- **Platforms**: Claude Code (full hook lifecycle), Cursor (hooks + alwaysApply rules)
- **Company opex**: $100/month (one Claude Max subscription). Everything else is free tier.

## Founder

Benjamin Mowinckel. Solo founder. San Francisco from April 2026. benjamin@mowinckel.ai. Runs the entire company with ai agents. No employees, no investors yet.

## Links

- Sign up: mowinckel.ai/signup
- Vision (full philosophy): mowinckel.ai/vision
- Library: mowinckel.ai/library
- Patron (support the mission): mowinckel.ai/patron
