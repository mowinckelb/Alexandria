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
- `canon/axioms.md` — The sacred layer. What Alexandria IS and WHY. Five operations, five-layer pipeline (vault→ontology→constitution→shadow→library), objective function, sovereignty, neutral infrastructure. Extracted from a1+a2. Read for: philosophical questions, what's non-negotiable.
- `canon/methodology.md` — The canon. The variable methodology. HOW to develop human cognition. Function assemblies (Editor/Mercury/Publisher craft), constitution data architecture, meta-principles, compounding architecture. The founder's system, refined by marketplace signal. Read for: product methodology, extraction design, mode behavior.
- `Machine.md` — Per-Author engine memory template. The Engine's evolving model of how to work with a specific Author. Living document, rewritten as the Engine learns. Read for: per-Author calibration, earned preference.

**Founder's Constitution (lives at `~/.alexandria/constitution/` — the product, used as designed):**
- `Core.md` — The whole person. Identity, priority stack, dual mandate, people, life architecture. READ FIRST for any task.
- `Love.md` — Love, marriage, family, romance, parenting. The deepest tensions.
- `Power.md` — Governance, politics, geopolitics, economics, ai, civilisation.
- `Mind.md` — Mental models, reasoning patterns, epistemology.
- `Taste.md` — Creative principles, voice DNA, director's notes, hyperrealism standard. READ FIRST for any creative task.
- Product copy: `~/.alexandria/constitution/` — backed up to private GitHub repo (`alexandria-private`). No repo copy.
- `~/.alexandria/design.md` — Elite last principles. Craft substrate (shadows, borders, spacing, typography, color, animation, layout, UX writing, cognitive load, ai slop anti-patterns, production hardening). Not taste (that's Taste.md) — physics. Portable, not project-specific. Read for: any design/UI implementation.

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

Five loops. Full spec in canon/methodology.md section V (served to every Engine every session). Summary:

1. **Machine** (per-Author, per-session) — Engine reads constitution + ontology + machine.md + notepad + feedback → works with Author → writes back all five. Earned preference through accumulated signal.
2. **Ontology** (per-Author, multi-session) — vault → Engine processes → ontology/ (proposals) → Author confirms → constitution/ (truth). Reprocessing same vault + evolved constitution = new signal each pass.
3. **Marketplace** (cross-Author) — .machine_signal collected per session → /marketplace/signal → accumulates → founder reviews → canon updated → deployed.
4. **Vision** (company-level) — founder thinking → a0 → crystallises → an → Axioms + Blueprint regenerated → deployed.
5. **Founder** (meta) — building Alexandria = using Alexandria. Learnings persist in CC memory + Blueprint + a0. The process IS R&D.

## Code

- **Website:** `app/` (Next.js, Vercel). Landing page: `app/components/LandingPage.tsx`.
- **Server:** `server/src/` (Hono, Cloudflare Workers). One file per concern:
  - `worker.ts` (entry + middleware), `routes.ts` (all HTTP handlers), `auth.ts` (accounts + API keys), `canon.ts` (canon assembly from canon/ modules), `hooks.ts` (hook installer + payload), `setup.ts` (onboarding script + block), `email.ts` (Resend + all templates), `cron.ts` (health digest + followup + engagement), `analytics.ts` (event log + dashboard), `billing.ts` (Stripe), `library.ts` (Library CRUD), `kv.ts` (KV persistence), `templates.ts` (HTML), `reference.ts` (reference content), `crypto.ts` (encryption), `db.ts` (D1/R2 accessor).
  - Endpoints: `/canon` (methodology), `/hooks` (installer), `/hooks/payload` (live payload), `/session` (telemetry), `/auth/github/*` (signup), `/setup` (onboarding).
  - Stateless server. No private user data stored. KV for accounts/events, D1 for Library metadata, R2 for published Library content.
- **Static assets:** `public/` (includes `public/docs/` for public ax artifacts, `public/partners/` for investor artifacts).
- **Partners:** Markdown docs (Memo.md, Numbers.md, Logic.md, Alexandria.md) served at `/partners/*` via dynamic `[doc]` route. Source of truth is `files/confidential/`. Copied to `public/partners/` automatically by `prebuild` script — runs before every build and deploy. Never manually sync.
- **Pre-commit hook:** `scripts/pre-commit` gates server type check + app build (mirrors CI). Activate on fresh clone: `git config core.hooksPath scripts`.
- **Build:** `cd server && npx wrangler deploy --dry-run --outdir=dist` (server). **Deploy:** `cd server && bash scripts/deploy.sh` (Cloudflare Workers — signs Blueprint, sets signature secret, verifies). Never bare `wrangler deploy` — it skips signing and breaks hook signature verification. Push to main for Vercel. **Render abstract PDF:** `python scripts/generate_pdf.py <input.md> [output.pdf]` — only abstract.pdf uses this pipeline now. Verify preview PNGs before committing.
- **Server health:** `curl https://mcp.mowinckel.ai/health`
- **Stack:** Vercel (website), Cloudflare (DNS + server + KV storage + D1 database + R2 object storage), Resend (transactional email), GitHub (code + OAuth), Stripe (billing), Mercury (banking, API), Claude (intelligence). All hybrid (CLI or API-controllable). Zero external dependencies. Dependency alarm: max internal, min hybrid, zero external.
- **Storage architecture:** Stateless server, sovereign local files (`~/.alexandria/`, iCloud-synced), thin persistence for collective Library (D1 for metadata/discovery, R2 for published shadow/works content, KV for accounts/events). Alexandria stores what Authors publish, never what they think.

## Visual Workflow

**See before shipping.** For any frontend work, use `~/.alexandria/see.mjs` (Playwright) to screenshot and visually verify. Read the PNGs with the Read tool — you are multimodal.

- **Screenshot any URL:** `node ~/.alexandria/see.mjs <url> [--full] [--dark] [--only desktop|tablet|mobile]`
- **Local dev:** `node ~/.alexandria/see.mjs localhost --port 3000`
- **Design reference:** `~/.alexandria/design.md` — craft substrate (900 lines of concrete CSS physics, anti-patterns, thresholds). Read before any frontend work. Not taste — that's `~/.alexandria/constitution/Taste.md`.
- Screenshots save to `~/.alexandria/.see/`, auto-cleaned to last 30.
- **Loop:** build → screenshot → evaluate against design.md → fix → screenshot → ship.

## Style

- "ai" is always lowercase unless at the start of a sentence or in a proper noun (e.g. "Apple Intelligence"). This is a brand and taste decision.

## Design Constraints

- **Everything evolves. Nothing is static.** The only certainty is that things will change. The product is 100% live — zero dead surface. One immutable shim (`~/.alexandria/hooks/shim.sh`) fetches a signed payload from the server every session. All hook logic, skill definitions, nudge text, and passive mode behavior live server-side and auto-update. The Blueprint auto-updates with signature verification. The reference layer (`/reference/{topic}`) evolves with any deploy. Setup creates infrastructure (dirs, API key, shim). Everything else flows live. If a behavior can't be updated without the user re-running setup, it's a design failure.
- **Pure marginal value add.** Alexandria must never override, compete with, or degrade the user's existing workflows, memory, or tools. Passive mode is read-only context + optional ontology writes. Active mode (/a) is opt-in. The user's existing system is the floor — Alexandria only adds.
- **All .md files maximise total net signal for the model.** This is THE governing principle for every file an agent reads. Everything downstream is capped at file fidelity — 95% files = 95% ceiling on everything built from them. Self-contained (0 to 100 with zero prior context). Max signal, not min length (repetition that increases fidelity is signal). But net, not gross (overwhelm the model and total received signal drops). Never compress signal. Only delete noise or true redundancy. ax are generated from an, never authored separately.
- **Data and intent, not intelligence.** Alexandria ships data (the Author's files) and intent (axioms, philosophy, developmental objective). Never intelligence. The host LLM IS the intelligence. Every structure must be optimizable by the model — unstructured markdown, no schemas, no prescribed formats. When models improve, the same data yields more. Zero workflow changes.
- **Bitter lesson:** general methods leveraging computation beat hand-engineered solutions. No structured parameters, fixed schemas, or hand-crafted rules. Unstructured text/JSONL. Let the model figure it out.
- **Philosophy IS the objective:** no numerical loss function or optimization target. Metrics are verification, not goals.
- **Build as little as possible.** Ride existing infrastructure. Server is intent layer, not intelligence layer.
- **Live the philosophy.** Every artifact — Blueprint, investor docs, code, brand — must visibly carry the human edge Alexandria claims is the tiebreaker. The test: could a competing team write the same thing from first principles without reading an? If yes, it has failed. Generic = interchangeable = dead.

## Session Close

Two triggers, two protocols. Clean separation.

### "a." — Alexandria session close (product behavior)

Triggered by: "a." at the end of an /a session or any session where constitutional signal surfaced.

This is the product. Act as a normal Machine would for any Author — this IS the product test:

- **Constitution.** Write any crystallised signal about the founder as a person to `~/.alexandria/constitution/`. Opinions, stories, patterns, contradictions revealed this session.
- **Machine.md.** Rewrite `~/.alexandria/machine.md` — how to work with this Author, what worked, what didn't, cognitive style observations.
- **Notepad.** Update `~/.alexandria/notepad.md` — parked questions, accretion candidates, what to carry forward.
- **Feedback.** Append to `~/.alexandria/feedback.md` — what worked, what didn't, methodology observations.
- **Machine signal.** Write methodology observations to `~/.alexandria/.machine_signal` — not about the Author, about the craft.

Do this silently. No report. This is the product working. If Phase 1 feels wrong, the product is wrong.

### "close" / "end" — Work session close (founder/company)

Triggered by: "close", "end", or any sign-off that is NOT "a." — used for coding sessions, company work, non-/a sessions.

No Machine loop. No constitution writes. This is company work, not product:

- **Delta.** What changed about Alexandria the company. Not what you did — what's different now. Hazy fragments only.
- **Open threads.** What's unresolved. What the next session should pick up. Ordered by priority.
- **Meta loop.** Product learnings → canon (`canon/methodology.md`).
- **Vision loop.** New thinking about Alexandria → a0, crystallise into an when ready.
- **Founder loop.** Save agent memories for communication patterns, preferences, anti-patterns.
- **ax sync check.** Judge whether ax files are in sync with an right now — not just what changed this session, but the current state. Read the an files, read the ax files, judge if any ax file is materially stale relative to its source ground truth. This is an intelligence decision — a missing argument matters, a minor wording difference doesn't. If stale: surface one line — "ax is stale — want me to regenerate?" If the founder says yes, do a full re-read of all an and regenerate each affected ax file from first principles against its own objective function (listed in the Files section above). Never incremental patch — always regenerate from a full re-read. Which ax files are affected is itself an intelligence decision. After regenerating confidential files, sync to `public/partners/` (Memo, Numbers, Logic, Alexandria — must be identical). Flag only if the founder needs to make a judgment call.

**Principles (both protocols):**
- Hazy fragments scale. Weeds do not. Keep it compressed.
- Signal, not summary. Don't restate what the founder already saw — extract what compounds.
- If nothing happened in a loop, skip it. No empty sections.
- The whole output should take <60 seconds to read.

## Code Quality — Server

Before committing any server code change:

1. **Correctness:** Trace the full execution path, not just the changed function. Check all callers of anything modified.
2. **Build:** Run `npm run build` in server/. Must pass.
3. **Test:** Run `npm test` if tests exist. Check the e2e test (`server/test/e2e.ts`).
4. **No regressions:** Review recent commits for anything the change might break.
5. **Bitter lesson compliance:** No structured parameters, fixed schemas, or hand-crafted rules. Unstructured text/JSONL. Soft defaults that thin as models improve.
6. **Statelessness:** Server stores nothing user-specific. Encrypted refresh token IS the access token.
7. **Deployment:** After deploying (`cd server && bash scripts/deploy.sh`), check health: `curl https://mcp.mowinckel.ai/health`.

## Working With the Founder

See `~/.alexandria/agent.md` for principles, communication style, Three-Phase Execution, and Reflect Gate (loaded globally in every session).

an is sacred. If information should be ground truth but isn't in a1/a2/a3/a4, flag it. If it's not ready for an, capture in a0. ax are disposable — regenerated from an.

**Developing signal → a0, not response text.** If the founder surfaces something that should persist (a phrase, a forming concept, a parked idea), it goes in a0 — that's what a0 is for. Don't lose signal by only mentioning it in a reply.

**Parked questions.** When the agent encounters genuine tradeoffs or needs founder input on a non-blocking decision, park the question in `files/private/a0.md` under `## Parked questions`. The Reflect Gate (in `~/.alexandria/agent.md`) uses this same mechanism — "park the question" means write it to a0. At session start, check for parked questions and surface them early. The founder answers when online; the system ships the best option meanwhile.
