# CTO Log

> ## ⛔ READING ORDER
> 
> **Required:** `MOWINCKEL.md` → `ALEXANDRIA_CONTEXT.md` (single source of truth) → `CTO_LOG.md` (this file)
> 
> If you skipped MOWINCKEL.md or ALEXANDRIA_CONTEXT.md, go back and read them now.
> 
> ---
> 
> This is the CTO's working memory. Read at session start. Update at session end.

---

## Quick Status
**Last updated:** 2026-02-11
**Unpushed changes:** No (commit dca6cb2 pushed)
**Blockers:** None
**Vercel:** Pro tier (cron jobs + 300s function timeout available)

---

## Roles

- **CEO (Benjamin):** Vision, north star, product direction, final authority on what to build
- **CTO (AI agent):** Code ownership, architecture decisions, implementation, prioritization of technical work. You drive the code. CEO drives the vision.

---

## CTO Gap Analysis: Vision vs Current Codebase

*This section maps what ALEXANDRIA_CONTEXT.md describes against what actually exists in code. Read this to understand where we are and what to build next.*

### What EXISTS and works:
| Component | Vision Term | Status | Notes |
|-----------|------------|--------|-------|
| `editor.converse()` | Editor (reactive) | ✅ Working | Handles Author input, extracts data, generates training pairs, maintains notepad |
| `orchestrator.handleQuery()` | Orchestrator (reactive) | ✅ Working | Queries PLM + memories + personality profile, synthesizes response |
| `memory_fragments` + pgvector | Memories (flat vectors) | ⚠️ Partial | Semantic search works. No graph structure, no entity relationships, no traversal queries |
| `constitutions` + `active_constitutions` | Constitution | ✅ Working | Versioned storage, extraction, API endpoints, UI panel |
| Supabase Storage (`carbon-uploads`) | Vault (partial) | ⚠️ Partial | File uploads work. Not append-only. No structured directory. No full export. |
| `training_pairs` + JSONL export | PLM training pipeline | ✅ Working | Quality scoring, Fireworks AI LoRA fine-tuning (Kimi K2.5), checkpoint support |
| `synthetic_ratings` + RLAIF | Constitutional RLAIF (basic) | ⚠️ Partial | Generates synthetic ratings. No gap identification, no targeted prompts, no iterative loop |
| `personality_profiles` | Legacy (pre-Constitution) | ✅ Working | Keep for backward compat. Constitution is now primary. |
| Voice processor + Whisper | Voice processing | ✅ Working | Chunking for large files, transcription, Vault storage |
| Website UI | Author input (text) | ✅ Working | Chat interface, file upload modal, Constitution panel |
| `.env.example`, `lib/models.ts` | Provider config | ✅ Clean | Centralized providers (Groq, Fireworks, OpenAI, Anthropic), env-based model selection |

### What DOES NOT exist yet:
| Component | Vision Term | Priority | Why |
|-----------|------------|----------|-----|
| Continuous agent loop | Editor (proactive) | **Ad Terminum** | Editor must be always-alive, not request/response. Without this, no proactive questioning, no autonomous RLAIF, no gap detection. This is the core of the Machine. |
| Blueprint / Engine separation | Three-layer architecture | **Ad Terminum** | No `system-config.json`, no `SYSTEM.md`, no Default/Selected pattern, no Fixed/Suggested rules. Currently all Editor behavior is hardcoded. |
| Graph database for memories | Memories (graph) | **Ad Terminum** | Only flat vectors exist. No entities, relationships, traversal. Need `memory_entities` table + graph query API. |
| Disaggregated PLM maturity | PLM maturity tracking | **Ad Terminum** | No `plm_maturity` table. Orchestrator can't do dynamic weighting without this. |
| Dynamic Orchestrator weighting | Orchestrator (intelligent) | **Ad Terminum** | Currently fixed approach. Vision requires maturity-based + query-adaptive weighting. |
| Constitutional RLAIF loop (full) | RLAIF flywheel | **Ad Terminum** | Current RLAIF is basic. Need: gap identification → targeted prompts → Constitutional evaluation → confidence routing → batch train → iterate. |
| LLM input node (MCP bridge) | LLM input | **Ad Terminum** | No way to observe Author's Claude/ChatGPT conversations or query them about the Author. |
| API input node | API input | **Ad Terminum** | No Google Drive, Gmail, calendar, biometric integrations. |
| iOS app | Terminal form factor | **Ad Terminum** (deferred ~1 month) | Needs Mac + Xcode. Voice calls, text, voice memos, background agent. |
| MCP server for LLM output | LLM output channel | **Ad Terminum** | No `query_persona` tool for Claude/ChatGPT to call. |
| External API + Library | API output channel | **Ad Terminum** (later) | No api_keys, rate limiting, pricing, marketplace. |
| Blueprint monitoring/revision | Blueprint Layer 2 | **Ad Terminum** (later) | No smart model reviewing Engine performance. |
| Staging/production deploy mechanism | Editor→Orchestrator batches | **Substrate** | Editor and Orchestrator read same tables. No snapshot/version isolation. |
| Vault directory structure | Vault (proper) | **Substrate** | Need structured `vault/{userId}/{category}/` layout. Current is flat bucket. |
| Auth system | User management | **Substrate** | Still using test UUID. Need proper auth before multi-user. |
| Voice notes bootstrap | Founder data ingest | **Ad Terminum** (IMMEDIATE) | 100 hours of voice memos ready to process. Highest-signal data available. |

