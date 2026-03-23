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

Investor flow: Memo.md (AI-delivered first touch) → Logic.pdf + Numbers.xlsx (pre-meeting deep dive) → Meeting (conversation) → Alexandria.md/alexandria.pdf (IC leave-behind).

- `Memo.md` — Investment memo. AI-presentable with hidden follow-up notes for Q&A. First touch.
- `Alexandria.md` — Source markdown for IC-ready PDF. Dense, self-contained, for the partner who wasn't in the room. Render to PDF for distribution.
- `alexandria.pdf` — Rendered IC overview (regenerate from Alexandria.md when content changes).
- `Numbers.xlsx` — Financial model and projections.
- `Logic.pdf` — Formal argument chain (44 premises, 11 conclusions, 20 assumptions).

### files/public/ — External

- `Concrete.md` — Consumer pitch (copy-paste into any AI chat). Skeleton format: topics + points, model writes fresh each time.
- `Vision.md` — Full philosophy in plain English. ~20 min read. For someone who wants to understand everything.
- `abstract.pdf` — Philosophical abstract PDF.
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
- **MCP server:** `server/src/` (Node.js + Express + @modelcontextprotocol/sdk, Railway).
  - Key files: `index.ts` (entry), `tools.ts` (axioms + soft defaults), `modes.ts` (mode defaults), `drive.ts` (Drive I/O), `analytics.ts` (Factory events), `auth.ts` (OAuth), `crypto.ts` (encryption).
  - 5 tools: update_constitution, read_constitution, activate_mode, update_notepad, log_feedback.
  - Stateless: encrypted Google refresh token IS the access token. No user data stored.
- **Static assets:** `public/` (includes `public/docs/` served by website).
- **Build:** `npm run build` (server/). **Deploy:** `fly deploy` from server/ (Railway), push to main (Vercel).
- **Server health:** `curl https://alexandria-production-7db3.up.railway.app/health`
- **Stack:** Vercel (website), Railway (MCP server), GitHub, Google Cloud (OAuth), Claude.

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
Do not report. Just do it. Save memories, update GTs, push to Blueprint, flag downstream staleness in the fragments if the founder needs to know.

**Principles:**
- Hazy fragments scale. Weeds do not. Keep it compressed.
- Signal, not summary. Don't restate what the founder already saw — extract what compounds.
- If nothing happened in a loop, skip it. No empty sections.
- The whole output should take <60 seconds to read.

## Working With the Founder

See `~/.claude/CLAUDE.md` for principles and communication style (loaded globally in every session).

GTs are sacred. If information should be ground truth but isn't in A1/A2/A3, flag it. Downstream artifacts are disposable — regenerated from GTs.
