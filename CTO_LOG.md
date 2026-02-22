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
| `training_pairs` + JSONL export | PLM training pipeline | ✅ Working | Quality scoring, Together AI LoRA fine-tuning, checkpoint support |
| `synthetic_ratings` + RLAIF | Constitutional RLAIF (basic) | ⚠️ Partial | Generates synthetic ratings. No gap identification, no targeted prompts, no iterative loop |
| `personality_profiles` | Legacy (pre-Constitution) | ✅ Working | Keep for backward compat. Constitution is now primary. |
| Voice processor + Whisper | Voice processing | ✅ Working | Chunking for large files, transcription, Vault storage |
| Website UI | Author input (text) | ✅ Working | Chat interface, file upload modal, Constitution panel |
| `.env.example`, `lib/models.ts` | Provider config | ✅ Clean | Centralized providers (Groq, Together, OpenAI), env-based model selection |

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
| A3 | **PLM training batch** | Low | A1, A2 | Push accumulated training pairs to Together AI. First real fine-tuned PLM. |

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
| C5 | **Automated batch training trigger** | Medium | C4, B2 | When enough high-quality pairs accumulate, auto-push to Together AI |

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
| Together AI training pipeline | 2026-01-02 | ✅ COMPLETE. JSONL export → Python upload → LoRA fine-tune → model activation. PLM now uses fine-tuned model with memories. Checkpoint training noted as future enhancement. |
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
| Together AI JS SDK file upload broken | Uploads to R2 but never processed | N/A | Using Python SDK wrapper as workaround. Monitor if JS SDK gets fixed. |
| ~~Vercel free tier - no real cron~~ | ~~Queue processing requires browser open~~ | ✅ RESOLVED | Vercel Pro now active. Cron jobs available. |
| input-chat doesn't stream questions | Minor UX - text appears all at once | Medium | Buffer first word, stream rest if not SAVE |
| Auth routes duplicate Supabase client setup | Code duplication | Low | Extract to shared lib/supabase.ts |
| Test UUID used everywhere | Can't do multi-user | Low | Add proper auth. Substrate — needed before public launch, not before. |
| Legacy modules in factory.ts | Deprecated aliases still exported | Low | Remove deprecated `getIngestionTools` etc. after confirming no usage |
| Telegram tables in DB schema | Migration 00015 created tables no longer used | None | Leave in place. Migrations are append-only. Tables are harmless. |

---

## Future RL Training Path
*When ready to upgrade from iterative Constitutional SFT to actual RL:*

**Current approach:** Together AI LoRA SFT. Constitutional evaluation filters training pairs. Iterative cycles improve quality. This is the right approach for bootstrapping.

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

**Last session:** 2026-02-21

**What was done this session:**
1. **Documentation consolidation (COMPLETE):**
   - Moved new `ALEXANDRIA.md` (886 lines, complete vision) from Downloads to project root
   - Archived old files: `ALEXANDRIA_CONTEXT.md`, `ALEXANDRIA_VISION.md`, `docs/alexandria-complete-context-raw.md` → `_archive/`
   - Updated `.cursor/rules/project-context.mdc` to reference `ALEXANDRIA.md` as single source of truth
   - **ALEXANDRIA.md is now read-only** - founder's vision document, treat as immutable

2. **Major architectural shifts in new vision (Opus MUST read full ALEXANDRIA.md):**
   - **Protocol vs Platform:** Open protocol (Axioms + validation suite), proprietary platform (Library + Blueprint)
   - **Blueprint model has full code editing capability:** Can modify entire codebase within Axiom constraints, not just config
   - **Vault is "just files":** Local folder spec (iCloud/Files), not hosted infrastructure. "Everything is just files."
   - **iMessage-first, no app:** Editor and Orchestrator are iMessage contacts, web dashboard for management only
   - **Library mandatory (Axiom):** Every Persona must be in Library, privacy controls access not presence
   - **Neo-Biography:** Multimedia canvas (essays, film, poetry, music) + curated influences + interactive Persona API
   - **Editor personality critical:** Engagement optimization (humor, price haggling, retention games) part of extraction mandate