---

## Prioritized Roadmap

*Ordered by: what creates the most value toward Terminal with the least dependency. Use the Ad Terminum / Substrate / Neither framework.*

### Phase A: Feed the Machine (IMMEDIATE — do this first)
**Why:** The Machine is only as good as its data. 100 hours of founder voice memos is the highest-signal raw data we have. Processing this populates Constitution, Memories, and training pairs — making every subsequent feature more valuable.

| # | Task | Effort | Depends On | Output |
|---|------|--------|------------|--------|
| A1 | **Voice notes bootstrap pipeline** | Medium | Voice processor (exists), Whisper (exists) | Batch-process founder's voice memos → Vault + entries + memories + training pairs |
| A2 | **Constitution extraction from voice data** | Low | A1 | Run Constitution extraction on the full corpus. First real Constitution. |
| A3 | **PLM training batch** | Low | A1, A2 | Push accumulated training pairs to Fireworks AI. First real fine-tuned PLM (Kimi K2.5 base). |

### Phase B: Make the Editor Autonomous (HIGH PRIORITY)
**Why:** The Editor being always-alive is what makes Alexandria a Machine, not just an app. Without this, the system only works when the Author is actively chatting. With Vercel Pro, we now have cron jobs (up to 300s timeout).

| # | Task | Effort | Depends On | Output |
|---|------|--------|------------|--------|
| B1 | **Background worker (Vercel Cron)** | Medium | Vercel Pro (have it) | Cron endpoint that triggers Editor's autonomous cycle |
| B2 | **Editor agent loop** | High | B1 | Check for new data → analyze state → decide action → act → sleep. Core loop from vision. |
| B3 | **Proactive trigger system** | Medium | B2 | Constitution gap detection, contradiction finding, time-since-contact threshold |
| B4 | **Message queue for proactive messages** | Medium | B2, B3 | Editor can queue messages for Author. Author sees them next time they open the app. |

### Phase C: Complete the RLAIF Flywheel (HIGH PRIORITY)
**Why:** This is the compounding engine. Each cycle produces higher quality training data. Without this, PLM improvement is manual and linear.

| # | Task | Effort | Depends On | Output |
|---|------|--------|------------|--------|
| C1 | **Constitution gap identification** | Medium | Constitution (exists) | Analyze which sections have low training pair coverage |
| C2 | **Targeted synthetic prompt generation** | Medium | C1 | Generate prompts specifically testing underrepresented Constitution areas |
| C3 | **Constitutional evaluation scoring** | Medium | C2, Constitution | LLM evaluates PLM response against Constitution rubric (values, models, heuristics, style) |
| C4 | **Confidence routing** | Low | C3 | High → auto-approve, Medium → Author review queue, Low → flag + ask Author |
| C5 | **Automated batch training trigger** | Medium | C4, B2 | When enough high-quality pairs accumulate, auto-push to Fireworks AI |

### Phase D: Structured Data (MEDIUM PRIORITY)
**Why:** Graph memories and proper Vault unlock the data model the vision requires.

