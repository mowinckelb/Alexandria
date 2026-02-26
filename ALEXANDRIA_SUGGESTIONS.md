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
**Status:** Implemented
**Affects:** Data Pipeline

**Suggestion:**
Store raw carbon inputs (original transcripts, uploaded files) in addition to processed outputs.

**Implementation:**
- upload-carbon now stores extracted text to `entries` table
- Source types: `upload:audio`, `upload:pdf`, `upload:image`, `upload:text`
- Metadata includes: fileName, fileType, fileSize, extractedLength, uploadedAt
- Note: Original binary files (audio/PDF) NOT preserved yet - only extracted text
- Future enhancement: Add Supabase Storage for full file preservation

**Human Review:**
Implemented 2024-11-29

---

### 2024-11-29 - Architecture
**Suggested by:** Factory Agent (Claude)
**Status:** Resolved (Clarified)
**Affects:** Ghost Fidelity

**Suggestion:**
Close the feedback loop - positive feedback should reinforce patterns in Ghost responses, negative should suppress.

**Resolution:**
Feedback loop IS closed via batch training, not runtime injection. Ghost is a deployable package - feedback improves it through training cycles, not real-time queries. This is correct architecture for a self-contained, API-deployable Ghost. Added "Ghost Package" section to ALEXANDRIA_CONTEXT.md to clarify.

**Human Review:**
Resolved 2024-11-29

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

### 2026-02-25 - Architecture / Scaling
**Suggested by:** Cursor Agent (Claude Opus)
**Status:** Partially Implemented
**Affects:** Constitution Processing, Editor, RLAIF

**Suggestion:**
Multi-layered Constitution context strategy as Constitution grows beyond token limits.

**What was done (2026-02-25):**
1. **constitution-refresh cron**: Changed from destructive full re-extraction (overwrites Canon) to safe view derivation (only creates Training/Inference views from existing Canon). Canon now grows exclusively through per-entry deltas.
2. **processEntry summary**: Changed from showing first 5 items to showing ALL items compactly (pipe-separated titles, 50-char truncation). This lets the Editor see everything already captured and avoid duplicates. Caps at 12K chars.
3. **formatConstitutionContext fallback**: When full Constitution exceeds 20K chars, automatically falls back to the compact summary format instead of blowing up the prompt.

**Future refinements needed:**
- **Consolidation pass**: As deltas accumulate, the Canon may have near-duplicates, verbose entries, or stale items. A periodic LLM-driven consolidation (not replacement!) could prune and merge without losing signal. This should read sections individually and consolidate each, never the full doc at once.
- **Section-aware routing**: For very large Constitutions (100K+), processEntry could first identify which 1-2 sections are relevant to the new data, then fetch those sections in full for precise delta application. Two-pass but higher quality.
- **Editor converse/RLAIF scaling**: Currently sends full Constitution for Author chat and PLM evaluation. Falls back to summary at 20K chars, but a smarter approach would send the most relevant sections based on the conversation topic.

**Reasoning:**
The Constitution is designed to grow continuously. Without scaling strategies, LLM calls will hit input token limits, rate limits, and cost will balloon. The current changes prevent the most acute failures (cron overwriting Canon, prompt explosions) but more sophisticated approaches will be needed as the system matures.

**Human Review:**
(pending)

---

### 2026-02-25 - Architecture / Implementation Alignment
**Suggested by:** Cursor Agent (Claude Opus)
**Status:** Pending
**Affects:** Constitution Manager, Orchestrator, Privacy, Library

**Suggestion:**
Align implementation with updated ALEXANDRIA.md (Feb 2026 revision). Key changes:

1. **Remove inference view derivation** — `deriveInferenceView` in `types.ts` and the `inference.md` Vault save in `manager.ts` should be removed. The Orchestrator should use multilayer retrieval against the Canon at query time (which we've already partially implemented with `buildConstitutionSummaryForProcessing` and the 20K-char fallback in `formatConstitutionContext`).
2. **Three MCPs** — Editor MCP (extraction from LLM usage), Persona MCP (self-knowledge tool), Library MCP (marketplace). Not yet implemented.
3. **Access tiers** — Public/Premium/Private replaces the old Private/Personal/Professional privacy modes. No code currently implements either, so this is a clean-slate implementation when the Library is built.
4. **Signal** — Machine-generated agent discovery metadata. New concept, needs implementation when Library is built.
5. **Vault storage options** — Currently Alexandria-hosted only (Supabase). The vision supports three options including private remote and local. Future work.

**Reasoning:**
The ALEXANDRIA.md was updated with significant architectural refinements. The codebase should incrementally align with these changes. Items 1 is a quick cleanup. Items 2-5 are future features.

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

### [Feb 2026] Noted Future Improvements

1. **User Numbering System** — Each user gets a sequential number on signup. Founder = 0, early users get low numbers. Serves as a unique primary key for persona sorting in Library (names aren't unique). Visible badge for early members.
2. **Vault Reprocess Efficiency** — When "re-process everything" is triggered, it should leverage the current Constitution to avoid re-extracting already-captured signal. Focus on incremental/new signal extraction. Should also support editing and deleting entries.
3. **Web/Tool Access for Agents** — Investigate whether Editor and Orchestrator agents can access the web and use tools (MCP-style) during conversations. Currently stateless LLM calls only.
4. **Constitution Refinement Loop** — The Constitution should have an active refinement feature beyond delta ingestion. The Editor should be able to reflect on, iterate, and refine the Constitution continuously — not just append deltas from new entries.
5. **Orchestrator Voice Neutrality** — The Orchestrator currently returns overly neutral, non-subjective language. Need to break through this at both the Orchestrator prompt level and PLM fine-tuning level to produce responses that genuinely reflect the user's voice and perspective.
6. **Editor Question Menu Flow** — Full redesign of the Editor chat interaction. When author opens editor: (a) editor shows its list of pending questions/topics it wants to explore, (b) author picks one, (c) focused back-and-forth conversation about that topic, (d) editor closes the topic when satisfied, (e) asks if author wants to answer another question, (f) if yes, shows remaining questions. Requires: backend storage of editor's pending questions (built during vault processing), API to fetch them, frontend question menu UI, per-topic conversation threading.

