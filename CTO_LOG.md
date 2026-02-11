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

**Last session:** 2026-02-11

**What was done this session:**
1. Reviewed latest changes and verified backend systems working
2. Codebase cleanup: consolidated legacy imports → `getPipelineTools()`, centralized providers in `lib/models.ts`, created `.env.example`
3. CEO provided complete Alexandria vision document — saved raw and formatted as new `ALEXANDRIA_CONTEXT.md`
4. CTO analyzed full gap between vision and codebase, wrote prioritized roadmap (see above)
5. Simplified reading order to 3 files: MOWINCKEL.md → ALEXANDRIA_CONTEXT.md → CTO_LOG.md

**Infrastructure change:** Vercel Pro now active. Cron jobs and 300s function timeouts available.

**For the next session — start here:**
1. Read MOWINCKEL.md → ALEXANDRIA_CONTEXT.md → this file (especially the Gap Analysis and Roadmap above)
2. Run health check: `GET /api/debug/ping`
3. Start on **Phase A: Voice Notes Bootstrap** — this is the immediate priority
4. The roadmap above (Phases A through F) is the CTO's recommended build order. Follow it unless CEO redirects.

**Key files to know:**
- `ALEXANDRIA_CONTEXT.md` — Single source of truth (vision + architecture + technical)
- `lib/factory.ts` — Module instantiation (use `getPipelineTools()` for ingestion, `getEditor()` for conversations)
- `lib/models.ts` — All provider instances centralized here
- `lib/modules/core/editor.ts` — Editor agent (currently reactive only)
- `lib/modules/core/orchestrator.ts` — Orchestrator agent
- `app/api/upload-carbon/route.ts` — File upload pipeline (audio/PDF/image/text)
- `app/api/process-queue/route.ts` — Background job processing
- `.env.example` — All required environment variables documented