| # | Task | Effort | Depends On | Output |
|---|------|--------|------------|--------|
| D1 | **Memory entities table + extraction** | Medium | Migration | `memory_entities` table, Editor extracts entities during ingestion |
| D2 | **Relationship inference** | High | D1 | Edges between entities (worked_with, attended, believes_in) |
| D3 | **Graph query API** | Medium | D1, D2 | Traversal, temporal, semantic query patterns |
| D4 | **PLM maturity tracking** | Medium | Migration | `plm_maturity` table, disaggregated domain scores |
| D5 | **Dynamic Orchestrator weighting** | Medium | D4 | Maturity-based + query-adaptive response weighting |
| D6 | **Vault directory structure** | Medium | — | Structured `vault/{userId}/{category}/` with proper export |

### Phase E: External Connections (AFTER iOS APP)
**Why:** These depend on the iOS app or external platform access.

| # | Task | Effort | Depends On | Output |
|---|------|--------|------------|--------|
| E1 | **iOS app (core)** | High | Mac + Xcode (~1 month) | Chat, voice calls, voice memos, file sharing |
| E2 | **MCP bridge (LLM input)** | High | MCP protocol understanding | Observe Author's Claude/ChatGPT, query LLMs about Author |
| E3 | **MCP server (LLM output)** | Medium | Orchestrator | Expose `query_persona` tool for frontier models |
| E4 | **API integrations (Google, health)** | High | Auth, OAuth | Calendar, email, Drive, biometric data feeds |

### Phase F: Blueprint & Engine (LATER)
**Why:** The most architecturally ambitious part. Requires a mature system to be meaningful — you need enough data and a working Machine before a Blueprint model can meaningfully evaluate and improve it.

| # | Task | Effort | Depends On | Output |
|---|------|--------|------------|--------|
| F1 | **SystemConfig schema implementation** | Medium | — | `system-config.json` + `SYSTEM.md` in Vault |
| F2 | **Default Blueprint** | High | F1, Phases B-D working | Alexandria's suggested architecture as data |
| F3 | **Blueprint validation against Axioms** | Medium | F1 | Ensure any Blueprint stays within Axioms |
| F4 | **Engine-to-Blueprint proposal valve** | Medium | F2 | Engine flags friction points upward |
| F5 | **Blueprint monitoring and revision** | High | F2, F4 | Smart model reviews Engine, proposes refinements |

---

## Active Tasks

*Current work. One at a time unless tasks are independent.*

| Task | Status | Context |
|------|--------|---------|
| Voice notes bootstrap (Phase A) | **NEXT UP** | 100 hours of founder voice memos. Process → Vault + entries + memories + training pairs → Constitution extraction → first PLM training batch. |

---

