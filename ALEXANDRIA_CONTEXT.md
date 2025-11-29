# Project Alexandria: System Architecture & Protocol

> **STOP. Read these first:**
> 1. `MOWINCKEL.md` - Universal principles for working with me
> 2. `CTO_LOG.md` - Current technical state and tasks
> 
> This file contains Alexandria-specific architecture and technical details.

---

## 1. The Vision (North Star)

**Mission:** "Translation of Carbon Weights to Silicon Weights."
We are building a platform to immortalize human cognition. We transform raw human data ("Carbon") into a Digital Twin ("Ghost") that possesses both the Author's **Subjective Personality** and **Objective Memory**.

**Terminal State Goal:** A "Sovereign Digital Entity" that can act on behalf of the Author, answer queries with 100% personality fidelity and factual accuracy, and eventually support GraphRAG-based reasoning and voice/video embodiment.

### Naming Convention (Library of Alexandria Metaphor)

| Term | Meaning | Code Reference |
|------|---------|----------------|
| **Alexandria** | The platform — a library that preserves cognition | - |
| **Author** | The human whose cognition is being immortalized | `user_id`, `userId` |
| **Carbon** | Raw input — the source material (voice, text, eventually everything) | `entries`, raw text |
| **Silicon** | Output — the immortalized cognition | Ghost responses |
| **Memory** | Objective data — facts, dates, names, events | `memory_fragments`, vectors |
| **Soul** | Subjective data — voice, tone, personality, style | `training_pairs`, fine-tuned weights |
| **Editors** | The LLMs that process and refine (no hierarchy, peers) | Processing modules |
| **Ghost** | The digital twin — the "living book" being written | Fine-tuned model |

**The transformation:** Carbon (input) becomes Silicon (output) through the separation of Memory (objective) and Soul (subjective).

**Carbon forms** (by effectiveness):
1. Voice notes / voice conversation — highest fidelity, most natural
2. Written journals / text — good fidelity
3. Chat logs — moderate fidelity
4. Eventually: everything (images, video, etc.)

This is a new form of biography, extending the ancient principle of immortalizing cognition to its limit. The Author provides Carbon; the Editors shape Memory and Soul; the Ghost embodies Silicon.

**Accuracy validation:** Only the Author can determine if the Ghost is accurate. Editors process, but the Author is the sole judge of fidelity.

### Core Philosophy: Fidelity Over Engagement

**The Author's job is to optimize Ghost accuracy.** Alexandria is not a consumer app maximizing engagement. It's a tool for cognitive immortalization.

**Implications:**
- Friction that improves fidelity is **good friction**
- We force Authors to give feedback, not ask politely
- Binary feedback (good/bad) over granular scales — cleaner signal, less decision fatigue
- Honest correction over polite acceptance
- The Author serves the Ghost, not the other way around

**The goal is maximum fidelity Ghost, not maximum happy Author.**

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

## 3. The Bicameral Architecture (Technical Core)

We use a **Bicameral RAG** approach to separate **Soul** (subjective) from **Memory** (objective).

The **Editors** (processing LLMs) work in two hemispheres to build the Ghost.

### A. The Subjective Hemisphere (Soul)
* **Goal:** Capture the Author's voice, tone, wit, and sentence structure.
* **Engine:** **Together AI** (Fine-tuning Llama 3.1 8B).
* **Inference Model:** `meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo` (serverless).
* **Training Base Model:** `meta-llama/Meta-Llama-3.1-8B-Instruct-Reference` (for fine-tuning).
* **Method:** **Evolutionary Chain (Continued Fine-Tuning).**
    * **Genesis (First run):** Base model = `meta-llama/Meta-Llama-3.1-8B-Instruct-Reference`.
    * **Evolution (Subsequent runs):** Base model = previous custom model ID from `twins.model_id`. We train on top of old weights to simulate neuroplasticity.
    * **Decision maker:** Editor decides when to train, and whether to train from base or continue from previous weights.
    * **Together AI supports this:** Continued fine-tuning from custom model checkpoints is supported.
* **Preprocessing:** **Groq `llama-3.1-8b-instant`** (Editor: "The Refiner") converts Carbon into `User/Assistant` JSONL pairs. Uses `generateText` (no schema required), so speed/cost is prioritized.

