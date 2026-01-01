# CTO Log

> ## ⛔ DID YOU READ MOWINCKEL.md FIRST?
> 
> **Required reading order:** `MOWINCKEL.md` → `CTO_LOG.md` (this file) → `ALEXANDRIA_CONTEXT.md`
> 
> If you skipped MOWINCKEL.md, go back and read it now. It contains non-negotiable rules.
> 
> ---
> 
> This is the CTO's working memory. Read at session start. Update at session end.

---

## Quick Status
**Last updated:** 2025-01-01
**Unpushed changes:** No
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
| MOWINCKEL.md overhaul | 2025-01-01 | Complete rewrite for agent compliance: non-negotiable rules, decision authority levels, mandatory session protocols, verification requirements, common mistakes table. |
| RLAIF synthetic feedback | 2025-01-01 | Editor evaluates Ghost responses, generates synthetic good/bad ratings. Auto-approve high confidence, queue low for Author review. |
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

**Last session:** 2025-01-01

**What was done:**
- **MOWINCKEL.md Overhaul:** Complete rewrite for maximum agent compliance.
    - Added "Non-Negotiable Rules" section at top with violation examples
    - Explicit Decision Authority table (Minor/Medium/Major/Critical)
    - Mandatory Session Start/End protocols with specific steps
    - 4-phase workflow with checklists: UNDERSTAND → IMPLEMENT → VERIFY → COMMIT
    - Critical Code table with specific pre-modification steps
    - "Common Mistakes to Avoid" table with counter-patterns
    - Communication Standards with required response formats
    - "Before Saying Done" checklist
- **Previous session:** RLAIF Implementation (see Completed section)

**Pushed:** Yes (2fbde60)

**Critical lesson learned:**
Agent compliance requires: (1) explicit violation examples, (2) concrete verification steps, (3) decision authority levels, (4) no room for interpretation on rules.

**Known issues:**
- `compound-mini` doesn't exist in Groq API (UI-only feature). Fixed to use `llama-3.3-70b-versatile`.
- Ghost response generation in RLAIF uses llama-3.3-70b as placeholder (should use actual Together AI Ghost model once fine-tuned)

**Suggested next actions:**
1. Push MOWINCKEL.md changes
2. Test RLAIF with `POST /api/rlaif {action: 'generate', userId: 'xxx'}`
3. Verify `GET /api/debug/state?userId=xxx` shows RLAIF stats
