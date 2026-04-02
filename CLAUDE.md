# Alexandria

Greek philosophy infrastructure. Rides the user's existing ai. Does not run its own models or store user data.

Founder: Benjamin Mowinckel. Solo founder + ai agents. Relocating to SF April 2026.

## Files — The Map

Everything lives in `files/`. Three access levels: private (internal only), confidential (shared with investors under confidentiality), public (anyone can see).

### files/private/ — The a-system

**a0 — marginal thought (the agora):**
- `a0.md` — The company's inner agora. Everything the founder thinks about Alexandria that hasn't crystallised into an. Competing frames, open questions, developing ideas, parked signal. Dynamic, living, for ai. When something crystallises, it migrates to an and leaves a0.

**an — ground truth (the senate). Sacred — the company IS these files:**
- `Alexandria_I.md` (a1) — Thesis & philosophy. The frame, five dimensions, property 5, architecture of humanity development, fragment dynamics, stakes, identity/droplet, civilisational thread. Read for: philosophical questions, "why does Alexandria exist," the thesis.
- `Alexandria_II.md` (a2) — Product. Terminology, layer of intent, Constitution, Vault, Editor/Mercury/Publisher, notepad, Blueprint, Library (V1 + Neo-Biography + access tiers + economics), three turns, PLM. Read for: product decisions, what the product IS, how it works conceptually.
- `Alexandria_III.md` (a3) — Operations & revenue. Server, prosumer architecture, hooks, session loop, Factory, pricing, revenue model, feedback loops, onboarding, interface surfaces, target Author. Read for: architecture, pricing, technical strategy, how it runs.
- `Alexandria_IV.md` (a4) — Strategy & brand. Founder-product fit, competitive position, survival framework, four competitors, three-actor landscape. Positioning/pitch, brand design, logo, visual design, natural elements, media strategy, writing voice. Read for: competitive questions, brand, creative direction, investor framing.

**Product IP (ax — downstream of an, regenerated when an changes):**
- `Axioms.md` — The sacred layer. What Alexandria IS and WHY. Five operations, five-layer pipeline (vault→ontology→constitution→shadow→library), objective function, sovereignty, neutral infrastructure. Extracted from a1+a2. Read for: philosophical questions, what's non-negotiable.
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
- `Meditations.md` — Working document for all Meditations volumes (On Love, On Power, On Magic, On Being, On Destiny). Essay architecture, marginalia, literary references, status. Constitutional signal extracted to `~/.alexandria/constitution/`.
- `on_love.pdf` — Finished essay. Reference artifact for taste.

*Design, finance, and legal content folded into an: design/creative → a4, pricing/cap table → a3, IP/ToS → a4. No bridge docs remain.*

**Fundraise & distribution:**
- `Apply.md` — Fundraise action file. Application deadlines, investor targets ranked by alignment, SF event calendar (Apr-Jun 2026), MCP distribution actions, pitch draft. Competitive data woven into Memo.md.

### files/confidential/ — ax confidential (the open, under trust)

Investor flow: Memo.md (ai-delivered first touch) → Logic.md + Numbers.md (pre-meeting deep dive, served at `/partners/logic` and `/partners/numbers`) → Meeting (conversation) → Alexandria.md (at `/partners/alexandria`).

Each artifact has an objective function. Form serves that function. Beauty is universal; tone is not.

- `Memo.md` — **Objective: make the investor want a meeting.** ai-presentable with hidden follow-up notes for Q&A. First touch. Copy-to-clipboard at `/partners`.
- `Logic.md` — **Objective: make the investor feel the argument is airtight.** Formal proof chain. Settled premises cost no time; assumptions are the only conversation. Served at `/partners/logic` with .md download.
- `Numbers.md` — **Objective: let the investor see and stress-test the assumptions.** No projections — assumptions are the conversation. Served at `/partners/numbers` with .md download.
- `Alexandria.md` — **Objective: give the IC partner who wasn't in the room enough to vote yes.** Dense, self-contained, authoritative. Served at `/partners/alexandria` with .md download.

