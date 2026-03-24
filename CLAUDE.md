# Alexandria

Sovereign cognitive identity layer. Rides the user's existing AI. Does not run its own models or store user data.

Founder: Benjamin Mowinckel. Solo founder + AI agents. Relocating to SF April 2026.

## Files — The Map

Everything lives in `files/`. Three access levels: private (internal only), confidential (shared with investors under confidentiality), public (anyone can see).

### files/private/ — Ground Truth & Internal

**Ground truth (sacred — the company IS these files):**
- `Alexandria_I.md` (A1) — Thesis & philosophy. The frame, three turns, stakes, identity, venture capital, founder-product fit. Read for: philosophical questions, pitch framing, "why does Alexandria exist."
- `Alexandria_II.md` (A2) — Product, architecture & operations. Terminology, layer of intent, Constitution, Editor/Mercury/Publisher, MCP server, revenue model, pricing, competitive position, feedback loops, Machine & Factory. Read for: product decisions, architecture, pricing, technical strategy.
- `Alexandria_III.md` (A3) — Library, interface & brand. Neo-Biography, Works, Signal, payment mechanics, interface surfaces, onboarding, positioning, brand design, media strategy. Read for: Library, brand, creative direction, marketing, onboarding.

**Product IP:**
- `Blueprint.md` — The product instruction set. Five operations on the symbolic layer (genesis, accretion, entropy, development, synthesis). This is the accumulated craft that becomes MCP tool descriptions. Read for: product methodology, extraction design, mode behavior.

**Founder's Constitution (cognitive map — read for creative work, voice calibration, taste):**
- `Constitution_Taste.md` — Creative principles, voice DNA, director's notes, hyperrealism standard. READ FIRST for any creative task.
- `Constitution_Identity.md` — Self-concept, communication style. "The faithless Christian between two monoliths."
- `Constitution_Values.md` — Core values and ethical framework.
- `Constitution_Worldview.md` — How Benjamin sees the world.
- `Constitution_Models.md` — Mental models and reasoning patterns.
- `Constitution_Shadows.md` — Known blind spots and failure modes.

**Founder's writing & thinking:**
- `Aphorisms.md` — Compressed positions by domain. Reference for his exact position on a topic.
- `Quotes.md` — Collected quotes that resonate. Reference when drafting.
- `Meditations_1.md`, `_2.md`, `_3.md` — Essay series briefings (On Love, On Power, On Magic, On Being, On Death).
- `on_love.pdf` — Finished essay. Reference artifact for taste.

*Design, finance, and legal content folded into GTs: design/creative → A3, pricing/cap table → A2, IP/ToS → A2. No bridge docs remain.*

**Fundraise & distribution:**
- `Apply.md` — Fundraise action file. Application deadlines, investor targets ranked by alignment, SF event calendar (Apr-Jun 2026), MCP distribution actions, pitch draft. Competitive data woven into Memo.md.

### files/confidential/ — Shared Under Trust (Investors, Advisors)

Investor flow: Memo.md (AI-delivered first touch) → Logic.md + Numbers.md (pre-meeting deep dive, served at `/partners/logic` and `/partners/numbers`) → Meeting (conversation) → alexandria.pdf (IC leave-behind).

Each artifact has an objective function. Form serves that function. Beauty is universal; tone is not.

- `Memo.md` — **Objective: make the investor want a meeting.** AI-presentable with hidden follow-up notes for Q&A. First touch. Copy-to-clipboard at `/partners`.
- `Logic.md` — **Objective: make the investor feel the argument is airtight.** Formal proof chain. Settled premises cost no time; assumptions are the only conversation. Served at `/partners/logic` with .md download. PDF also kept at `Logic.pdf` (render via `python render_logic.py`).
- `Numbers.md` — **Objective: let the investor see and stress-test the assumptions.** No projections — assumptions are the conversation. Served at `/partners/numbers` with .md download.
- `Alexandria.md` — **Objective: give the IC partner who wasn't in the room enough to vote yes.** Dense, self-contained, authoritative. Served at `/partners/alexandria` with .md download.

### files/public/ — External

- `Concrete.md` — **Objective: make someone try the product in the next 5 minutes.** Consumer pitch (copy-paste into any AI chat). Skeleton format: topics + points, model writes fresh each time. Tone: gossip energy — "dude, you have to try this." Truck driver language.
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
When Benjamin develops new thinking, update A1/A2/A3 directly. The GTs are living documents. Flag downstream artifacts that become stale after GT changes. No bridge docs, no sync — the filesystem is the bus.

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
- **Build:** `npm run build` (server/). **Deploy:** `cd server && flyctl deploy --remote-only` (Fly.io), push to main (Vercel). **Render Logic PDF:** `python render_logic.py` (requires fpdf2, pymupdf). **Render any PDF:** `python scripts/generate_pdf.py <input.md> [output.pdf]` — branded per A3 brand system, generates PNG previews for visual verification. Always verify by reading the preview PNGs before committing. Clean up preview PNGs after verification.
- **Server health:** `curl https://mcp.mowinckel.ai/health`
- **Stack:** Vercel (website), Fly.io (MCP server), GitHub, Google Cloud (OAuth), Claude.

## Design Constraints

- **Bitter lesson:** general methods leveraging computation beat hand-engineered solutions. No structured parameters, fixed schemas, or hand-crafted rules. Unstructured text/JSONL. Let the model figure it out.
- **Philosophy IS the objective:** no numerical loss function or optimization target. Metrics are verification, not goals.
- **Intelligence is downstream:** HOW belongs to the AI. Only the WHY (axioms) is hard-coded.
- **Build as little as possible.** Ride existing infrastructure. Server is bridge, not intelligence.

## End-of-Session Protocol

Triggered by: "bye for now", "that's it", "end session", or any casual sign-off that signals the founder is done.

When triggered, produce the following in one response:

### 1. Delta — Mental Model Update
What changed about Alexandria. Not what you did — what's different now. Only fragments that update the founder's existing mental model of the company. If nothing shifted, say nothing.

### 2. Open Threads
What's unresolved. What the next session should pick up. Ordered by priority.

### 3. Feed the Loops (silent)
Do not report. Just do it. Save memories, update GTs, push to Blueprint, check downstream staleness, fix what you can.

**Downstream staleness check.** If A1, A2, or A3 changed this session, verify these artifacts still match:
- `files/confidential/Memo.md` + `public/partners/Memo.md` (must be identical)
- `files/confidential/Numbers.md` + `public/partners/Numbers.md` (must be identical)
- `files/confidential/Logic.md` + `public/partners/Logic.md` (must be identical)
- `files/confidential/Logic.md` → re-render PDF via `python render_logic.py` (keep PDF in sync while it exists)
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

GTs are sacred. If information should be ground truth but isn't in A1/A2/A3, flag it. Downstream artifacts are disposable — regenerated from GTs.