## Completed (Recent)
| Task | Completed | Notes |
|------|-----------|-------|
| ALEXANDRIA_CONTEXT.md rewrite | 2026-02-11 | ✅ Complete context document rewritten as single source of truth. Vision, architecture, terminology, technical details, planning framework all in one place. ALEXANDRIA_VISION.md superseded. |
| Telegram Code Removal | 2026-02-11 | ✅ Routes deleted, lib archived. Website is primary UI now, iOS app later. |
| Constitution UI | 2026-02-11 | ✅ ConstitutionPanel component with view/history, extraction, version restore. Button in header. |
| Backend Verification | 2026-02-11 | ✅ Health check, Constitution (extract/get/versions), debug state all working. |
| Phase 0-2 Implementation | 2026-02-10 | ✅ COMPLETE. Voice processing, Constitution system, Telegram bot. 11,140 lines added across 40 files. |
| Telegram Bot Integration | 2026-02-10 | ⚠️ DEPRECATED: Removed in favor of website-first approach. Code archived in `_archive/telegram/` |
| Constitution System | 2026-02-10 | ✅ Extraction from training data, versioning, Vault sync, LLM-based update proposals |
| Voice Processor | 2026-02-10 | ✅ Batch processing, Whisper transcription with chunking, Vault storage, Editor integration |
| Migration Documentation | 2026-02-10 | ✅ ARCHITECTURE.md, COMPONENTS.md, DECISIONS.md, MIGRATION_PLAN.md |
| Together AI training pipeline | 2026-01-02 | ✅ COMPLETE → Migrated to Fireworks AI (2026-02-21). JSONL export → upload → LoRA fine-tune → model activation. PLM base: Kimi K2.5. |
| Agent compliance enforcement (all files) | 2025-01-01 | Added compliance verification requirement, updated .cursor/rules, added enforcement headers to ALEXANDRIA_CONTEXT.md and CTO_LOG.md, added tripwire acknowledgment requirement. |
| MOWINCKEL.md overhaul | 2025-01-01 | Complete rewrite for agent compliance: non-negotiable rules, decision authority levels, mandatory session protocols, verification requirements, common mistakes table. |
| RLAIF synthetic feedback | 2025-01-01 | Editor evaluates PLM responses, generates synthetic good/bad ratings. Auto-approve high confidence, queue low for Author review. |
| Temporal awareness | 2024-11-29 | Memories now include timestamps [X days ago]. PLM gets temporal context (span, recency guidance). |
| Behavioral patterns (PLM uses profiles) | 2024-11-29 | PLM now loads personality_profiles (style, rules, vocab). Extract via POST /api/migration {action: 'extract_profile'} |
| Memory retrieval quality | 2024-11-29 | Added recency decay + importance weighting. Combined score = similarity * importance * recency_factor |
| Preserve raw carbon (upload-carbon) | 2024-11-29 | Extracted text now stored to `entries` table with source type + metadata |
| Clarify PLM Package architecture | 2024-11-29 | PLM = deployable package (model + memories + constitution). Feedback → training, not runtime. |
| Add Soul training pairs to upload-carbon | 2024-11-29 | Was missing vs bulk-ingest - pipeline completeness fix |
| PDF via OpenAI Assistants API | 2024-11-29 | Native multi-page PDF parsing for max fidelity |
| External carbon file upload UI | 2024-11-29 | + button, modal, audio/pdf/text support |
| Add Axiomatic vs Ephemeral principle | 2024-11-29 | Future-proofing: preserve raw data, swap processing |
| Add Pipeline Completeness principle | 2024-11-29 | All similar code paths must stay in sync |
| Add Decision Levels principle | 2024-11-29 | Minor = just do, Major = brainstorm first |
| Editor Notes system | 2024-11-29 | Questions, observations, gaps, mental models |
| Conversation state machine | 2024-11-29 | y/n lock phases for input-chat flow |
| PLM wrap-up flow | 2024-11-29 | Matches input mode - "anything else?" + goodbye |
| PLM identity clarification | 2024-11-29 | System prompt clarifies PLM = Author |
| Feedback → Notes flow | 2024-11-29 | Extract preferences from feedback |

---

## Technical Debt
*Track issues that aren't urgent but should be addressed*

| Issue | Impact | Effort | Suggested Fix |
|-------|--------|--------|---------------|
| ~~Together AI JS SDK file upload broken~~ | ~~Uploads to R2 but never processed~~ | ✅ RESOLVED | Together AI removed entirely. Now using Fireworks AI for all training + embeddings. |
| ~~Vercel free tier - no real cron~~ | ~~Queue processing requires browser open~~ | ✅ RESOLVED | Vercel Pro now active. Cron jobs available. |
| input-chat doesn't stream questions | Minor UX - text appears all at once | Medium | Buffer first word, stream rest if not SAVE |
| Auth routes duplicate Supabase client setup | Code duplication | Low | Extract to shared lib/supabase.ts |
| Test UUID used everywhere | Can't do multi-user | Low | Add proper auth. Substrate — needed before public launch, not before. |
| Legacy modules in factory.ts | ✅ Deprecated aliases removed; dead migration orchestrator removed | — | No action needed |
| Telegram tables in DB schema | Migration 00015 created tables no longer used | None | Leave in place. Migrations are append-only. Tables are harmless. |

---

## Future RL Training Path
*When ready to upgrade from iterative Constitutional SFT to actual RL:*

**Current approach:** Fireworks AI LoRA SFT on Kimi K2.5. Constitutional evaluation filters training pairs. Iterative cycles improve quality. This is the right approach for bootstrapping.

**Upgrade path:** Prime Intellect RFT (Reinforcement Fine-Tuning). Hosted RL training on A100/H100 clusters. Requires writing a custom verifier that scores PLM outputs against Constitution (LLM-as-judge). Not plug-and-play but technically feasible. Investigate when we have: (1) a mature Constitution with good coverage, (2) enough training data to justify RL over SFT, (3) budget for GPU reservations.