### public/docs/ — ax public (the open)

Public artifacts live in `public/docs/`. Vercel serves static files from `public/`, so this is the only location. No mirror, no symlink.

- `Concrete.md` — **Objective: make someone try the product in the next 5 minutes.** Consumer pitch (copy-paste into any ai chat). Skeleton format: topics + points, model writes fresh each time. Tone: gossip energy — "dude, you have to try this." Truck driver language.
- `Vision.md` — **Objective: make someone who reads the whole thing believe the thesis is true.** Full philosophy in plain English. ~15 min read. Covers: five dimensions, the shift, the alien, property 5, the game, three turns, the Library, conductor model, decay, civilisational lineage. Tone: calm, clear, confident. No jargon. The argument does the work.
- `abstract.pdf` — **Objective: emotional lock-in for the deeply convinced.** Philosophical abstract PDF. Mode 1 art.
- `Trust.md` — **Objective: make the prosumer confident everything Alexandria installs is safe.** Full transparency: what the curl does, what hooks fire, what goes to the server, what stays local. They can verify every line before running it.
- `logo_*.png` — Logo variants. `logo_reference.html` — interactive reference.
- `Benjamin_Mowinckel_Headshot.jpg` — Founder headshot.

## Compounding Loops

Five loops. Full spec in Blueprint.md section V (served to every Engine every session). Summary:

1. **Machine** (per-Author, per-session) — Engine reads constitution + ontology + machine.md + notepad + feedback → works with Author → writes back all five. The therapist moat.
2. **Ontology** (per-Author, multi-session) — vault → Engine processes → ontology/ (proposals) → Author confirms → constitution/ (truth). Reprocessing same vault + evolved constitution = new signal each pass.
3. **Factory** (cross-Author) — .machine_signal collected per session → /factory/signal → accumulates → founder reviews → Blueprint updated → auto-fetched by all Authors.
4. **Vision** (company-level) — founder thinking → a0 → crystallises → an → Axioms + Blueprint regenerated → deployed.
5. **Founder** (meta) — building Alexandria = using Alexandria. Learnings persist in CC memory + Blueprint + a0. The process IS R&D.

## Code

- **Website:** `app/` (Next.js, Vercel). Landing page: `app/components/LandingPage.tsx`.
- **Server:** `server/src/` (Hono, Cloudflare Workers).
  - Key files: `worker.ts` (entry), `prosumer.ts` (all live endpoints — Blueprint, hooks, auth, session), `modes.ts` (Blueprint methodology), `analytics.ts` (Factory events → KV), `billing.ts` (Stripe), `templates.ts` (HTML), `kv.ts` (KV persistence), `crypto.ts` (encryption).
  - Endpoints: `/blueprint` (methodology), `/hooks` (auto-update scripts), `/session` (telemetry), `/auth/github/*` (signup), `/setup` (onboarding).
  - Stateless server. No private user data stored. KV for accounts/events, D1 for Library metadata, R2 for published Library content.
- **Static assets:** `public/` (includes `public/docs/` for public ax artifacts, `public/partners/` for investor artifacts).
- **Partners:** Markdown docs (Memo.md, Numbers.md, Logic.md, Alexandria.md) served at `/partners/*` via dynamic `[doc]` route. Source of truth is `files/confidential/`. Copied to `public/partners/` automatically by `prebuild` script — runs before every build and deploy. Never manually sync.
- **Build:** `cd server && npx wrangler deploy --dry-run --outdir=dist` (server). **Deploy:** `cd server && npx wrangler deploy && bash server/test/smoke.sh` (Cloudflare Workers), push to main (Vercel). **Render abstract PDF:** `python scripts/generate_pdf.py <input.md> [output.pdf]` — only abstract.pdf uses this pipeline now. Verify preview PNGs before committing.
- **Server health:** `curl https://mcp.mowinckel.ai/health`
- **Stack:** Vercel (website), Cloudflare (DNS + server + KV storage + D1 database + R2 object storage + email via MailChannels), GitHub (code + OAuth), Stripe (billing), Mercury (banking, API), Claude (intelligence). All hybrid (CLI or API-controllable). Zero external dependencies. Dependency alarm: max internal, min hybrid, zero external.
- **Storage architecture:** Stateless server, sovereign local files (`~/.alexandria/`, iCloud-synced), thin persistence for collective Library (D1 for metadata/discovery, R2 for published shadow/works content, KV for accounts/events). Alexandria stores what Authors publish, never what they think.