3. **Execution started (Tier 1 foundations implemented):**
   - **Phase A voice bootstrap:** `app/api/voice-bootstrap/route.ts` now supports `files`, `storagePaths`, and `storagePrefix` with `dryRun` preview + deduplication; UI now has `voice bootstrap` trigger and live `VoiceBootstrapProgress` polling.
   - **Vault append-only hardening:** `lib/utils/vault.ts` defaults to no overwrite (`allowOverwrite: false`), with explicit overwrite only for `constitution/current.md`.
   - **Transcript persistence:** `lib/modules/voice/processor.ts` now always stores transcript entries to `entries` with job/source metadata.
   - **Phase B infra:** added migrations `00016_editor_state.sql`, `00017_editor_messages.sql`; new endpoints `app/api/cron/editor-cycle/route.ts` and `app/api/editor-messages/route.ts`; input UI now polls and surfaces proactive Editor messages; `input-chat` updates `editor_state.last_contact_at`.
   - **Cron wiring:** `vercel.json` now schedules `/api/process-queue` every 2 min and `/api/cron/editor-cycle` every 5 min.
   - **Phase C infra:** added migrations `00018_constitution_gaps.sql`, `00019_plm_maturity.sql`, `00020_rlaif_evaluations.sql`; new review API `app/api/rlaif/review/route.ts`.
   - **Phase D infra:** added migrations `00021_privacy_settings.sql`, `00022_persona_activity.sql`; new API `app/api/privacy/route.ts`.
   - **Phase F infra:** added migration `00023_api_access.sql`; new APIs `app/api/keys/route.ts`, `app/api/persona/query/route.ts`; Library scaffolds `app/library/page.tsx`, `app/persona/[id]/page.tsx`.
   - **Additional integration pass:** added `app/components/RlaifReviewPanel.tsx` and wired it into main UI; added activity API `app/api/activity/route.ts`; replaced Library/Persona scaffolds with data-backed endpoints `app/api/library/route.ts` and `app/api/library/[id]/route.ts`; added Phase G defaults `lib/types/system-config.ts`, `system-config.default.json`, `SYSTEM.default.md`; added Phase H billing migration/API/UI (`00024_billing_ledger.sql`, `app/api/billing/route.ts`, `app/billing/page.tsx`); header links now include `library` and `billing`.
   - **Health check note:** `GET /api/debug/ping` currently fails locally because no dev server is running (`Unable to connect to localhost:3000`).

**For the next session — start here:**
1. Read MOWINCKEL.md → ALEXANDRIA.md → CTO_LOG.md (this file) → ALEXANDRIA_EXECUTION.md
2. Run health check: `GET /api/debug/ping`
3. ✅ Applied new migrations (`00016` through `00023`) to Supabase via `npx supabase db push`.
4. ✅ Verified runtime endpoints with dev server up:
   - `GET /api/debug/ping` → `{ success: true, database: true, environment: true, logic: true }`
   - `POST /api/cron/editor-cycle` → success with processed users
   - `POST/GET /api/editor-messages` enqueue + ack flow works
   - `GET/PATCH /api/privacy` works
   - `GET /api/rlaif/review` works
   - `POST/GET/DELETE /api/keys` works
   - `POST /api/persona/query` with valid API key streams responses successfully
   - `GET /api/library` and `GET /api/library/{id}` return data-backed responses
   - `GET /api/activity` returns persona activity timeline
   - `GET /api/billing` returns expense/income ledger summary
5. Continue with remaining Tier 1 integration/UI wiring from `ALEXANDRIA_EXECUTION.md`, then escalate Tier 2 architecture items.

**Key files to know:**
- **`ALEXANDRIA.md`** — Complete vision (886 lines, read-only, single source of truth)
- **`ALEXANDRIA_EXECUTION.md`** — Tiered execution plan with task breakdown
- `MOWINCKEL.md` — Agent protocol (non-negotiable rules)
- `CTO_LOG.md` — This file (current state, roadmap, gap analysis)
- `lib/factory.ts` — Module instantiation
- `lib/models.ts` — All provider instances centralized
- `.env.example` — All required environment variables

**Architecture change (CRITICAL):** The new ALEXANDRIA.md has 3 persistent components (Constitution, PLM, Vault), NOT 4. Memories is gone as a separate component. `memory_fragments` is now a search index over Vault data. The graph database plans (old Phase D) are deprioritized. See ALEXANDRIA_EXECUTION.md "Architecture Reconciliation" for details.

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
- Verification run:
  - `npx supabase db push` succeeded for `00025` and `00026`
  - `npx tsc --noEmit` passed
  - Smoke checks passed for:
    - `PATCH/GET /api/system-config`
    - `POST /api/cron/editor-cycle`
    - `POST /api/rlaif { action: 'gaps' }`
    - `GET /api/rlaif/gaps?userId=...&refresh=1`
    - `GET /api/rlaif?userId=...`
