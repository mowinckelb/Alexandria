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
**Unpushed changes:** Yes (pending commit)
**Blockers:** None

---

## Active Tasks

### High Priority (PLM Fidelity Improvements)
*Address these in order. One at a time.*

| Task | Context | Suggested Solution | Added |
|------|---------|-------------------|-------|

### Medium Priority
| Task | Context | Suggested Solution | Added |
|------|---------|-------------------|-------|
| ~~Add checkpoint/incremental training~~ | ~~Currently retrains on all data each time~~ | ✅ Already implemented! Uses `from_checkpoint` with previous job ID. | 2026-01-02 |
| Add streaming for input-chat questions | Currently waits for full response | Buffer first token, if "S" continue buffering to check for "SAVE", else stream normally | 2024-11-28 |

### Low Priority
| Task | Context | Suggested Solution | Added |
|------|---------|-------------------|-------|
| Constitutional layer (DEFERRED) | Hard boundaries for PLM | Existing voice rules in personality_profiles sufficient for now. Revisit when PLM is public-facing or fine-tuned. | 2024-11-29 |
| Register route needs same env var validation | Currently uses `!` assertions | Copy pattern from login route | 2024-11-28 |

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
| Vercel free tier - no real cron | Queue processing requires browser open | Low ($20/mo) | Upgrade to Vercel Pro for server-side cron |
| input-chat doesn't stream questions | Minor UX - text appears all at once | Medium | Buffer first word, stream rest if not SAVE |
| Auth routes duplicate Supabase client setup | Code duplication | Low | Extract to shared lib/supabase.ts |

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

**What was done:**
- **ALEXANDRIA_CONTEXT.md Complete Rewrite:** CEO provided comprehensive vision document covering everything — vision, architecture, terminology (Machine, Persona, Axioms, Blueprint, Engine, etc.), three-layer architecture (Axioms → Blueprint → Engine), Phase 1 (Input) and Phase 2 (Output), Constitutional RLAIF detailed mechanics, leverage mechanism, terminal form factor, Greek archetype portfolio, raw data philosophy, planning framework (Ad Terminum / Substrate / Neither), business context, and risks. Saved as raw text in `docs/alexandria-complete-context-raw.md`, formatted into `ALEXANDRIA_CONTEXT.md` with technical appendix. `ALEXANDRIA_VISION.md` marked as superseded.
- **Reading order simplified:** Now just 3 files: MOWINCKEL.md → ALEXANDRIA_CONTEXT.md → CTO_LOG.md
- **Codebase cleanup (previous commit):** Consolidated legacy `getIngestionTools()` → `getPipelineTools()`, centralized providers in `lib/models.ts`, created `.env.example`, updated all reading order references.

**Key new concepts from CEO:**
- **Three-layer architecture:** Axioms (immutable) → Blueprint (living design doc, Default/Selected) → Engine (runtime models)
- **Planning framework:** Ad Terminum (direct path to Terminal) vs Substrate (necessary precondition) vs Neither (noise, skip it)
- **Constitutional RLAIF is iterated Constitutional SFT** — not RL technically, but same effect via iterative filtering
- **Multiple Personas per Author** — Greek archetype portfolio (Pater, Mater, Sophia, Philia, Eros)
- **Terminal form factor:** iOS app + laptop webpage. Agents feel like real people (calls, texts, voice memos).

**Files Changed:**
- `ALEXANDRIA_CONTEXT.md` - REWRITTEN: single source of truth (vision + architecture + technical)
- `ALEXANDRIA_VISION.md` - Marked as superseded (points to CONTEXT)
- `docs/alexandria-complete-context-raw.md` - NEW: raw verbatim CEO vision text
- `.cursor/rules/project-context.mdc` - Updated reading order (3 files, not 4)
- `CTO_LOG.md` - Updated reading order and session notes

**Pushed:** No (pending commit)

**Strategic context:**
- Website is primary UI for testing/debugging backend
- iOS app to be built when Mac available (~1 month)
- Voice notes bootstrap is immediate priority (100 hours of founder voice memos)
- Use Ad Terminum / Substrate / Neither framework for all prioritization

**Suggested next actions:**
1. Commit and push documentation changes
2. Start voice notes bootstrap pipeline (Ad Terminum)
3. Formalize Constitution extraction from voice data
4. Consider Vercel Pro for longer serverless function timeouts