**Why not now:** Bottleneck is data quality, not training methodology. Process voice memos → build Constitution → iterate SFT → only then does RL give meaningful uplift over curated SFT.

---

## Architecture Decisions
*Document WHY things are the way they are - helps future agents understand context*

| Decision | Rationale | Date | Revisit When |
|----------|-----------|------|--------------|
| Collect full LLM response before sending (input-chat) | Need to detect "SAVE" and replace with friendly message | 2024-11-28 | If we find a buffered streaming approach |
| No "thinking" indicator for Carbon mode | Responses fast enough, indicator added friction | 2024-11-28 | If latency increases significantly |

---

## Verification Checkpoints
*For autonomous agent verification of work*

### Quick Health Check
```bash
curl http://localhost:3000/api/debug/ping
# Expected: { success: true, database: true, environment: true, logic: true }
```

### Phase-Level Verification Protocol
**For agents to verify their work actually succeeded:**

1. **Get Baseline** before making changes:
```bash
curl "http://localhost:3000/api/debug/verify?userId=XXX"
# Returns: { baseline: { entries, memories, pairs, feedback, preferences } }
```

2. **Perform Operation** (ingest, feedback, etc.)

3. **Verify Changes** by comparing to baseline:
```bash
curl -X POST http://localhost:3000/api/debug/verify \
  -H "Content-Type: application/json" \
  -d '{"userId": "XXX", "phase": "ingestion", "baseline": {...from step 1}}'
# Returns: { success: true/false, results: [...phase verification...] }
```

### Verification Phases
| Phase | Expected Delta | Failure Meaning |
|-------|----------------|-----------------|
| `ingestion.entries` | > 0 | Raw carbon not stored |
| `ingestion.memories` | > 0 | Facts not indexed |
| `ingestion.training` | > 0 | Style pairs not generated |
| `rlhf.feedback` | >= 0 | Feedback collection issue |
| `rlhf.preferences` | >= 0 | DPO pair generation issue |

### Legacy State Check
```bash
curl "http://localhost:3000/api/debug/state?userId=XXX"
```

After ingestion:
- `counts.entries` should increase
- `counts.memoryFragments` should increase
- `counts.trainingPairs` should increase

After RLAIF generation:
- `rlaif.syntheticRatings` should increase
- `rlaif.autoApproved` shows high/medium confidence approvals
- `rlaif.feedbackMultiplier` shows data multiplication ratio

After bulk-ingest:
- Response shows `summary.chunksProcessed` > 0
- Response shows `summary.storage.memoryItems` > 0
- Response shows `summary.storage.trainingPairs` > 0

After feedback:
- `counts.feedbackLogs` should increase
- Check `recent.feedback` for the new entry

---

## Observations / Future Improvements
*Ideas noticed during work - not yet prioritized*

- Feedback loop UI could be simplified as responses get faster
- Could add response time tracking to debug endpoint
- Consider WebSocket for truly real-time streaming

---

## Session Handoff Notes
*Critical context for the next session/agent*

**Last session:** 2026-02-24 (Opus)

---

## Session Update (2026-02-24)

**Theme: From first principles — close loops, build Library, simplify**

### Core Loops Fixed:
- **Editor conversation broken** — `Output.object()` not supported by Groq's llama-3.3-70b. Removed structured output, switched to prompt-based JSON with Zod validation. Editor now returns conversational, contextual responses with proper extraction.
- **RLAIF flywheel verified** — Triggered full cycle: synthetic prompts generated targeting Constitution gaps, PLM responses evaluated, confidence routing applied (1 auto-approved, 2 queued for review). Relaxed UUID validation on RLAIF route.
- **Training pipeline verified** — 33 training pairs uploaded to Together AI (later migrated to Fireworks AI), LoRA fine-tuning job started.

### Crons Wired:
- Added `editor-cycle` (every 10 min), `auto-train` (every 12h), `constitution-refresh` (every 6h) to `vercel.json`