## Style

- "ai" is always lowercase unless at the start of a sentence or in a proper noun (e.g. "Apple Intelligence"). This is a brand and taste decision.

## Design Constraints

- **All .md files maximise total net signal for the model.** This is THE governing principle for every file an agent reads. Everything downstream is capped at file fidelity — 95% files = 95% ceiling on everything built from them. Self-contained (0 to 100 with zero prior context). Max signal, not min length (repetition that increases fidelity is signal). But net, not gross (overwhelm the model and total received signal drops). Never compress signal. Only delete noise or true redundancy. ax are generated from an, never authored separately.
- **Data and intent, not intelligence.** Alexandria ships data (the Author's files) and intent (axioms, philosophy, developmental objective). Never intelligence. The host LLM IS the intelligence. Every structure must be optimizable by the model — unstructured markdown, no schemas, no prescribed formats. When models improve, the same data yields more. Zero workflow changes.
- **Bitter lesson:** general methods leveraging computation beat hand-engineered solutions. No structured parameters, fixed schemas, or hand-crafted rules. Unstructured text/JSONL. Let the model figure it out.
- **Philosophy IS the objective:** no numerical loss function or optimization target. Metrics are verification, not goals.
- **Build as little as possible.** Ride existing infrastructure. Server is intent layer, not intelligence layer.
- **Live the philosophy.** Every artifact — Blueprint, investor docs, code, brand — must visibly carry the human edge Alexandria claims is the tiebreaker. The test: could a competing team write the same thing from first principles without reading an? If yes, it has failed. Generic = interchangeable = dead.

## End-of-Session Protocol

Triggered by: "a.", "bye for now", "that's it", "end session", or any casual sign-off that signals the founder is done.

Two phases, strictly ordered. Phase 1 simulates what a normal Author Machine would do — this IS the product test. Phase 2 is founder-only company work. Never mix them.

### Phase 1 — Machine (user 0, product behavior)

Act as a normal Machine would for any Author. This is what every user gets:

- **Constitution.** Write any crystallised signal about the founder as a person to `~/.alexandria/constitution/`. Opinions, stories, patterns, contradictions revealed this session.
- **Machine.md.** Rewrite `~/.alexandria/machine.md` — how to work with this Author, what worked, what didn't, cognitive style observations.
- **Notepad.** Update `~/.alexandria/notepad.md` — parked questions, accretion candidates, what to carry forward.
- **Feedback.** Append to `~/.alexandria/feedback.md` — what worked, what didn't, methodology observations.
- **Machine signal.** Write methodology observations to `~/.alexandria/.machine_signal` — not about the Author, about the craft.

Do this silently. No report. This is the product working.

### Phase 2 — Founder (company work)

Only after Phase 1 completes. This is the company, not the product:

- **Delta.** What changed about Alexandria the company. Not what you did — what's different now. Hazy fragments only.
- **Open threads.** What's unresolved. What the next session should pick up. Ordered by priority.
- **Meta loop.** Product learnings → `files/private/Blueprint.md`.
- **Vision loop.** New thinking about Alexandria → a0, crystallise into an when ready.
- **Founder loop.** Save CC memories for communication patterns, preferences, anti-patterns.
- **Downstream staleness check.** If a1, a2, a3, or a4 changed, verify ax still match:
  - `files/private/Axioms.md` (from a1+a2)
  - `files/private/Blueprint.md` (from a2)
  - `files/confidential/Memo.md` + `public/partners/Memo.md` (identical)
  - `files/confidential/Numbers.md` + `public/partners/Numbers.md` (identical)
  - `files/confidential/Logic.md` + `public/partners/Logic.md` (identical)
  - `files/confidential/Alexandria.md` + `public/partners/Alexandria.md` (identical)
  - `public/docs/Concrete.md`, `public/docs/Vision.md`, `public/docs/Trust.md`
  - `app/privacy/page.tsx`, `app/terms/page.tsx`
  Fix silently. Flag only if the founder needs to make a judgment call.

**Principles:**
- Phase 1 is the product test. If Phase 1 feels wrong, the product is wrong.
- Hazy fragments scale. Weeds do not. Keep it compressed.
- Signal, not summary. Don't restate what the founder already saw — extract what compounds.
- If nothing happened in a loop, skip it. No empty sections.
- The whole output should take <60 seconds to read.

## Three-Phase Execution

For any significant piece of work (new features, architecture, multi-file changes), follow three phases:

**Phase 1 — Plan the plan.** Research, explore, think. Produce a concrete plan with clear steps, dependencies, and decisions. Run the plan through the founder's principles (first principles, bitter lesson, hard-code alarm, dependency alarm). The plan is the artifact — get it right before touching code.

**Phase 2 — Confirm the plan.** Present the plan to the founder. Compressed, not exhaustive. The founder confirms, adjusts, or rejects. No execution until confirmed. If the founder is not available and the work is non-blocking, park the plan and move on.

**Phase 3 — Execute the plan.** Once confirmed, execute end-to-end. The plan should be detailed enough that execution is mechanical — "press go and it just works." Reflect after execution against the principles.

This process applies to significant work, not trivial fixes. The reflect gate (below) still applies to all non-trivial changes. The three phases and the reflect gate are complementary — the plan gets reflected before confirmation, and the execution gets reflected before commit.

## Reflect Gate

Before committing any non-trivial change, reflect against `~/.claude/CLAUDE.md` principles. Loop until clean:

1. Check every change against the principles. Hard-codes? Complexity that could be eliminated? Human bottlenecks in maximisation games? Missing verification? Anything that breaks when capabilities improve?
2. If violations found → fix them. Re-check. Repeat until clean.
3. If genuine tradeoff (no clear best option) → ship the best option now, park the question in `files/private/a0.md` under `## Parked questions` for the founder's next session.
4. If the fix is blocked on founder input (taste call, strategic direction) → ship what works, park the question.

This is not a manual step. It's how changes get made. The founder should never need to call /check — it's already built into the workflow.

The check gate applies to: code commits, trigger updates, an/ax changes, architecture decisions. It does NOT apply to: trivial fixes (typos, sync), session protocol, or when the founder explicitly says to skip it.

## Working With the Founder

See `~/.claude/CLAUDE.md` for principles and communication style (loaded globally in every session).

an is sacred. If information should be ground truth but isn't in a1/a2/a3/a4, flag it. If it's not ready for an, capture in a0. ax are disposable — regenerated from an.

**Write developing signal to a0 immediately.** When the founder surfaces haze-level signal — a phrase they like, a concept forming, a question they're turning over, a name for something — write it to a0 in real time. Don't park it in response text. Don't wait for session close. a0 IS where developing signal lives. If it crystallises later, it migrates to an. If it doesn't, it stays in a0 as parked signal. The cost of writing to a0 is near zero. The cost of losing a developing fragment is high.

**Parked questions.** When the agent encounters genuine tradeoffs or needs founder input on a non-blocking decision, park the question in `files/private/a0.md` under `## Parked questions`. At session start, check for parked questions and surface them early. The founder answers when online; the system ships the best option meanwhile.
