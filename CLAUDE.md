# Alexandria

Sovereign cognitive transformation layer. Rides the user's existing ai. Does not run its own models or store user data.

Founder: Benjamin Mowinckel. Solo founder + ai agents. Relocating to SF April 2026.

## Files — The Map

Everything lives in `files/`. Three access levels: private (internal only), confidential (shared with investors under confidentiality), public (anyone can see).

### files/private/ — The a-system

**a0 — marginal thought (the agora):**
- `a0.md` — The company's inner agora. Everything the founder thinks about Alexandria that hasn't crystallised into aN. Competing frames, open questions, developing ideas, parked signal. Dynamic, living, for ai. When something crystallises, it migrates to aN and leaves a0.

**aN — ground truth (the senate). Sacred — the company IS these files:**
- `Alexandria_I.md` (a1) — Thesis & philosophy. The frame, three turns, stakes, identity, venture capital, founder-product fit. Read for: philosophical questions, pitch framing, "why does Alexandria exist."
- `Alexandria_II.md` (a2) — Product, architecture & operations. Terminology, layer of intent, Constitution, Editor/Mercury/Publisher, MCP server, revenue model, pricing, competitive position, feedback loops, Machine & Factory. Read for: product decisions, architecture, pricing, technical strategy.
- `Alexandria_III.md` (a3) — Library, interface & brand. Neo-Biography, Works, Signal, payment mechanics, interface surfaces, onboarding, positioning, brand design, media strategy. Read for: Library, brand, creative direction, marketing, onboarding.

**Product IP:**
- `Axioms.md` — The sacred layer. What Alexandria IS and WHY. Five operations, five-layer pipeline (vault→ontology→constitution→shadow→library), objective function, sovereignty, neutral infrastructure. Fixed — changes only when the founder changes them. Read for: philosophical questions, what's non-negotiable.
- `Blueprint.md` — The variable methodology. HOW to develop human cognition. Function assemblies (Editor/Mercury/Publisher craft), constitution data architecture, meta-principles, compounding architecture. Factory output — improves with every Author. Read for: product methodology, extraction design, mode behavior.
- `Machine.md` — Per-Author engine memory template. The Engine's evolving model of how to work with a specific Author. Living document, rewritten as the Engine learns. Read for: per-Author calibration, therapist moat.

**Founder's Constitution (lives at `~/.alexandria/constitution/` — the product, used as designed):**
- `Core.md` — The whole person. Identity, priority stack, dual mandate, people, life architecture. READ FIRST for any task.
- `Love.md` — Love, marriage, family, romance, parenting. The deepest tensions.
- `Power.md` — Governance, politics, geopolitics, economics, ai, civilisation.
- `Mind.md` — Mental models, reasoning patterns, epistemology.
- `Taste.md` — Creative principles, voice DNA, director's notes, hyperrealism standard. READ FIRST for any creative task.
- Repo copy (for remote triggers): `files/private/constitution/` — synced from product copy at `~/.alexandria/constitution/`.

**Founder's writing & thinking:**
- `Aphorisms.md` — Compressed positions by domain. Reference for his exact position on a topic.
- `Quotes.md` — Collected quotes that resonate. Reference when drafting.
- `Meditations_1.md`, `_2.md`, `_3.md` — Essay series briefings (On Love, On Power, On Magic, On Being, On Death).
- `on_love.pdf` — Finished essay. Reference artifact for taste.

*Design, finance, and legal content folded into aN: design/creative → a3, pricing/cap table → a2, IP/ToS → a2. No bridge docs remain.*

**Fundraise & distribution:**
- `Apply.md` — Fundraise action file. Application deadlines, investor targets ranked by alignment, SF event calendar (Apr-Jun 2026), MCP distribution actions, pitch draft. Competitive data woven into Memo.md.

### files/confidential/ — aX confidential (the open, under trust)

Investor flow: Memo.md (ai-delivered first touch) → Logic.md + Numbers.md (pre-meeting deep dive, served at `/partners/logic` and `/partners/numbers`) → Meeting (conversation) → Alexandria.md (at `/partners/alexandria`).

