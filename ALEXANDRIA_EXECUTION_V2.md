# Alexandria Execution Plan v2: Data Loop MVP

> **Created:** 2026-02-22 by Opus (CTO session)
> **For:** Codex execution model
> **Context:** Single founder user. 100hrs of voice note transcription .md files ready to upload. Existing test data is irrelevant. Goal: daily-use product for 1 month while credits are depleted. Build for terminal (Mac/iPhone), bridge backwards.

---

## Completion status (as of last update)

| Task | Status | Notes |
|------|--------|-------|
| TASK 1 — Wire auto-train cron | ✅ Done | `vercel.json` has `/api/cron/auto-train` on `0 */12 * * *` |
| TASK 2 — Batch upload page | ✅ Done | `app/batch-upload/page.tsx` |
| TASK 3 — Training dashboard | ✅ Done | `app/training/page.tsx` |
| TASK 4 — Simplify nav | ✅ Done | Primary: constitution · rlaif · training · upload · more · sign out; "more" dropdown for rest |
| TASK 5 — Deploy and run data load | ⏳ Manual | Founder: deploy, `/batch-upload`, upload .md files, extract constitution, train, test Persona |
| TASK 6 — RLAIF banner | ✅ Done | Banner when pending reviews: "X items need your review" + open review |
| TASK 7 — Contextual Editor messages | ✅ Done | `editor-cycle` uses LLM + recent entries to generate proactive questions |

**All code tasks for the Data Loop MVP are complete.** Only TASK 5 (your manual data load) remains. When Opus/Codex returns: verify production deploy and cron, then consider Track B (see below) or technical debt from CTO_LOG.

---

## What Already Works (don't touch)

| Component | Status | Notes |
|-----------|--------|-------|
| Auth (login/register) | Working | Supabase Auth, `app/api/auth/login/route.ts`, `app/api/auth/register/route.ts` |
| Editor input chat | Working | `app/api/input-chat/route.ts` → entries + memories + training pairs |
| Orchestrator output chat | Working | `app/api/chat/route.ts` → PLM + memories + constitution synthesis |
| Bulk ingest pipeline | Working | `app/api/bulk-ingest/route.ts` → { text, userId } → entries + memories + pairs + notes |
| File upload (single) | Working | `app/api/upload-carbon/route.ts` handles .md files natively |
| Training pipeline | Working | `POST /api/training { action: 'start' }` → JSONL → Together AI LoRA fine-tune |
| RLAIF synthetic evaluation | Working | Editor generates synthetic ratings during ingestion |
| RLAIF review queue | Working | `app/api/rlaif/review/route.ts` GET (pending items) + POST (submit verdict) |
| Constitution extraction | Working | `POST /api/constitution/extract` → LLM extracts from training data |
| Constitution panel UI | Working | View, version history, extract button |
| RLAIF review panel UI | Working | `app/components/RlaifReviewPanel.tsx` |
| Editor cron cycle | Working | `app/api/cron/editor-cycle/route.ts` → proactive questions/nudges |
| Auto-training cron | ✅ Working | `app/api/cron/auto-train/route.ts` + scheduled in `vercel.json` every 12h |
| Privacy modes | Working | private/personal/professional toggle |

## What Needs Building (ordered by priority)

---

### TASK 1: Wire auto-training cron into vercel.json

**Why:** The auto-train cron file exists but isn't scheduled. Without this, training never triggers automatically.

**File:** `vercel.json`

**Change:** Add to the `crons` array:
```json
{
  "path": "/api/cron/auto-train",
  "schedule": "0 */12 * * *"
}
```

This runs every 12 hours. The cron checks if 50+ unexported quality pairs exist, skips if training is already in progress or completed within 24h, otherwise triggers `POST /api/training { action: 'start' }`.

**Verify:** `npx tsc --noEmit` passes. Deploy to Vercel and confirm cron appears in Vercel dashboard.

---

### TASK 2: Batch .md file upload page

**Why:** The founder has 100+ .md transcription files. Current UI only supports one-at-a-time upload. Need a dedicated page to drag-and-drop many .md files at once.

