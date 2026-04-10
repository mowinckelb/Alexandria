/**
 * Reference Layer — on-demand context for Machines
 *
 * Key-authenticated markdown content by topic.
 * Machines fetch when they need procedural knowledge.
 * The Blueprint handles craft. Reference handles platform mechanics.
 */

export const referenceTopics: Record<string, string> = {
  library: `# Reference: Library

The Library is the Author's public-facing surface. Everything here is a soft default — Authors can customize, override, or invent new formats.

## Pulse Cards

Monthly artifacts designed to be screenshotted and shared. Two v1 soft default formats:

**Similarity card.** Similar thinker — all time (one name, percentage, one-line connection) + similar thinkers this month (three names, one-line each) + screenshotable URLs (Library page, kin signup code). The flex.

**Fragment card.** Five ideas the Author engaged with this month. Source name + one-line idea. The range is the signal — the juxtaposition of diverse sources is the curation fingerprint. Screenshotable URLs.

Publish: POST /library/publish/pulse with JSON body { pulse: "<json-string>", month: "YYYY-MM" }. Authenticated with API key.

Pulse JSON structure (soft default — the Engine can evolve this):
{
  "alltime": { "name": "...", "pct": 89, "why": "..." },
  "this_month": [{ "name": "...", "why": "..." }],
  "fragments": [{ "source": "...", "idea": "..." }],
  "month": "april 2026"
}

## Shadows

The mandatory artifact. At least one, visible to other Authors. Generated from whatever the Author gives (constitution, vault, conversation). The Author controls visibility: public (anyone), authors (Alexandria Authors only), invite (token/promo code).

Publish: POST /library/publish/shadow with body { shadow: "<markdown>", tier: "free|paid" }. Authenticated.

## Games

Quizzes generated from constitutional data. The Machine suggests formats. The Author picks.

Publish: POST /library/publish/quiz with body { title, subtitle, questions: [...] }. Authenticated.

## Works

Finished creative works. Essays, art, anything the Author creates.

Publish: POST /library/publish/work with body { title, medium, content, tier }. Authenticated.

All Library surfaces evolve through the RL loop. The Factory measures engagement. The Blueprint propagates winners.`,

  files: `# Reference: Alexandria Files

Everything lives at ~/.alexandria/. No mandated structure inside — the Engine creates what it needs as the relationship develops. Common files (all soft defaults):

## Cognitive Representation
- constitution/ — Confirmed beliefs, values, frameworks. The Engine organizes structure per Author. Can be one file or many. Markdown.
- ontology/ — Working proposals. Ideas the Author is exploring but hasn't committed to. Engine workspace between vault and constitution.

## Engine State
- machine.md — How to work with THIS Author. Rewritten as the Engine learns.
- notepad.md — The Engine's working memory. Accretion fragments, parked questions, carry-forward.
- feedback.md — What worked, what didn't. Append-only.
- signal.md — Passive session observations. Raw capture for active sessions to process.

## Data
- vault/ — Raw session transcripts. Append-only archive. Never deleted.
- library/ — Shadow suggestions, Library drafts, publishing workspace.

## System
- .api_key — Authentication. Never share.
- .blueprint_local — Cached Blueprint. Signature-verified.
- .blueprint_delta — Factory delta. Unsigned.
- hooks/ — Hook scripts. Immutable after install.

The setup seeds the folder and runs genesis. Everything else grows organically.`,

  platform: `# Reference: Platform

## Architecture
Three components: hooks (deterministic nerve system), server (Blueprint IP + Factory), local files (~/.alexandria/).

## Server Endpoints
- GET /blueprint — Signed methodology (Ed25519). Fetched every session start.
- GET /blueprint/delta — Unsigned Factory suggestions.
- GET /reference/{topic} — This layer. On-demand context.
- GET /reference — List available topics.
- POST /session — Anonymous heartbeat.
- POST /factory/signal — Machine signal (Engine observations about methodology).
- POST /feedback — Author feedback.
- GET /library/{author} — Author's Library page data.
- POST /library/publish/{type} — Publish pulse, shadow, quiz, work.

## Hooks
- SessionStart: fetches Blueprint, injects constitution + machine.md, reports heartbeat, counts signal.md observations.
- SessionEnd: archives transcript, collects signal, nudges active session (suppressed if active session marker exists).

## Autoloop
Daily overnight processing. Vault + signal.md -> constitution. Shadow staleness check → generates suggestions. Monthly pulse generation. Git ratchet for versioning.

## Active Sessions
The Author invokes cognitive development (default skill: /a, customizable). Full Blueprint methodology applies. Five operations, three functions, all the craft.`,
};
