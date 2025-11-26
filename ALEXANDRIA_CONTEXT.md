# Project Alexandria: System Architecture & Protocol

## 1. The Vision (North Star)

**Mission:** "Translation of Carbon Weights to Silicon Weights."
We are building a platform to immortalize human cognition. We transform raw human data ("Carbon") into a Digital Twin ("Ghost") that possesses both the user's **Subjective Personality** and **Objective Memory**.

**Terminal State Goal:** A "Sovereign Digital Entity" that can act on behalf of the user, answer queries with 100% personality fidelity and factual accuracy, and eventually support GraphRAG-based reasoning and voice/video embodiment.

---

## 2. The Bicameral Architecture (Technical Core)

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

---

## 3. Tech Stack & Constraints

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

## 4. Database Schema (Supabase)

* **Migrations:** Located in `supabase/migrations/`. Run via Supabase SQL Editor.
* **MVP Note:** Foreign key constraints to `auth.users` are **removed** for testing. Re-add when implementing authentication.
* **Key Tables:**
    * `entries`: Raw text logs (Carbon input).
    * `memory_fragments`: Vector chunks (768 dim) + `entities` JSONB column (for future GraphRAG).
    * `twins`: Stores `model_id` (Together AI string), `training_job_id`, and training status.
    * `chat_sessions`: Groups chat messages by session.
    * `chat_messages`: Stores history for context injection.
    * `feedback_logs`: Stores RLHF (Thumbs up/down) data for future DPO training.
* **Key Function:** `match_memory(query_embedding, match_threshold, match_count, p_user_id)` - Vector similarity search.

---

## 5. Operational Workflow
We follow a strict **Gitflow-Lite** process:

1.  **Main:** Production ready.
2.  **Develop:** Integration testing.
3.  **Feature Branches:** `feature/[name]`.
    * *Rule:* Every feature branch must include an `ALEXANDRIA_CONTEXT.md` update if architecture changes.

---

## 6. Code Style Guidelines
* **Interfaces:** Use functional names, no "I" prefix. (e.g., `Refiner`, `Tuner`, `Indexer`).
* **Modularity:** Use the **Factory Pattern** (`lib/factory.ts`) to instantiate logic modules. Never hardcode providers in API routes.
* **Error Handling:** Serverless functions must return clean JSON errors, never crash. Use try/catch with detailed error logging.
* **Type Safety:** Use `zod` for all API inputs. For LLM structured outputs with Groq, use manual JSON parsing with zod validation.

---

## 7. Environment Configuration

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

## 8. Summary of Current State (MVP)

**Status: ✅ OPERATIONAL** (as of Nov 2025)

We are building the **Skeleton of the Giant**.
* Input is text-only (for now).
* Ingestion splits data into Vector (Facts) and LoRA training data (Style).
* We are "Stealth Collecting" graph nodes in the `memory_fragments` table to enable GraphRAG later without migration.
* Fine-tuning upload is **deferred** - training data is generated but not uploaded yet.
* **Auth:** `userId` is currently a test UUID (`00000000-0000-0000-0000-000000000001`). **Next Priority:** Implement Supabase Auth.

### Working Flow:
1. **Carbon Input** → User enters text
2. **Extraction** → Groq extracts atomic facts
3. **Embedding** → Together AI generates 768-dim vectors
4. **Storage** → Supabase stores facts with embeddings
5. **Recall** → Vector similarity search finds relevant memories
6. **Ghost Response** → Together AI generates response with memory context
