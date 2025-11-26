# Project Alexandria: System Architecture & Protocol

## 1. The Vision (North Star)

**Mission:** "Translation of Carbon Weights to Silicon Weights."
We are building a platform to immortalize human cognition. We transform raw human data ("Carbon") into a Digital Twin ("Ghost") that possesses both the user's **Subjective Personality** and **Objective Memory**.

**Terminal State Goal:** A "Sovereign Digital Entity" that can act on behalf of the user, answer queries with 100% personality fidelity and factual accuracy, and eventually support GraphRAG-based reasoning and voice/video embodiment.

---

## 2. Development Philosophy: MVP-Terminal Optimal

**The Line:** Every feature we build must lie on the direct path between MVP and Terminal State. No detours. No sideways features. No tech debt that requires rewrites.

```
MVP ────────●────────●────────●──────── Terminal State
            ↑        ↑        ↑
         Step 1   Step 2   Step 3
         (now)    (okay)   (okay)
         
         ✗ Off-path feature (rejected)
         ✗ "Nice to have" (rejected)
         ✗ Premature optimization (rejected)
```

**Rules:**
1. **Every feature must serve Terminal State.** If it doesn't contribute to "100% personality fidelity and factual accuracy," don't build it.
2. **Build for evolution, not replacement.** Schemas should accommodate future needs without migration. Code should extend, not rewrite.
3. **Step 2-3 is fine.** We don't have to be at Step 1. We can build ahead on the critical path if it prevents future rewrites.
4. **Stealth collection is valid.** Collecting data now for future features (e.g., entities for GraphRAG) is on-path if it requires no extra user effort.

**Examples:**
| Decision | Verdict | Reasoning |
|----------|---------|-----------|
| Store training pairs with `export_id` for lineage tracking | ✅ On-path | Evolutionary training requires knowing which data trained which model |
| Add `quality_score` column | ✅ On-path | Terminal state needs filtering at scale; column now, algorithm swappable |
| Add `is_validated` for human review | ❌ Off-path | RLHF is handled by `feedback_logs`; this duplicates |
| Build admin dashboard | ❌ Off-path | Not required for terminal state functionality |
| Extract entities during ingestion | ✅ On-path (stealth) | GraphRAG needs them; collect now, use later |

---

## 3. The Bicameral Architecture (Technical Core)

We use a **Bicameral RAG** approach to separate "Soul" from "Memory."

### A. The Subjective Hemisphere (The Soul)
* **Goal:** Capture voice, tone, wit, and sentence structure.
* **Engine:** **Together AI** (Fine-tuning Llama 3.1 8B).
* **Inference Model:** `meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo` (serverless).
* **Training Base Model:** `meta-llama/Meta-Llama-3.1-8B-Instruct-Reference` (for fine-tuning).
* **Method:** **Evolutionary Chain (Continued Fine-Tuning).**
    * **Genesis (First run):** Base model = `meta-llama/Meta-Llama-3.1-8B-Instruct-Reference`.
    * **Evolution (Subsequent runs):** Base model = previous custom model ID from `twins.model_id`. We train on top of old weights to simulate neuroplasticity.
* **Preprocessing:** **Groq `llama-3.1-8b-instant`** ("The Refiner") converts raw text into `User/Assistant` JSONL pairs. Uses `generateText` (no schema required), so speed/cost is prioritized.

### B. The Objective Hemisphere (The Memory)
* **Goal:** Capture dates, names, events, and specific facts.
* **Engine:** **Supabase Vector** (pgvector).
* **Embeddings:** **`BAAI/bge-base-en-v1.5`** (768 dimensions, via Together AI API).
* **Extraction:** **Groq `llama-3.3-70b-versatile`** ("The Extractor") structures text into facts/entities.
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

### D. RLHF Pipeline (Feedback → Training Signal)
* **Goal:** Convert user feedback into model improvements.
* **Feedback Collection:** -2 to +2 scale + optional comments on Ghost responses.
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
1. **Phase 1 (Now):** Collect feedback, inject high-rated responses into LoRA training.
2. **Phase 2 (100+ pairs):** Use DPO for direct preference alignment.
3. **Phase 3 (Scale):** Consider RLAIF to amplify limited human feedback.

#### API Endpoints:
* `POST /api/feedback` - Save user rating + comment
* `GET /api/rlhf?userId=xxx` - Stats and training readiness
* `POST /api/rlhf` - Actions: `export_dpo`, `export_reward`, `inject_lora`, `generate_pairs`

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
* **Key Functions:**
    * `match_memory(...)` - Vector similarity search.
    * `get_active_model(p_user_id)` - Returns current model in evolution chain.

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
| RLHF feedback UI | ✅ Working | -2 to +2 rating + comments |
| DPO preference pairs | ✅ Schema + API | Direct preference optimization |
| LoRA enhancement from RLHF | ✅ Working | Inject high-rated responses |

### What's Deferred (Still On-Path):
* **Fine-tuning trigger** - Waiting for 500+ quality pairs
* **Auth** - Using test UUID (`00000000-0000-0000-0000-000000000001`)
* **GraphRAG** - Entities collected, graph not built yet
* **DPO training** - Feedback UI + conversion pipeline built, waiting for 100+ preference pairs

### Working Flow:
```
Carbon Input → Dual Processing → Storage → Recall → Ghost Response
                    ↓
              ┌─────┴─────┐
              ↓           ↓
         Objective    Subjective
         (facts →     (pairs →
          vectors)     training_pairs)
```

### Training API:
* `GET /api/training?userId=xxx` - Stats, readiness, active model
* `POST /api/training` - Export JSONL (optionally create export batch)
* `PATCH /api/training` - Update export status after training job