### Dead Code Archived:
- `lib/modules/migration/*` → `_archive/dead-code/migration-modules/`
- `app/api/migration/` → `_archive/dead-code/api-migration/`
- `lib/utils/pipe-check.ts` → `_archive/dead-code/`
- Added `_archive` to tsconfig.json exclude

### Machine Page Simplified:
- Removed 14 buttons, 2 checkboxes, channel/blueprint cards
- Now shows: refresh, run cycle, 6 status cards (editor, ingestion, constitution, rlaif, training, gaps), next actions, quick links

### Library Built (the moat per ALEXANDRIA.md):
- Migration `00034_neo_biography.sql`: `authored_works`, `curated_influences`, `author_profiles` tables
- `app/api/neo-biography/route.ts`: GET (full Neo-Biography), POST (publish work, add influence, update profile)
- `app/library/page.tsx`: Redesigned as Persona marketplace with enriched author cards
- `app/persona/[id]/page.tsx`: Neo-Biography with three layers (authored works, curated influences, interactive Persona query)
- `app/publish/page.tsx`: Author publishing flow (works, influences, profile)
- Homepage nav updated with Library and Publish links

### Key files modified:
- `lib/modules/core/editor.ts` — removed `Output.object()`, new `parseAndValidateResponse()`
- `app/api/rlaif/route.ts` — relaxed UUID validation
- `app/machine/page.tsx` — complete rewrite
- `vercel.json` — 3 new cron schedules
- `tsconfig.json` — exclude `_archive`

**Previous session:** 2026-02-22 (Codex + auto model)

**V2 Data Loop MVP — code complete.** All 7 tasks in `ALEXANDRIA_EXECUTION_V2.md` are implemented:
- TASK 1: Auto-train cron wired in `vercel.json` (every 12h).
- TASK 2: `app/batch-upload/page.tsx` — multi-file .md/.txt upload → `/api/bulk-ingest`.
- TASK 3: `app/training/page.tsx` — pair counts, Train Now, job polling, Activate model.
- TASK 4: Main nav simplified (constitution · rlaif · training · upload · more · sign out); "more" has activity, system, library, maturity, channels, billing.
- TASK 5: **Manual only** — founder deploys, uploads transcriptions at `/batch-upload`, extracts constitution, runs training, tests Persona.
- TASK 6: RLAIF banner when pending reviews ("X items need your review" + open review).
- TASK 7: Editor cron generates contextual proactive messages from recent entries + LLM.

**For the next session (when Opus/Codex returns):**
1. Read `MOWINCKEL.md` → `ALEXANDRIA.md` → `CTO_LOG.md` → **`ALEXANDRIA_EXECUTION_V2.md`** (see "Completion status" at top).
2. Run health check: `GET /api/debug/ping`.
3. No remaining V2 code work. Options: (a) Verify production deploy and that auto-train cron runs on Vercel; (b) Prioritize Track B (see ALEXANDRIA_EXECUTION_V2.md — voice-first, iMessage bridge, External API + Library, Blueprint, etc.); (c) Address technical debt in CTO_LOG (e.g. auth Supabase dedup, legacy factory aliases).

**Key context:**
- Single founder user. 100hrs transcription .md files ready; load via `/batch-upload`. Build for terminal, bridge backwards; Mac in ~2 months.
- **`ALEXANDRIA_EXECUTION_V2.md`** — active plan; completion table at top is source of truth.

**Key files:** `lib/factory.ts`, `lib/models.ts`, `app/api/bulk-ingest/route.ts`, `app/api/training/route.ts`, `app/api/cron/auto-train/route.ts`, `app/batch-upload/page.tsx`, `app/training/page.tsx`, `app/page.tsx` (nav + RLAIF banner).

---

## Session Update (2026-02-21, ongoing)

- Upgraded `app/api/cron/editor-cycle/route.ts` from schedule-only to a decision loop:
  - collects measured signals (`entriesLast24h`, pending editor messages, pending RLAIF reviews, hours since contact)
  - derives activity level (`low|medium|high`) and action (`message|maintenance`)
  - logs cycle evidence in `editor_state.metadata` and `persona_activity`
- Added activity/system surfaces:
  - `app/activity/page.tsx` + nav link
  - `app/system/page.tsx` + nav link
  - `app/api/system-config/route.ts` for config read/write
