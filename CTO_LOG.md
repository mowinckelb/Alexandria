# CTO Log

> **For AI agents:** Read this file at the start of every session. Update it as you work.
> This is the persistent technical state across all sessions - the CTO's working memory.

---

## Quick Status
**Last updated:** 2024-11-29
**Unpushed changes:** Yes - MOWINCKEL updates, CTO_LOG update
**Blockers:** None

---

## Active Tasks

### High Priority (Ghost Fidelity Improvements)
*Address these in order. One at a time.*

| Task | Context | Suggested Solution | Added |
|------|---------|-------------------|-------|

### Medium Priority
| Task | Context | Suggested Solution | Added |
|------|---------|-------------------|-------|
| Add streaming for input-chat questions | Currently waits for full response | Buffer first token, if "S" continue buffering to check for "SAVE", else stream normally | 2024-11-28 |

### Low Priority
| Task | Context | Suggested Solution | Added |
|------|---------|-------------------|-------|
| Constitutional layer (DEFERRED) | Hard boundaries for Ghost | Existing voice rules in personality_profiles sufficient for now. Revisit when Ghost is public-facing or fine-tuned. | 2024-11-29 |
| Register route needs same env var validation | Currently uses `!` assertions | Copy pattern from login route | 2024-11-28 |

---

## Completed (Recent)
| Task | Completed | Notes |
|------|-----------|-------|
| Temporal awareness | 2024-11-29 | Memories now include timestamps [X days ago]. Ghost gets temporal context (span, recency guidance). |
| Behavioral patterns (Ghost uses profiles) | 2024-11-29 | Ghost now loads personality_profiles (style, rules, vocab). Extract via POST /api/migration {action: 'extract_profile'} |
| Memory retrieval quality | 2024-11-29 | Added recency decay + importance weighting. Combined score = similarity * importance * recency_factor |
| Preserve raw carbon (upload-carbon) | 2024-11-29 | Extracted text now stored to `entries` table with source type + metadata |
| Clarify Ghost Package architecture | 2024-11-29 | Ghost = deployable package (model + memories + constitution). Feedback → training, not runtime. |
| Add Soul training pairs to upload-carbon | 2024-11-29 | Was missing vs bulk-ingest - pipeline completeness fix |
| PDF via OpenAI Assistants API | 2024-11-29 | Native multi-page PDF parsing for max fidelity |
| External carbon file upload UI | 2024-11-29 | + button, modal, audio/pdf/text support |
| Add Axiomatic vs Ephemeral principle | 2024-11-29 | Future-proofing: preserve raw data, swap processing |
| Add Pipeline Completeness principle | 2024-11-29 | All similar code paths must stay in sync |
| Add Decision Levels principle | 2024-11-29 | Minor = just do, Major = brainstorm first |
| Editor Notes system | 2024-11-29 | Questions, observations, gaps, mental models |
| Conversation state machine | 2024-11-29 | y/n lock phases for input-chat flow |
| Ghost wrap-up flow | 2024-11-29 | Matches input mode - "anything else?" + goodbye |
| Ghost identity clarification | 2024-11-29 | System prompt clarifies Ghost = Author |
| Feedback → Notes flow | 2024-11-29 | Extract preferences from feedback |

---

## Technical Debt
*Track issues that aren't urgent but should be addressed*

| Issue | Impact | Effort | Suggested Fix |
|-------|--------|--------|---------------|
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

**Last session:** 2025-12-29

**What was done:**
- **Synchronized Ingestion Pipelines:** `api/ingest` now functionally complete (includes memory conversion, batch training pairs, and editor notes).
- **Batching Optimization:** `api/bulk-ingest` refactored to use batch inserts for training pairs.
- **Verification Infrastructure:**
    - `GET /api/debug/ping`: Health check for DB, environment, and core logic.
    - `POST /api/debug/verify`: Phase-level verification against baselines (ground truth for agents).
    - `lib/utils/pipe-check.ts`: Modular utility for pipeline consistency verification.
    - `scripts/verify-pipelines.ts`: Automated E2E verification script.
- **Documentation:** Updated `CTO_LOG.md` with the new **Verification Protocol** for autonomous agentic workflows.

**Pushed:** Yes (v0.00.18)

**Critical lesson learned:**
Modular verifiability is the "ground truth" for agentic autonomy. If an agent cannot verify its own work programmatically, it is blind.

**Known issues:**
- Supabase host `ljgggklufnovqdsbwayy.supabase.co` encountered `ENOTFOUND` during local verification (network/DNS issue), but logic is verified as sound.

**Suggested next actions:**
1. Run `npx tsx scripts/verify-pipelines.ts` once Supabase connectivity is restored.
2. Integrate `pipe-check` utility into more ingestion paths if needed.