**Create:** `app/batch-upload/page.tsx`

**Behavior:**
1. Page has a large drag-and-drop zone that accepts multiple `.md` and `.txt` files
2. Shows list of selected files with file names and sizes
3. "Process All" button starts sequential processing
4. For each file:
   - Read file content as text (client-side `FileReader`)
   - POST to `/api/bulk-ingest` with `{ text: fileContent, userId, source: 'voice-transcript:' + filename }`
   - Show per-file status: pending → processing → done (with counts) → error
5. Show running totals: files processed, total memories, total training pairs
6. Processing is sequential (one file at a time) to avoid rate limits

**Pattern to follow:** Look at `app/page.tsx` for styling (same theme variables, same font sizes, same minimal aesthetic). Use `'use client'` directive. Get `userId` from `localStorage.getItem('alexandria_user_id')`. If not authenticated, redirect or show message.

**API contract (already exists):**
```
POST /api/bulk-ingest
Body: { text: string, userId: string, source?: string }
Response: {
  success: true,
  summary: {
    chunksProcessed: number,
    totalChunks: number,
    extraction: { facts, preferences, opinions, values, entities },
    storage: { memoryItems, trainingPairs, editorNotes },
    errors?: string[]
  }
}
```

**Verify:** Upload 2-3 small .md test files. Check `/api/debug/state?userId=X` shows increased `memoryFragments` and `trainingPairs` counts.

---

### TASK 3: Training dashboard page

**Why:** Founder needs to see training status, trigger manual training, and know when a new model is ready.

**Create:** `app/training/page.tsx`

**Behavior:**
1. On load, fetch `GET /api/training?userId=X` (already exists)
2. Display:
   - Available pairs (unexported), high-quality pairs, total pairs
   - Readiness indicator: "X pairs available (need 50 minimum)" with visual tier bar
   - Active model name
   - Training history (list of recent exports with status, pair count, date)
3. "Train Now" button:
   - Calls `POST /api/training { userId, action: 'start' }`
   - Shows loading state during upload + job creation
   - On success: shows job ID, starts polling status
4. If a training job is in progress: poll and show status
5. After training completes: show "New model ready" with model ID

**API contract (already exists):**
```
GET /api/training?userId=X
Response: { total, available, high_quality, ready, tier, active_model, recent_exports[], thresholds }

POST /api/training
Body: { userId, action: 'start' }
Response: { success, export_id, job_id, pairs_count, avg_quality, ... }
```

**Pattern:** Same styling as other pages. Get `userId` from localStorage.

**Verify:** Page loads, shows accurate pair counts matching `/api/debug/state`.

---

### TASK 4: Simplify main page navigation

**Why:** The header currently has 15+ links (moderation, channels, billing, onboarding, orchestrator, graph, maturity, voice bootstrap, etc.) that are irrelevant for a single founder user doing daily data input. This is confusing and cluttered.

**File:** `app/page.tsx`

**Change:** Replace the current header nav (lines ~1220-1340) with a clean two-tier navigation:

**Primary nav (always visible):**
- `constitution` (existing button, opens ConstitutionPanel)
- `rlaif` (existing button + count badge, opens RlaifReviewPanel)
- `training` (link to `/training`)
- `upload` (link to `/batch-upload`)
- `sign out` (existing)

**Secondary nav (small "more" link that expands):**
- activity, system, library, maturity, channels, billing (existing links)

**Remove entirely from nav:**
- `moderation`, `onboarding`, `orchestrator`, `graph`, `voice bootstrap` buttons
- These pages still exist and are accessible by URL, just not cluttering the nav

**Also remove:** The `voiceBootstrapStatus` display and `startVoiceBootstrap` button from the header.

The three-mode toggle (input/process/output) stays as-is — it's the core interaction model.

**Verify:** Page renders cleanly. All primary links work. The daily-use actions are immediately visible without scrolling.

---

### TASK 5: Deploy and run initial data load

**Why:** Need to actually load the 100hrs of transcription data and trigger the first training cycle.