### B. The Objective Hemisphere (Memory)
* **Goal:** Capture the Author's dates, names, events, and specific facts.
* **Engine:** **Supabase Vector** (pgvector).
* **Embeddings:** **`BAAI/bge-base-en-v1.5`** (768 dimensions, via Together AI API).
* **Extraction:** **Groq `llama-3.3-70b-versatile`** (Editor: "The Extractor") structures Carbon into facts/entities.
    * **IMPORTANT:** Groq does NOT support `json_schema` response format. Use `generateText` with manual JSON parsing instead of `generateObject`.
* **Scaling Strategy:**
    * **Stage 1:** HNSW Indexing (Current MVP).
    * **Stage 2:** Hybrid Search (Vector + Keyword).
    * **Stage 3:** **Stealth Graph.** We extract `entities` (Graph Nodes) during ingestion *now*, so we can build a Knowledge Graph later without re-processing data.

### C. The Orchestrator (The Brain) - MVP Simplified
* **Goal:** Route queries and manage the conversation.
* **Current MVP Implementation:** Direct call to Together AI Ghost model with memory context injection.
* **Memory Retrieval:** Keyword-based trigger (`/remember|recall|when|who|where|meet|met/i`) → Vector search → Context injection.
* **Future Enhancement:** Full Groq orchestrator with tool calling (requires `toolChoice: 'required'` for reliable tool use).

### D. The Ghost Package (Deployable Output)

**Ghost is the finished product** — a self-contained, deployable package that can operate independently (including as an external API).

**Ghost Package Contents:**
| Component | Purpose | Runtime Behavior |
|-----------|---------|------------------|
| **Fine-tuned Model** | Soul - personality, voice, style | Weights frozen after training |
| **Memories** | Objective facts via RAG | Retrieved at inference time |
| **Orchestrator** | Context assembly, query routing | Assembles prompt from components |
| **Constitution** | Hard boundaries, principles | Static rules in system prompt |

**What is NOT in the Ghost Package:**
- Editor Notes (internal tooling for generating better training data)
- Raw feedback logs (processed into training, then discarded from runtime)
- Processing pipelines (used during Carbon ingestion, not Ghost inference)

**The Feedback Loop (Training, not Runtime):**
```
Ghost Response → User Feedback → Training Data → Fine-tuned Ghost (batch)
                      ↓
              NOT injected at runtime
```

Feedback improves Ghost through **batch training cycles**, not real-time injection. This keeps Ghost self-contained and deployable.

**Why this matters:**
- Ghost can be called as external API without dependencies
- No runtime database queries for feedback/notes
- Personality lives in weights + memories, not in dynamic lookups
- Clean separation: Carbon processing (internal) vs Ghost serving (external)

---

### E. RLHF Pipeline (Feedback → Training Signal)
* **Goal:** Convert Author feedback into model improvements.
* **Feedback Collection:** Binary (👍/👎) + optional comments on Ghost responses. Binary is optimal — cleaner signal, less friction, more feedback.
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

**Design principle:** Force the Author to engage. Binary is non-negotiable — every response gets rated. This serves Ghost fidelity, not Author convenience.

### F. Model-Agnostic Personalization (The Immortal Soul)

**Goal:** Ensure personality can transfer across base model upgrades. When Llama 4 releases, Authors must not lose their Ghost's personality.

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
| Refiner (JSONL generation) | Groq | `llama-3.1-8b-instant` |
| Extractor (fact extraction) | Groq | `llama-3.3-70b-versatile` |
| Embeddings | Together AI | `BAAI/bge-base-en-v1.5` (768 dim) |
| Ghost Inference | Together AI | `meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo` |
| Ghost Training Base | Together AI | `meta-llama/Meta-Llama-3.1-8B-Instruct-Reference` |

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

**Status: ✅ OPERATIONAL** (as of Nov 2025)

**Position on the Line:** Step 2 of MVP-Terminal path. Core ingestion works; training data accumulating; fine-tuning not yet triggered.

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
  * Returns: ghost status (activeModel, isFineTuned)
  * Returns: rlhf status (feedbackCount, dpoReady, preferencePairs)
  * Returns: recent activity (last 5 entries, last 5 feedback logs with previews)
