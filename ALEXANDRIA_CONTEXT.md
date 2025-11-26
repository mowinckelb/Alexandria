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
* **Method:** **Evolutionary Chain (Continued Fine-Tuning).**
    * **Genesis (First run):** Base model = `meta-llama/Meta-Llama-3.1-8B-Instruct-Reference`.
    * **Evolution (Subsequent runs):** Base model = previous custom model ID from `twins.model_id`. We train on top of old weights to simulate neuroplasticity.
* **Preprocessing:** **Groq Compound Mini** ("The Refiner") converts raw text into `User/Assistant` JSONL pairs. Uses `generateText` (no schema required), so speed/cost is prioritized.

### B. The Objective Hemisphere (The Memory)
* **Goal:** Capture dates, names, events, and specific facts.
* **Engine:** **Supabase Vector** (pgvector).
* **Embeddings:** **Nomic-Embed-Text-v1.5** (via Together AI API).
* **Extraction:** **Groq Llama 3.3 70B Versatile** ("The Extractor") structures text into facts/entities. Uses `generateObject` with zod schema, so intelligence/reliability is prioritized over speed.
* **Scaling Strategy:**
    * **Stage 1:** HNSW Indexing (Current MVP).
    * **Stage 2:** Hybrid Search (Vector + Keyword).
    * **Stage 3:** **Stealth Graph.** We extract `entities` (Graph Nodes) during ingestion *now*, so we can build a Knowledge Graph later without re-processing data.

### C. The Orchestrator (The Brain)
* **Goal:** Route queries and manage the conversation.
* **Engine:** **Groq (Llama 3.3 70B Versatile)**.
* **Logic:**
    1.  User asks question.
    2.  Orchestrator decides: "Do I need facts?"
    3.  If YES: Calls `recall_memory` tool (Supabase).
    4.  **ALWAYS:** Calls `consult_ghost` tool (Together AI) to generate the final response using the fine-tuned weights. The Orchestrator *never* speaks directly to the user.
* **Enforcement:** System prompt instructs "ALWAYS use consult_ghost". If hallucination occurs, escalate to `toolChoice: 'required'`.

---

## 3. Tech Stack & Constraints

### Frontend
* **Framework:** Next.js 14+ (App Router).
* **Language:** TypeScript (Strict).
* **Styling:** Tailwind CSS.
* **Design System:** **"Apple Aesthetic."** Minimalist, San Francisco font, frosted glass (`backdrop-blur`), high whitespace, subtle borders, `lucide-react` icons.
* **Streaming:** Vercel AI SDK v5.

### Backend (API Routes)
* **Runtime:** Vercel Serverless (Edge or Node.js).
* **SDKs:**
    * `@ai-sdk/openai` (for Groq inference via OpenAI-compatible API).
    * `@ai-sdk/togetherai` (for Together AI inference).
    * `@supabase/supabase-js` (for Database).
    * **CRITICAL EXCEPTION:** Do NOT use the `together-ai` SDK for **Training/Uploads**. Use **Raw `fetch`** with `FormData` and `Blob` to avoid serverless file-system issues. Use the SDK only for Inference.

### AI SDK v5 Working Patterns (STRICT)

These patterns were discovered through testing with AI SDK v5.0.101:

| Documentation Says | Actually Works |
|-------------------|----------------|
| `parameters: z.object({...})` | `inputSchema: z.object({...})` |
| `maxSteps: 3` | `stopWhen: stepCountIs(3)` |
| `toDataStreamResponse()` | `toUIMessageStreamResponse()` (for tool visualization) |
| `import { useChat } from 'ai/react'` | `import { useChat } from '@ai-sdk/react'` |

* **Tool Definition:** Use the `tool()` helper with `inputSchema` (zod schema).
* **Multi-step:** Use `stopWhen: stepCountIs(n)` to allow tool use -> return -> final answer flow.
* **Response Streaming:** Use `.toUIMessageStreamResponse()` to send tool call events to frontend.
* **React Hooks:** Install `@ai-sdk/react` separately; hooks are not in the main `ai` package.

---

## 4. Database Schema (Supabase)
* **Migrations:** Managed via Cursor in `supabase/migrations/`. Do not use the Dashboard SQL editor.
* **Key Tables:**
    * `entries`: Raw text logs (Carbon input).
    * `memory_fragments`: Vector chunks + `entities` JSONB column (for future GraphRAG).
    * `twins`: Stores `model_id` (Together AI string), `training_job_id`, and training status.
    * `chat_sessions`: Groups chat messages by session.
    * `chat_messages`: Stores history for context injection.
    * `feedback_logs`: Stores RLHF (Thumbs up/down) data for future DPO training.

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
* **Error Handling:** Serverless functions must return clean JSON errors, never crash.
* **Type Safety:** Use `zod` for all API inputs and LLM structured outputs.

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
We are building the **Skeleton of the Giant**.
* Input is text-only (for now).
* Ingestion splits data into Vector (Facts) and LoRA (Style) immediately.
* We are "Stealth Collecting" graph nodes in the `memory_fragments` table to enable GraphRAG later without migration.
* We use a "Lazy Check" polling mechanism for training status (to avoid complex Webhooks).
* **Auth:** `userId` is currently hardcoded as `FIXME_AUTH_ID` for testing. **Next Priority:** Implement Supabase Auth to replace this placeholder.
