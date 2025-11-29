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
| Behavioral patterns | We capture WHAT author knows, not HOW they respond | Analyze response patterns (tangents, humor, pacing) from training pairs | 2024-11-29 |
| Temporal awareness | Ghost treats all memories as current | Add timestamps to memories, weight by recency, detect belief changes | 2024-11-29 |
| Constitutional layer | What would Author NEVER say? | Extract hard boundaries from feedback + explicit values, add as system constraints | 2024-11-29 |

### Medium Priority
| Task | Context | Suggested Solution | Added |
|------|---------|-------------------|-------|
| Add streaming for input-chat questions | Currently waits for full response | Buffer first token, if "S" continue buffering to check for "SAVE", else stream normally | 2024-11-28 |

### Low Priority
| Task | Context | Suggested Solution | Added |
|------|---------|-------------------|-------|
| Register route needs same env var validation | Currently uses `!` assertions | Copy pattern from login route | 2024-11-28 |

---

## Completed (Recent)
| Task | Completed | Notes |
|------|-----------|-------|
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
*Use `/api/debug/state?userId=xxx` to verify system state*

After ingestion:
- `counts.entries` should increase
- `counts.memoryFragments` should increase
- `counts.trainingPairs` should increase

After bulk-ingest:
- Response shows `summary.chunksProcessed` > 0
- Response shows `summary.storage.memoryItems` > 0
- Response shows `summary.storage.trainingPairs` > 0
- Debug state should show increased counts for all of the above

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

**Last session:** 2024-11-29

**What was done:**
- External carbon file upload (audio via Whisper, PDF via Assistants API, images via Vision)
- Editor Notes system (questions, observations, gaps, mental models)
- Conversation state machine with y/n lock phases
- Ghost wrap-up flow and identity clarification
- Added Soul training pairs to upload-carbon (pipeline completeness fix)
- Added key MOWINCKEL principles: Pipeline Completeness, Axiomatic vs Ephemeral, Decision Levels, Git Discipline
- Updated CTO_LOG with Ghost fidelity task queue

**Pushed:** (pushing now)

**Critical lesson learned:**
CTO MUST actively maintain CTO_LOG.md and scan for pipeline inconsistencies. CEO cannot track all implementation details - that's the CTO's job.

**Known issues:**
- None blocking

**Suggested next actions:**
1. Test input-chat flow end-to-end
2. Consider adding streaming for questions (medium priority)