**Steps (manual, not code):**
1. Deploy current code to Vercel (`git push`)
2. Log in to the web app
3. Go to `/batch-upload`
4. Upload all .md transcription files (may need to do in batches of 20-30 if browser gets slow)
5. Wait for processing to complete
6. Go to `/training` and check pair counts
7. Click "Extract Constitution" in the Constitution panel (or wait for enough data)
8. If 50+ quality pairs: click "Train Now" or wait for auto-train cron
9. Test the Persona in output mode after training completes

**Verify:** `/api/debug/state` shows hundreds of memory fragments and training pairs. Constitution exists with real content. Training job started or completed.

---

### TASK 6 (nice-to-have): RLAIF review prominence

**Why:** The RLAIF review count badge is currently tiny text. If the founder has pending reviews, they should see it immediately.

**File:** `app/page.tsx`

**Change:** If `rlaifReviewCount > 0`, show a subtle banner below the header:
```
"X items need your review" [open review panel]
```

This is a single line, same minimal style, that auto-hides when count is 0.

**Verify:** When there are pending RLAIF reviews, the banner appears. Clicking it opens the review panel.

---

### TASK 7 (nice-to-have): Editor proactive message quality

**File:** `app/api/cron/editor-cycle/route.ts`

**Current problem:** The proactive messages are generic ("any new thoughts?"). They should reference what the Editor knows about the Author.

**Change:** When `decision.action === 'message'` and `messageType === 'proactive_question'`:
1. Fetch the 3 most recent `editor_messages` (delivered) and 3 most recent `entries` for context
2. Instead of a static string, construct a message that references something specific:
   - "last time you mentioned [topic from recent entry]. has your thinking on that evolved?"
   - "i noticed you talk a lot about [entity]. what drives that?"
3. This requires an LLM call (use Groq `llama-3.3-70b-versatile`) to generate the message from context

**Pattern:** Use the same Groq setup as `lib/models.ts`. Keep the message short (1-2 sentences). Store the raw context used in `metadata` for debugging.

**Verify:** Trigger `POST /api/cron/editor-cycle` manually. Check that `editor_messages` contains a contextual question, not a generic one.

---

## What NOT to Build

| Feature | Reason |
|---------|--------|
| iMessage bridge | No Mac yet (2 months). Web works. |
| Library/marketplace | Single user, no consumers |
| Billing/guardrails | No revenue, no external API users |
| Moderation | No reports to moderate |
| Channel adapters/webhooks | No external channels |
| Memory graph | Flat vector search works |
| Neo-Biography | Needs rich Persona first |
| Blueprint code editing | Needs mature system |
| Onboarding ops | Founder doesn't need onboarding |
| iOS app | No Mac for development |

---

## Daily Use Flow (what the founder does)

```
1. Open Alexandria at https://alexandria.vercel.app (or wherever deployed)
2. See "X items need your review" → tap → approve/reject/edit RLAIF items
3. Mode: input → share thoughts, answer Editor questions, upload files
4. Mode: output → ask Persona questions, assess quality
5. Check /training → see pair accumulation, training status
6. Close. Auto-train cron handles the rest.
```

---

## Files created for Data Loop MVP

| File | Status |
|------|--------|
| `ALEXANDRIA_EXECUTION_V2.md` | This file (the plan) |
| `app/api/cron/auto-train/route.ts` | Done; scheduled in vercel.json |
| `app/batch-upload/page.tsx` | Done |
| `app/training/page.tsx` | Done |
| `app/page.tsx` | Updated: simplified nav, RLAIF banner, voice bootstrap removed |
| `vercel.json` | Updated: auto-train cron + function config |
| `app/api/cron/editor-cycle/route.ts` | Updated: contextual proactive messages via LLM |

---

## Execution order (reference; all code steps done)

1. ~~TASK 1 — Wire auto-train cron~~ ✅
2. ~~TASK 2 — Batch upload page~~ ✅
3. ~~TASK 3 — Training dashboard~~ ✅
4. ~~TASK 4 — Simplify navigation~~ ✅
5. ~~TASK 6 — RLAIF banner~~ ✅
6. ~~TASK 7 — Editor message quality~~ ✅
7. **TASK 5 — Deploy and run initial data load** (manual, founder)