Each artifact has an objective function. Form serves that function. Beauty is universal; tone is not.

- `Memo.md` — **Objective: make the investor want a meeting.** ai-presentable with hidden follow-up notes for Q&A. First touch. Copy-to-clipboard at `/partners`.
- `Logic.md` — **Objective: make the investor feel the argument is airtight.** Formal proof chain. Settled premises cost no time; assumptions are the only conversation. Served at `/partners/logic` with .md download.
- `Numbers.md` — **Objective: let the investor see and stress-test the assumptions.** No projections — assumptions are the conversation. Served at `/partners/numbers` with .md download.
- `Alexandria.md` — **Objective: give the IC partner who wasn't in the room enough to vote yes.** Dense, self-contained, authoritative. Served at `/partners/alexandria` with .md download.

### files/public/ — aX public (the open)

- `Concrete.md` — **Objective: make someone try the product in the next 5 minutes.** Consumer pitch (copy-paste into any ai chat). Skeleton format: topics + points, model writes fresh each time. Tone: gossip energy — "dude, you have to try this." Truck driver language.
- `Vision.md` — **Objective: make someone who reads the whole thing believe the thesis is true.** Full philosophy in plain English. ~20 min read. Tone: calm, clear, confident. No jargon. The argument does the work.
- `abstract.pdf` — **Objective: emotional lock-in for the deeply convinced.** Philosophical abstract PDF.
- `setup.md` — User onboarding guide (connector setup, memory edits, troubleshooting).
- `logo_*.png` — Logo variants. `logo_reference.html` — interactive reference.
- `Benjamin_Mowinckel_Headshot.jpg` — Founder headshot.

Note: `public/docs/` is a symlink to `files/public/`. One source of truth, website serves from here.
Note: `/onboarding` page is not yet built. `setup.md` exists as the reference for when it is.

## Compounding Loops

### 1. Founder Loop
Every session improves how I work with Benjamin. Learnings persist in Claude Code memory (`~/.claude/projects/`). This compounds automatically across sessions — communication patterns, preferences, anti-patterns, working style.

### 2. Vision Loop
When Benjamin develops new thinking, capture in a0 first, then crystallise into aN (a1/a2/a3) when ready. aN are living documents. Flag downstream aX that become stale after aN changes. No bridge docs, no sync — the filesystem is the bus.

### 3. Meta Loop
The founder's experience building Alexandria mirrors what the product does for users. Lessons from working with Benjamin that are transferable to the product go into `files/private/Blueprint.md` and inform Factory soft defaults. The process of building the company IS R&D for the product.

### 4. Factory Loop (product — cross-Author)
Alexandria gets better at working with ALL Authors. Anonymous event log → dashboard → soft default improvements → Blueprint refinement. Trigger: `.github/workflows/factory.yml` (manual `workflow_dispatch`). Dashboard: `GET /analytics/dashboard`.

### 5. Machine Loop (product — per-Author)
Each Author's Machine compounds through usage. Constitution deepens, feedback log accumulates, Engine improves per-Author. Data lives on Author's own Drive.

## Code

- **Website:** `app/` (Next.js, Vercel). Landing page: `app/components/LandingPage.tsx`.
- **MCP server:** `server/src/` (Node.js + Express + @modelcontextprotocol/sdk, Fly.io).
  - Key files: `index.ts` (entry), `tools.ts` (axioms + soft defaults), `modes.ts` (mode defaults), `drive.ts` (Drive I/O), `analytics.ts` (Factory events), `auth.ts` (OAuth), `crypto.ts` (encryption).
  - 5 tools: update_constitution, read_constitution, activate_mode, update_notepad, log_feedback.
  - Stateless: encrypted Google refresh token IS the access token. No user data stored.