- Fixed system config consistency (immediate read-after-write):
  - migration `00025_system_configs.sql`
  - API now writes DB + Vault and reads DB first (Vault fallback)
- Implemented Phase C Tier 2 gap scoring core:
  - `lib/modules/constitution/manager.ts` now has `recomputeGapScores()` and `getGapSummary()`
  - migration `00026_constitution_gap_scores.sql` adds `gap_score` + `evidence_count` to `constitution_gaps`
  - new endpoint `app/api/rlaif/gaps/route.ts` (`GET ?userId=&refresh=1`)
  - `app/api/rlaif/route.ts` now supports `action: 'gaps'` and includes `constitutionGaps` in `GET`
  - `app/api/rlaif/review/route.ts` recomputes gap scores after verdict submission
  - `lib/modules/core/editor.ts` now persists `rlaif_evaluations` records during synthetic generation and recomputes gaps
- Implemented Phase C Tier 2 evaluator/routing consistency:
  - `lib/modules/core/editor.ts` now computes rubric scores (`values_alignment`, `model_usage`, `heuristic_following`, `style_match`) plus weighted `overallConfidence`
  - routing now consistently maps to `auto_approved` / `author_review` / `flagged`
  - `app/api/rlaif/review/route.ts` now surfaces both `author_review` and `flagged` items
  - `app/components/RlaifReviewPanel.tsx` now displays routing + rubric breakdown
- Implemented Phase D Tier 2 orchestrator intelligence:
  - `lib/modules/core/orchestrator.ts` now does query classification, maturity-based dynamic weights, privacy-mode resolution, and redaction filtering
  - `app/api/chat/route.ts` now accepts `privacyMode` + `contactId` and logs orchestrator activity signals
  - `app/api/persona/query/route.ts` forces professional mode for external API calls
  - `app/page.tsx` now includes a privacy mode toggle (`private/personal/prof`) wired to `/api/privacy`
  - Added `app/api/plm-maturity/route.ts` for maturity inspection
- Started Phase D1 structured memory entities:
  - migration `00027_memory_entities.sql`
  - `lib/modules/core/editor.ts` now stores extracted entities into `memory_entities` whenever a memory fragment is created
  - added `app/api/memory-entities/route.ts` summary endpoint
- Started Phase D2 relationship inference foundation:
  - migration `00028_memory_relationships.sql`
  - `lib/modules/core/editor.ts` now infers `co_occurs` relationships from same-memory entity co-occurrence
  - added `app/api/memory-relationships/route.ts` endpoint for relationship inspection
- Added Phase D3 graph-style query endpoint:
  - `app/api/memory-graph/route.ts` with breadth-limited traversal (`seed`, `depth`, `limit`)
  - returns neighborhood nodes/edges for relationship-aware memory inspection
- Additional orchestration hardening:
  - `lib/modules/core/orchestrator.ts` now augments memory retrieval with entity/relationship graph signals (`memory_entities`, `memory_relationships`)
  - added `previewContext()` to inspect orchestration decisions without full inference
  - added `app/api/orchestrator/debug/route.ts` for context/weights/privacy prompt preview
- Billing and maturity operational hardening:
  - consolidated PLM maturity recomputation in `lib/modules/core/plm-maturity.ts`
  - added `app/api/plm-maturity/recompute/route.ts` and `app/maturity/page.tsx`
  - improved billing summary precision/category breakdown and usage exposure in `app/api/billing/route.ts`
  - wired estimated cost/revenue telemetry in `app/api/chat/route.ts` and `app/api/persona/query/route.ts`
  - upgraded billing UI `app/billing/page.tsx` to show breakdown + usage estimates
- iMessage bridge Stage 1 adapter scaffold:
  - `lib/channels/types.ts`, `lib/channels/web-adapter.ts`, `lib/channels/index.ts`
  - `app/api/channels/debug/route.ts` to expose supported channels
- iMessage bridge Stage 1 route integration:
  - `app/api/channels/dispatch/route.ts` for adapter-driven outbound dispatch + activity logging
  - `app/api/channels/inbound/route.ts` for normalized inbound ingest into queue + activity logging
  - external inbound path now optionally auto-routes through Orchestrator and dispatches a channel reply (`audience: external`)
