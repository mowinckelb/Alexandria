# Alexandria: Agent Suggestions Log

This file contains architectural suggestions from AI agents. Human review is required before promoting changes to `ALEXANDRIA_CONTEXT.md`.

## How This Works

1. **Agents:** When you identify a potential improvement, pattern, or issue, add it below with your reasoning
2. **Humans:** Review suggestions periodically and either:
   - Promote to `ALEXANDRIA_CONTEXT.md` (delete from here after)
   - Reject with reason (mark as rejected)
   - Defer (leave for future consideration)

## Format

```markdown
### [DATE] - [CATEGORY]
**Suggested by:** [Agent type - e.g., "Cursor Agent (Claude Opus)"]
**Status:** Pending | Accepted | Rejected | Deferred
**Affects:** [Which section of ALEXANDRIA_CONTEXT.md]

**Suggestion:**
[What should change]

**Reasoning:**
[Why this matters]

**Human Review:**
[To be filled by human]
```

---

## Pending Suggestions

### 2024-11-29 - Architecture
**Suggested by:** Factory Agent (Claude)
**Status:** Pending
**Affects:** Data Pipeline

**Suggestion:**
Store raw carbon inputs (original transcripts, uploaded files) in addition to processed outputs. Currently we process and store extractions but don't preserve the original text for re-processing.

**Reasoning:**
Per Axiomatic vs Ephemeral principle - raw data is permanent, processing methods are temporary. When better extraction methods arrive (better embeddings, better chunking), we'll want to re-process old data. Can't do that if we only kept the processed outputs.

**Human Review:**
(pending)

---

### 2024-11-29 - Architecture
**Suggested by:** Factory Agent (Claude)
**Status:** Pending
**Affects:** Ghost Fidelity

**Suggestion:**
Close the feedback loop - positive feedback should reinforce patterns in Ghost responses, negative should suppress. Currently feedback is collected but doesn't influence Ghost behavior.

**Reasoning:**
Feedback data is axiomatic (permanent user preference signal). Wasted learning signal. This is the highest-impact Ghost fidelity improvement because it creates a direct path from user correction to improved output.

**Human Review:**
(pending)

---

### 2024-11-29 - Data Model
**Suggested by:** Factory Agent (Claude)
**Status:** Pending
**Affects:** Memory System

**Suggestion:**
Add temporal awareness to memories - timestamps, recency weighting, ability to track belief changes over time.

**Reasoning:**
"I believed X in 2020" vs "I believe X now" - Ghost currently treats all memories as equally current. Author's views evolve; Ghost should reflect current beliefs while preserving historical context.

**Human Review:**
(pending)

---

## Accepted (Promoted to ALEXANDRIA_CONTEXT.md)

(None yet)

---

## Rejected

(None yet)

---

## Deferred

(None yet)

