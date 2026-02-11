# Project Alexandria: Technical Implementation

> ## ⛔ MANDATORY READING ORDER
> 
> 1. `MOWINCKEL.md` - Agent protocol (NON-NEGOTIABLE RULES)
> 2. `ALEXANDRIA_VISION.md` - **Product spec** (what we're building)
> 3. `CTO_LOG.md` - Current state, active tasks, handoff notes
> 4. This file - **Technical implementation** details
> 
> **Read ALEXANDRIA_VISION.md first.** It describes the product we're building.
> This file describes HOW the current codebase implements (parts of) that vision.

---

## 1. The Vision (Summary — see ALEXANDRIA_VISION.md for full spec)

**Mission:** Cognitive immortalization. Transform human data ("Carbon") into a Personal Language Model ("PLM") — a sovereign digital entity.

**Full product vision** is in `ALEXANDRIA_VISION.md`. Key points:
- **Phase 1 (Editor):** 3 input nodes → Editor agent → 4 output nodes (PLM, Constitution, Memories, Vault)
- **Phase 2 (Orchestrator):** Takes Persona → deploys through 3 output nodes (Author, Tool, API)
- Both phases use the Suggested/Selected architecture pattern
- System is model-agnostic, future-proof, always preserves raw data

### Naming Convention (Library of Alexandria Metaphor)

| Term | Meaning | Code Reference |
|------|---------|----------------|
| **Alexandria** | The platform — a library that preserves cognition (referencing the Library of Alexandria) | - |
| **Author** | The person whose cognition is being immortalized; owns the PLM | `user_id`, `userId` |
| **User** | The entity using the PLM output (can be the Author internally, or another user externally) | API consumer |
| **Carbon** | Raw input — the source material (voice, text, eventually everything) | `entries`, raw text |
| **Silicon** | Output — the immortalized cognition | PLM responses |
| **Memory** | Objective data — facts, dates, names, events | `memory_fragments`, vectors |
| **Soul** | Subjective data — voice, tone, personality, style | `training_pairs`, fine-tuned weights |
| **Editors** | The LLMs that process and refine (no hierarchy, peers) | Processing modules |
| **PLM** | Personal Language Model — the dynamic digital representation of the Author | Fine-tuned model + memories + orchestrator |

**The transformation:** Carbon (input) becomes Silicon (output) through the separation of Memory (objective) and Soul (subjective).

**Carbon forms** (by effectiveness):
1. Voice notes / voice conversation — highest fidelity, most natural
2. Written journals / text — good fidelity
3. Chat logs — moderate fidelity
4. Eventually: everything (images, video, etc.)

This is a new form of biography—a neo-biography—extending the ancient principle of immortalizing cognition to its limit. The Author provides Carbon; the Editors shape Memory and Soul; the PLM embodies Silicon as a dynamic digital representation of the Author.

**Accuracy validation:** Only the Author can determine if the PLM is accurate. Editors process, but the Author is the sole judge of fidelity.

### Core Philosophy: Fidelity Over Engagement

**The Author's job is to optimize PLM accuracy.** Alexandria is not a consumer app maximizing engagement. It's a tool for cognitive immortalization.

**Implications:**
- Friction that improves fidelity is **good friction**
- We force Authors to give feedback, not ask politely
- Binary feedback (good/bad) over granular scales — cleaner signal, less decision fatigue
- Honest correction over polite acceptance
- The Author serves the PLM, not the other way around

**The goal is maximum fidelity PLM, not maximum happy Author.**

---

## 2. Alexandria-Specific: On-Path Examples

These examples clarify what's "on the line" for this specific project:

| Decision | Verdict | Reasoning |
|----------|---------|-----------|
| Store training pairs with `export_id` for lineage tracking | ✅ On-path | Evolutionary training requires knowing which data trained which model |
| Add `quality_score` column | ✅ On-path | Terminal state needs filtering at scale; column now, algorithm swappable |
| Add `is_validated` for human review | ❌ Off-path | RLHF is handled by `feedback_logs`; this duplicates |
| Build admin dashboard | ❌ Off-path | Not required for terminal state functionality |
| Extract entities during ingestion | ✅ On-path (stealth) | GraphRAG needs them; collect now, use later |
| Build RLAIF before having much feedback | ✅ On-path (non-sequential) | Serves Terminal State; don't need feedback first to build the system |
| Build reward calibration before reward model | ✅ On-path (non-sequential) | Infrastructure ready when needed; no rewrite required |
| Build migration system before first fine-tune | ✅ On-path (non-sequential) | Model agnosticism is Terminal State requirement |

---

## 3. The Unified Editor + Orchestrator Architecture (Technical Core)

We use a **Bicameral RAG** approach to separate **Soul** (subjective) from **Memory** (objective), processed by a single **Unified Editor**.

### A. Editor (Groq — uses `GROQ_FAST_MODEL` env var)
* **Role:** Active biographer that converses with Author to extract information
* **Model:** Groq `compound-mini` with `Groq-Model-Version: latest` (auto-updates)
* **Capabilities:**
    * Two-way conversation with Author (not passive processing)
    * Focuses on **subjective information** — opinions, values, quirks, personality
    * Extracts **objective information** — facts, dates, events → vector storage
    * Generates **training pairs** — style capture for fine-tuning
    * Maintains **notepad** — structured notes + freeform scratchpad
    * **Decides when to train** — LLM makes the call (ILO principle)
* **Key Methods:**
    * `converse(authorInput, userId, history)` → EditorResponse (message + extraction + follow-ups)
    * `learnFromFeedback(feedback, userId)` → Updates notepad and training pairs
    * `getNotepad(userId)` → Current notepad state
    * `assessTrainingReadiness(userId)` → Training decision

### B. Orchestrator (Groq — uses `GROQ_QUALITY_MODEL` env var)
* **Role:** Handle PLM output to Users (external or Author)
* **Model:** Groq `compound-mini` with `Groq-Model-Version: latest`
* **Capabilities:**
    * Retrieves relevant memories via vector search
    * Loads personality constitution
    * Calls PLM model (Together AI fine-tuned or base)
    * Returns responses as Author would answer
* **Key Methods:**
    * `handleQuery(messages, userId, options)` → Stream response
    * `generateResponse(messages, userId, options)` → Non-streaming response

### C. Data Flow

```
First Order Input (Carbon):
Author ↔ Editor (two-way conversation)
      ↓
Editor extracts:
├── Objective → Memory (vector DB)
├── Subjective → Training Pairs
└── Notes → Editor Notepad

Second Order Input (Feedback):
User ↔ PLM (training conversation)
      ↓
Author rates: good/bad
      ↓
Editor learns:
├── Updates notepad
├── Creates training pairs (if good)
└── Assesses training readiness
```

### D. Storage Layer
* **Memories:** Supabase Vector (pgvector), embeddings via `BAAI/bge-base-en-v1.5`
* **Training Pairs:** `training_pairs` table with quality scores
* **Editor Notepad:**
    * `editor_notes` — structured observations, gaps, mental models
    * `editor_scratchpad` — freeform working memory
* **PLM Training:** Together AI fine-tuning on Llama 3.1 8B

### E. Model Configuration (Bitter Lesson)

**Env-based model selection** — change models without touching code:
```env
GROQ_FAST_MODEL=llama-3.1-8b-instant       # Editor conversations, RLAIF (default)
GROQ_QUALITY_MODEL=llama-3.3-70b-versatile # Orchestrator, extraction (default)
```

**Why env vars?** When Llama 4 drops on Groq, change one line → entire app updated.

**Why Groq?** Cheapest + fastest. No auto-updating aliases exist in API (compound-mini is UI-only).

* **Bitter Lesson:** Lean into LLM capabilities, avoid hand-coded logic
* **Suggested thresholds are guidelines, not gates** — Editor LLM decides based on data quality

### F. The PLM Package (Deployable Output)

**PLM (Personal Language Model) is the finished product** — a self-contained, deployable package that can operate independently (including as an external API). The PLM consists of the model, memories, and orchestrator working together as a dynamic digital representation of the Author.

**PLM Package Contents (Current):**
| Component | Purpose | Runtime Behavior |
|-----------|---------|------------------|
| **Fine-tuned Model (Soul)** | Implicit personality in weights - voice, style, patterns | Weights frozen after training |
| **Personality Constitution** | Explicit behavioral rules - supplements Soul | Injected into system prompt |
| **Memories** | Objective facts via RAG | Retrieved at inference time |
| **Orchestrator** | Context assembly, query routing | Assembles prompt from components |

**Soul vs Constitution:**
- **Soul (weights):** The PRIMARY personality. Learned from training pairs via fine-tuning. Implicit, embedded in model weights.
- **Constitution (personality_profiles):** SUPPLEMENTARY explicit rules. Useful when:
  - Pre-fine-tuning: Guides PLM when custom weights don't exist yet
  - Post-fine-tuning: Enforces hard boundaries, supplements implicit patterns
  - Model migration: Transfers instantly while weights need re-training

The Soul IS the personality. The Constitution is the written rules that guide/constrain it.

**Potential Future Additions:**
- Behavioral patterns config (pacing, tangents, humor style)
- Voice/embodiment settings (for voice/video PLM)
- Permissions layer (who can query, topic restrictions)
- Temporal marker ("2024 version" context)
- Confidence calibration (certainty by domain)
- Response style preferences (length, formality)

*This list will evolve. Core principle: PLM must remain self-contained and deployable.*

**What is NOT in the PLM Package:**
- Editor Notes (internal tooling for generating better training data)
- Raw feedback logs (processed into training, then discarded from runtime)
- Processing pipelines (used during Carbon ingestion, not PLM inference)

**The Feedback Loop (Training, not Runtime):**
```
PLM Response → User Feedback → Training Data → Fine-tuned PLM (batch)
                      ↓
              NOT injected at runtime
```

Feedback improves PLM through **batch training cycles**, not real-time injection. This keeps PLM self-contained and deployable.

**Why this matters:**
- PLM can be called as external API without dependencies
- No runtime database queries for feedback/notes
- Personality lives in weights + memories, not in dynamic lookups
- Clean separation: Carbon processing (internal) vs PLM serving (external)

---

### G. RLHF Pipeline (Feedback → Training Signal)
* **Goal:** Convert Author feedback into model improvements.
* **Feedback Collection:** Binary (`good`/`bad`) + optional comments on PLM responses. Binary is optimal — cleaner signal, less friction, more feedback.
* **Data Tables:**
    * `feedback_logs`: Raw user ratings with prompt/response pairs.
    * `preference_pairs`: DPO training data (chosen/rejected for same prompt).
    * `reward_training_data`: Normalized rewards for reward model training.

#### RLHF Approaches (by readiness):

| Approach | Min Data | Current State | Complexity |
|----------|----------|---------------|------------|
| **LoRA Enhancement** | 10 positive | Ready when feedback collected | Low - uses existing pipeline |
| **DPO** | 100 pairs | Needs same-prompt A/B data | Medium - direct preference training |
| **Reward Model + PPO** | 500 points | Full pipeline needed | High - train reward model then RL |
| **RLAIF** | N/A | Use LLM to amplify feedback | Medium - synthetic preference generation |

#### Recommended Strategy (MVP-Terminal):
1. **Phase 1 (Now):** Collect feedback, auto-inject high-rated responses into LoRA training.
2. **Phase 2 (100+ pairs):** Use DPO for direct preference alignment.
3. **Phase 3 (Scale):** Consider RLAIF to amplify limited human feedback.

#### Automatic Processing (Live):
Every feedback submission automatically processes into three training pipelines:

| Condition | LoRA | DPO | Reward |
|-----------|------|-----|--------|
| Initial +1 | ✓ (quality: 0.85) | - | ✓ |
| Initial -1 | - | - | ✓ |
| Regenerated +1 | ✓ (quality: 0.95) | ✓ if opposing exists | ✓ |
| Regenerated -1 | - | ✓ if opposing exists | ✓ |

* **LoRA:** Positive responses become training pairs. Regenerated positives get higher quality (A/B confirmed).
* **DPO:** When regeneration has different rating than original → preference pair created (chosen/rejected).
* **Reward:** ALL feedback normalized to -0.5 to 0.5 for future reward model training.

#### API Endpoints:
* `POST /api/feedback` - Save feedback + auto-process into training data
* `GET /api/rlhf?userId=xxx` - Stats and training readiness
* `POST /api/rlhf` - Actions: `export_dpo`, `export_reward`, `inject_lora`, `generate_pairs`

#### 3-Phase Feedback Loop (UI):
1. `good? y/n` - Binary rating (instant, required)
2. `feedback:` - Optional comment (Enter to skip)
3. `regenerate? y/n` - A/B comparison opportunity

**Design principle:** Force the Author to engage. Binary is non-negotiable — every response gets rated. This serves PLM fidelity, not Author convenience.

### H. RLAIF: Synthetic Feedback Multiplier

**Goal:** Multiply limited Author feedback into abundant training data using Editor's understanding of Author patterns.

**Key Insight:** Editor (Groq llama-3.3-70b) evaluates PLM (Together AI) responses — different models, no self-reinforcement. As Groq models improve, RLAIF quality improves automatically (ILO principle).

#### The Scaling Loop:
```
Author feedback (expensive, limited)
         ↓
Editor learns patterns (notepad + history)
         ↓
Editor generates synthetic ratings (cheap, unlimited)
         ↓
PLM trains on synthetic + real feedback
         ↓
PLM improves → Author feedback now higher signal (edge cases)
         ↓
Editor learns better patterns
         ↓
... scales infinitely
```

#### How It Works:
1. **Prompt Generation:** Editor creates prompts based on gaps in notepad
2. **PLM Response:** PLM generates response to synthetic prompt
3. **Editor Evaluation:** Editor rates good/bad using notepad + feedback history + constitution
4. **Confidence Routing:**
   - High confidence → Auto-add to training pairs
   - Medium confidence → Add to training pairs (flagged)
   - Low confidence → Queue as notepad question for Author review

#### API:
* `GET /api/rlaif?userId=xxx` - Stats and feedback multiplier
* `POST /api/rlaif` - Actions:
  * `generate` - Run synthetic feedback generation
  * `stats` - Get RLAIF statistics
  * `validate` - Author validates a synthetic rating
  * `pending` - Get pending reviews count

#### Database:
* `synthetic_ratings` - Tracks all synthetic evaluations with confidence, status, Author validation

#### Safeguards:
* Confidence threshold prevents auto-approving uncertain ratings
* Low-confidence items become notepad questions (Author validates naturally)
* Author disagreement creates learning observation for Editor calibration
* Different models (Editor ≠ PLM) prevents self-reinforcement

### I. Model-Agnostic Personalization (The Immortal Soul)

**Goal:** Ensure personality can transfer across base model upgrades. When Llama 4 releases, Authors must not lose their PLM's personality.

**Core Principle:** Treat fine-tuned weights as **cache**, not **state**. The real "soul" lives in portable data layers.

#### Personalization Layers:

```
┌─────────────────────────────────────────────────────────────┐
│                 MODEL-AGNOSTIC (Immortal)                    │
├─────────────────────────────────────────────────────────────┤
│ L4: Preference Manifold                                      │
│     └── preference_pairs, feedback_logs                     │
├─────────────────────────────────────────────────────────────┤
│ L3: Behavioral Signatures (Soul extraction)                  │
│     └── personality_profiles (style, rules, vocabulary)     │
├─────────────────────────────────────────────────────────────┤
│ L2: Training Pairs (Soul data)                              │
│     └── training_pairs (JSONL with quality_score)           │
├─────────────────────────────────────────────────────────────┤
│ L1: Raw Data (Carbon + Memory)                              │
│     └── entries, memory_fragments, chat_messages            │
├─────────────────────────────────────────────────────────────┤
│ L0: WEIGHTS (Ephemeral - regenerable from above)            │
│     └── Fine-tuned model checkpoint (disposable cache)      │
└─────────────────────────────────────────────────────────────┘
```

#### Key Tables:
* `personality_profiles`: Extracted behavioral signatures (style analysis, constitutional rules, vocabulary fingerprint)
* `distillation_pairs`: Synthetic training data generated from old model for knowledge transfer
* `model_migrations`: Tracks model-to-model transfers and their validation metrics
* `prompt_corpus`: Diverse prompts for comprehensive personality capture during distillation

#### Adaptive Migration System:

The migration system uses **dynamic assessment** — an Editor LLM evaluates the Author's data state and recommends the optimal strategy. No hardcoded thresholds.

**Dynamic Assessment (via Editor):**
- Editor receives: training pair count, feedback count, quality scores, reward data
- Editor decides: distillation mode, RLAIF amplification, reward recalibration
- Editor explains: reasoning for each decision

**Key Components:**
* **Dynamic Assessor**: Editor LLM that determines optimal migration strategy
* **RLAIF Amplifier**: Converts sparse human feedback into dense preference pairs using AI judge
* **Reward Calibrator**: Adapts reward model to new model's output distribution
* **Adaptive Orchestrator**: Executes strategy recommended by Dynamic Assessor

#### Migration Protocol (Adaptive):
1. **Assessment**: Auto-analyze RLHF intensity → determine distillation/RLAIF/reward settings
2. **RLAIF Amplification** (if enabled): Generate synthetic preference pairs from old model
3. **Profile Extraction**: Analyze training pairs → extract model-agnostic personality JSON
4. **Distillation** (if enabled): Run prompts through old model → capture personality-infused responses
5. **Reward Calibration** (if enabled): Generate calibrated reward data for new model distribution
6. **Data Preparation**: Combine all sources with constitutional prompt
7. **Export**: JSONL files for training + DPO + reward model

#### Constitutional Prompts:
Personality profiles generate natural-language "constitutional rules" that can condition ANY model:
```
PERSONALITY CONSTITUTION:
You must embody the following voice characteristics:
- Humor: dry, deadpan
- Formality: casual (0.3/1.0)
- Use em-dashes for emphasis
- AVOID: "basically", "certainly", "definitely"
- Characteristic phrases: "the thing is", "fundamentally"
```

#### API Endpoints:
* `GET /api/migration?userId=xxx` - Check readiness + auto-recommended config
* `POST /api/migration` - Actions:
  * `initiate` - Start migration with auto-determined config
  * `run_full` - Execute complete adaptive pipeline
  * `run_rlaif` - Run only RLAIF amplification
  * `export_jsonl` - Export all training files
  * `assess` - Get RLHF assessment without initiating
* `PATCH /api/migration` - Update migration status after external training

#### Dynamic Thresholds (Editor-Determined):
No hardcoded gates. The Dynamic Assessor (Editor LLM) evaluates the Author's data and decides:
```
Input: { trainingPairs, feedbackCount, avgQuality, rewardData, previousMigrations }
Output: { runDistillation, distillationMode, runRLAIF, recalibrateReward, reasoning }
```
This follows the ILO principle — maximum leverage to Editors. As base models improve, assessment quality improves automatically.

#### Migration Readiness:
| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Training pairs | 50 | 200+ |
| Feedback logs | 0 | 100+ (for full distillation) |
| Preference pairs | 0 | 10+ |

---

## 4. Tech Stack & Constraints

### Frontend
* **Framework:** Next.js 14+ (App Router).
* **Language:** TypeScript (Strict).
* **Styling:** Tailwind CSS.
* **Design System:** **"Apple Aesthetic."** Minimalist, San Francisco font, frosted glass (`backdrop-blur`), high whitespace, subtle borders, `lucide-react` icons.
* **Streaming:** Vercel AI SDK v5 with `useChat` hook.

### Backend (API Routes)
* **Runtime:** Vercel Serverless (Edge or Node.js).
* **SDKs:**
    * `@ai-sdk/groq` (for Groq inference - structured outputs, text generation).
    * `@ai-sdk/togetherai` (for Together AI inference - Ghost responses).
    * `together-ai` (for Together AI embeddings only).
    * `@supabase/supabase-js` (for Database).
    * **CRITICAL EXCEPTION:** Do NOT use the `together-ai` SDK for **Training/Uploads** in serverless. Use **Raw `fetch`** with `FormData` and `Blob` to avoid file-system issues.

### AI SDK v5 Working Patterns (STRICT)

These patterns were discovered through testing with AI SDK v5.0.101:

| Documentation Says | Actually Works |
|-------------------|----------------|
| `parameters: z.object({...})` | `inputSchema: z.object({...})` |
| `maxSteps: 3` | `stopWhen: stepCountIs(3)` |
| `toDataStreamResponse()` | `toUIMessageStreamResponse()` (for tool visualization) |
| `import { useChat } from 'ai/react'` | `import { useChat } from '@ai-sdk/react'` |
| `generateObject` with Groq | Use `generateText` + manual JSON parsing (Groq doesn't support `json_schema`) |

* **Tool Definition:** Use the `tool()` helper with `inputSchema` (zod schema).
* **Multi-step:** Use `stopWhen: stepCountIs(n)` to allow tool use -> return -> final answer flow.
* **Response Streaming:** Use `.toUIMessageStreamResponse()` to send tool call events to frontend.
* **React Hooks:** Install `@ai-sdk/react` separately; hooks are not in the main `ai` package.

### Model Reference (Verified Working)

| Purpose | Provider | Model ID |
|---------|----------|----------|
| **Unified Editor** | Groq | `compound-mini` (auto-updates) |
| **Orchestrator** | Groq | `compound-mini` (auto-updates) |
| Embeddings | Together AI | `BAAI/bge-base-en-v1.5` (768 dim) |
| PLM Inference | Together AI | `meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo` |
| PLM Training Base | Together AI | `meta-llama/Meta-Llama-3.1-8B-Instruct-Reference` |

**Auto-Update Configuration:**
```typescript
const groq = createGroq({ 
  apiKey: process.env.GROQ_API_KEY,
  headers: { 'Groq-Model-Version': 'latest' }
});
```

---

## 5. Database Schema (Supabase)

* **Migrations:** Located in `supabase/migrations/`. Run via Supabase SQL Editor.
* **MVP Note:** Foreign key constraints to `auth.users` are **removed** for testing. Re-add when implementing authentication.
* **Key Tables:**
    * `entries`: Raw text logs (Carbon input).
    * `memory_fragments`: Vector chunks (768 dim) + `entities` JSONB column (stealth GraphRAG prep).
    * `twins`: Current model state (`model_id`, `training_job_id`, status).
    * `training_pairs`: LoRA training data with `quality_score` and `export_id` for lineage.
    * `training_exports`: Batch tracking for evolutionary fine-tuning (links pairs → training jobs → resulting models).
    * `chat_sessions` / `chat_messages`: Conversation history.
    * `feedback_logs`: RLHF data (thumbs up/down) for future DPO.
    * `preference_pairs`: DPO chosen/rejected pairs for preference training.
    * `personality_profiles`: Model-agnostic behavioral signatures (style, rules, vocabulary).
    * `distillation_pairs`: Synthetic training data from old model for knowledge transfer.
    * `model_migrations`: Tracks model-to-model transfers.
    * `prompt_corpus`: Diverse prompts for personality capture (seeded with 40+ prompts).
* **Key Functions:**
    * `match_memory(...)` - Vector similarity search.
    * `get_active_model(p_user_id)` - Returns current model in evolution chain.
    * `get_personality_profile(p_user_id)` - Returns active personality profile JSON.
    * `get_migration_readiness(p_user_id)` - Stats for migration planning.

---

## 6. Operational Workflow
We follow a strict **Gitflow-Lite** process:

1.  **Main:** Production ready.
2.  **Develop:** Integration testing.
3.  **Feature Branches:** `feature/[name]`.
    * *Rule:* Every feature branch must include an `ALEXANDRIA_CONTEXT.md` update if architecture changes.

---

## 7. Code Style Guidelines
* **Interfaces:** Use functional names, no "I" prefix. (e.g., `Refiner`, `Tuner`, `Indexer`).
* **Modularity:** Use the **Factory Pattern** (`lib/factory.ts`) to instantiate logic modules. Never hardcode providers in API routes.
* **Error Handling:** Serverless functions must return clean JSON errors, never crash. Use try/catch with detailed error logging.
* **Type Safety:** Use `zod` for all API inputs. For LLM structured outputs with Groq, use manual JSON parsing with zod validation.

---

## 8. Environment Configuration

Required environment variables for `.env.local` (local) and Vercel (production):

```env
GROQ_API_KEY="gsk_..."
TOGETHER_API_KEY="..."
NEXT_PUBLIC_SUPABASE_URL="https://[project-ref].supabase.co"
SUPABASE_SERVICE_KEY="..." # Must be SERVICE_ROLE key for Vector Admin rights
```

**Notes:**
* `NEXT_PUBLIC_SUPABASE_URL` is exposed to the client (for future auth).
* `SUPABASE_SERVICE_KEY` must be the **service_role** key (not anon) to bypass RLS for server-side operations.
* Never commit `.env.local` to git.

---

## 9. Current State

**Status: ✅ OPERATIONAL** (as of Feb 2026)

**See `CTO_LOG.md` for latest status and `ALEXANDRIA_VISION.md` for what we're building toward.**

### What's Built (On-Path):
| Component | Status | Terminal State Purpose |
|-----------|--------|------------------------|
| Dual-path ingestion | ✅ Working | Facts + Style separation |
| Vector storage + search | ✅ Working | Objective memory recall |
| Training pair persistence | ✅ Working | LoRA fine-tuning input |
| Export lineage tracking | ✅ Working | Evolutionary training |
| Quality scoring | ✅ Working | Filtering at scale |
| Entity extraction (stealth) | ✅ Collecting | Future GraphRAG |
| RLHF feedback UI | ✅ Working | Binary (good/bad) + comments |
| DPO preference pairs | ✅ Schema + API | Direct preference optimization |
| LoRA enhancement from RLHF | ✅ Working | Inject high-rated responses |
| Personality extraction | ✅ Working | Model-agnostic behavioral signatures |
| Knowledge distillation | ✅ Working | Old model → synthetic training data |
| Migration orchestration | ✅ Schema + API | Cross-model personality transfer |
| Debug state endpoint | ✅ Working | Agent verification infrastructure |

### What's Deferred (Still On-Path):
* **Fine-tuning trigger** - Waiting for 500+ quality pairs
* **Auth** - Using test UUID (`00000000-0000-0000-0000-000000000001`)
* **GraphRAG** - Entities collected, graph not built yet
* **DPO training** - Feedback UI + conversion pipeline built, waiting for 100+ preference pairs
* **A/B Migration Validation** - Shadow mode infrastructure for comparing old vs new model

### Working Flow:
```
Carbon (input) → Editors Process → Storage → Recall → Silicon (output)
                       ↓
                 ┌─────┴─────┐
                 ↓           ↓
              Memory       Soul
            (facts →     (style →
             vectors)     training)
```

### Training API:
* `GET /api/training?userId=xxx` - Stats, readiness, active model
* `POST /api/training` - Export JSONL (optionally create export batch)
* `PATCH /api/training` - Update export status after training job

### Migration API:
* `GET /api/migration?userId=xxx` - Migration readiness check
* `GET /api/migration?migrationId=xxx` - Specific migration status
* `POST /api/migration` - Run migration phases: `initiate`, `extract_profile`, `distill`, `prepare_data`, `export_jsonl`
* `PATCH /api/migration` - Update migration status after external training

### Bulk Ingest API:
* `POST /api/bulk-ingest` - Process large text through full ingestion pipeline
  * Body: `{ text: string, userId: string, source?: string }`
  * Chunks text intelligently (by paragraphs, max 4000 chars each)
  * Runs each chunk through: extractor → indexer → refiner
  * Returns: summary of facts, preferences, opinions, values, entities, memory items, training pairs

### Debug API:
* `GET /api/debug/state?userId=xxx` - System state snapshot for verification
  * Returns: counts (entries, memoryFragments, trainingPairs, feedbackLogs, preferencePairs, rewardData)
  * Returns: training status (avgQuality, lastPairCreated, readyForTraining, recentExports)
  * Returns: plm status (activeModel, isFineTuned)
  * Returns: rlhf status (feedbackCount, dpoReady, preferencePairs)
  * Returns: recent activity (last 5 entries, last 5 feedback logs with previews)

---

## 8. Developer Tooling (Autonomous Capabilities)

These tools enable the CTO agent to work autonomously without manual intervention:

### Database Migrations (Supabase CLI)
```bash
# Create new migration
# File: supabase/migrations/00008_description.sql

# Push migrations to remote database
npx supabase db push

# Check migration status
npx supabase migration list

# Repair migration history if needed
npx supabase migration repair --status applied 00008
```
- Project ref: `ljgggklufnovqdsbwayy`
- Linked via `npx supabase link`
- No manual SQL copy-paste needed

### Git Operations
- Full commit/push autonomy via git CLI
- Push after each feature (30 min rule)

### TypeScript Verification
```bash
npx tsc --noEmit --project tsconfig.json
```

### API Testing
- curl for endpoint verification
- File-based JSON for complex payloads (PowerShell escaping workaround)

---

## 9. Critical Code Sections

**These files are high-risk. Breaking them breaks the app. Extra caution required.**

| File | Risk | Depends On | Verify After Change |
|------|------|------------|---------------------|
| `app/api/auth/login/route.ts` | Authentication | Everything | Can login/logout successfully |
| `app/api/auth/register/route.ts` | User creation | Login flow | Can create new account |
| `lib/modules/objective/indexer.ts` | Memory storage | All ingestion, PLM recall | Data actually stored, recall works |
| `lib/modules/subjective/refiner.ts` | Soul training pairs | Fine-tuning pipeline | Training pairs generated correctly |
| `app/api/chat/route.ts` | PLM responses | User-facing output | PLM responds with memories |
| `app/api/input-chat/route.ts` | Carbon collection | All data ingestion | Conversation flow works, data saved |
| `supabase/migrations/*` | Schema changes | Database integrity | Migration runs, no data loss |
| `lib/factory.ts` | Module initialization | All processing | Modules load without error |

**Before modifying these files:**
1. Understand what depends on them
2. Have a verification plan
3. Test specific critical behavior after changes
4. If migration: consider rollback strategy