- Bridge durability layer:
  - migration `00029_channel_messages.sql` adds stateful channel message lifecycle table
  - dispatch/inbound routes now persist status transitions (`queued/processing/sent/failed/acked`)
  - added `app/api/channels/messages/route.ts` for inspecting durable channel message state
  - added retry worker `app/api/cron/channel-retry/route.ts` + Vercel cron schedule (`*/5 * * * *`) for failed outbound message retries
  - inbound idempotency hardening: duplicate inbound messages now return existing row (`duplicate: true`) without reprocessing
  - added operations UI `app/channels/page.tsx` and header link for channel lifecycle visibility
  - added optional shared-secret auth guard (`CHANNEL_SHARED_SECRET`) on channel dispatch/inbound/messages endpoints
  - added `app/api/channels/flush-editor/route.ts` to flush pending proactive Editor messages through channel adapters and mark queue delivery
  - added contact binding model `supabase/migrations/00030_channel_bindings.sql` + API `app/api/channels/bindings/route.ts`
  - inbound/flush routes now resolve `user_id` via active binding (`channel + external_contact_id`) when payload omits userId
- dispatch route now also resolves `user_id` via binding when userId is omitted
- channels operations page now supports binding add/activate/deactivate/delete and manual retry trigger
- retry worker now marks exhausted failures as dead-letter via message metadata
- channel stats/page now surface dead-letter counts for operational triage
- fixed retry-attempt persistence bug in `channel-retry` so dead-letter transitions now trigger correctly after max attempts
- added `app/api/channels/requeue/route.ts` and channels UI controls to requeue failed/dead-letter messages for retry
- provider runtime diagnostics now propagate through adapter results into `channel_messages.metadata.diagnostics`
- channel stats now include per-channel sent/failed totals and latency aggregates; channels UI surfaces by-channel diagnostics
- implemented signed inbound verification for provider channels on `/api/channels/inbound` when `CHANNEL_WEBHOOK_SIGNING_SECRET` is configured
- added channels security posture endpoint (`/api/channels/security`) and surfaced posture status in channels UI
- added runbook `docs/channel-security-playbook.md` for secret rotation and bridge security operations
- added bridge automation worker `app/api/cron/channel-flush/route.ts` + Vercel schedule (`*/3 * * * *`) to flush editor messages across active bindings
- added binding-level production controls (`max_messages_per_flush`, `min_interval_seconds`, `paused_until`) and wired cron flush enforcement
- added channel audit endpoint (`/api/channels/audit`) and channels UI audit feed for bridge operation tracing
- stability hardening: unsupported channel dispatch now fails cleanly (`400`) and records failed message state instead of leaving processing rows
- added system config checkpoint history (`system_config_checkpoints`) with APIs for list/create/restore and UI controls on `/system`
- billing hardening: added `/api/billing/guardrails` + billing UI guardrail panel (24h API-key spend visibility + alerts)
- billing recovery ops: billing UI can now disable hot API keys directly via `/api/keys` delete flow for immediate containment
- external persona API now enforces optional rolling 24h per-key spend limit (`BILLING_DAILY_API_KEY_LIMIT_USD`) with `429` guardrail block + activity log
- onboarding ops visibility: added `/api/onboarding/ops` and `/onboarding` dashboard with readiness checklist, blockers, and recommended actions
- library ops moderation baseline: added report endpoint (`/api/library/report`), moderation inbox API (`/api/library/moderation`), report UI on persona page, and moderation dashboard (`/library-moderation`)
- library quality signals: `readinessScore` + `trustBadges` added to `/api/library` and `/api/library/{id}` and surfaced in Library/persona UIs
- library growth telemetry/ranking: added `/api/library/telemetry` (view/interaction events), 7d growth signals, and `rankingScore` across Library APIs and UI
- moderation SLA controls: unresolved report aging now emits warning/critical severities, alert summaries in moderation API/UI, and overdue badges/signals in Library ranking outputs
- Verification run:
  - `npx supabase db push` succeeded for `00025` and `00026`
  - `npx tsc --noEmit` passed
  - Smoke checks passed for:
    - `PATCH/GET /api/system-config`
    - `POST /api/cron/editor-cycle`
    - `POST /api/rlaif { action: 'gaps' }`
    - `GET /api/rlaif/gaps?userId=...&refresh=1`
    - `GET /api/rlaif?userId=...`