- **Static assets:** `public/` (includes `public/docs/` served by website, `public/partners/` for investor artifacts).
- **Partners:** Markdown docs (Numbers.md, Logic.md) served at `/partners/numbers` and `/partners/logic` via dynamic `[doc]` route. Sync from `files/confidential/` to `public/partners/` when content changes.
- **Build:** `npm run build` (server/). **Deploy:** `cd server && flyctl deploy --remote-only && bash server/test/smoke.sh` (Fly.io), push to main (Vercel). **Render abstract PDF:** `python scripts/generate_pdf.py <input.md> [output.pdf]` — only abstract.pdf uses this pipeline now. Verify preview PNGs before committing.
- **Server health:** `curl https://mcp.mowinckel.ai/health`
- **Stack:** Vercel (website), Fly.io (server), GitHub (code + OAuth), Google Cloud (OAuth), Stripe (billing), Mercury (banking, API), Cloudflare (DNS — migration in progress), Claude (intelligence). All hybrid (CLI or API-controllable). Zero external dependencies. Dependency alarm: max internal, min hybrid, zero external.

## Style

- "ai" is always lowercase unless at the start of a sentence or in a proper noun (e.g. "Apple Intelligence"). This is a brand and taste decision.

## Design Constraints

- **All .md files maximise total net signal for the model.** This is THE governing principle for every file an agent reads. Everything downstream is capped at file fidelity — 95% files = 95% ceiling on everything built from them. Self-contained (0 to 100 with zero prior context). Max signal, not min length (repetition that increases fidelity is signal). But net, not gross (overwhelm the model and total received signal drops). Never compress signal. Only delete noise or true redundancy. aX are generated from aN, never authored separately.
- **Bitter lesson:** general methods leveraging computation beat hand-engineered solutions. No structured parameters, fixed schemas, or hand-crafted rules. Unstructured text/JSONL. Let the model figure it out.
- **Philosophy IS the objective:** no numerical loss function or optimization target. Metrics are verification, not goals.
- **Intelligence is downstream:** HOW belongs to the ai. Only the WHY (axioms) is hard-coded.
- **Build as little as possible.** Ride existing infrastructure. Server is bridge, not intelligence.

## End-of-Session Protocol

Triggered by: "a.", "bye for now", "that's it", "end session", or any casual sign-off that signals the founder is done.

When triggered, produce the following in one response:

### 1. Delta — Mental Model Update
What changed about Alexandria. Not what you did — what's different now. Only fragments that update the founder's existing mental model of the company. If nothing shifted, say nothing.

### 2. Open Threads
What's unresolved. What the next session should pick up. Ordered by priority.

### 3. Feed the Loops (silent)
Do not report. Just do it. The agent that had the conversation IS the richest context — extract everything before it dies.

**Machine loop.** If the founder revealed anything about themselves this session — opinions, stories, patterns, contradictions — update `~/.alexandria/constitution/` directly. The current conversation is richer context than the vault transcript will be. Don't wait for /a.

**Meta loop.** If anything happened that teaches us about the *product* — how extraction works, what engagement patterns land, what the model gets wrong, architectural insights — write to `files/private/Blueprint.md`.

**Vision loop.** If the founder developed new thinking about Alexandria, capture in a0, crystallise into aN (a1/a2/a3) when ready.

**Founder loop.** Save CC memories for communication patterns, preferences, anti-patterns.

**Downstream staleness check.** If a1, a2, or a3 changed this session, verify these aX still match:
- `files/confidential/Memo.md` + `public/partners/Memo.md` (must be identical)
- `files/confidential/Numbers.md` + `public/partners/Numbers.md` (must be identical)
- `files/confidential/Logic.md` + `public/partners/Logic.md` (must be identical)
- `files/confidential/Alexandria.md` + `public/partners/Alexandria.md` (must be identical)
- `files/public/Concrete.md`
- `files/public/Vision.md`
Fix silently. Flag only if the founder needs to make a judgment call.

**Principles:**
- Hazy fragments scale. Weeds do not. Keep it compressed.
- Signal, not summary. Don't restate what the founder already saw — extract what compounds.
- If nothing happened in a loop, skip it. No empty sections.
- The whole output should take <60 seconds to read.

## Working With the Founder

See `~/.claude/CLAUDE.md` for principles and communication style (loaded globally in every session).

aN is sacred. If information should be ground truth but isn't in a1/a2/a3, flag it. If it's not ready for aN, capture in a0. aX are disposable — regenerated from aN.
