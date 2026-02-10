# Alexandria Architecture: Carbon to Silicon Translation

> **Last Updated:** 2026-02-10  
> **Status:** Evolution roadmap (current implementation documented in ALEXANDRIA_CONTEXT.md)

---

## 1. System Overview

Alexandria is a **digital cognition platform** that maps carbon neural weights (human thinking) into silicon weights (Personal Language Models). It enables users to create sovereign digital entities that authentically represent their personality, values, and memories.

### The Core Transformation

```
CARBON (Human Cognition)
         ↓
    PROCESSING LAYER
    (2 Continuous Agents)
         ↓
  STORAGE LAYER
  (4 Components)
         ↓
SILICON (Digital Cognition)
```

---

## 2. The Six-Part System

### Agents (Processing Layer)

| Agent | Role | Behavior Pattern | Key Responsibility |
|-------|------|-----------------|-------------------|
| **Editor** | Input processor | Continuous, proactive | Builds Constitution, extracts memories, generates training pairs, runs Constitutional RLAIF |
| **Orchestrator** | Output handler | Reactive with intelligence | Routes queries, weights Constitution vs PLM, represents user externally |

### Components (Storage Layer)

| Component | Type | Purpose | Mutability |
|-----------|------|---------|-----------|
| **Constitution** | Markdown file | Explicit worldview, mental models, values, decision heuristics | Continuously refined by Editor |
| **PLM** | Fine-tuned model | Learned behavioral patterns, trained on Constitution + feedback | Periodically retrained |
| **Memories** | Graph database | Episodic recall: facts, events, conversations, relationships | Continuously growing |
| **Vault** | Raw storage | Data sovereignty: all user data in downloadable format | Append-only |

---

## 3. Data Flow Architecture

### Input Side: Editor Builds Components

```
User Input (Carbon)
      ↓
  EDITOR AGENT
  (continuous, proactive)
      ↓
  ┌───┴───┬───────┬────────┐
  ↓       ↓       ↓        ↓
Constitution  Memories  PLM    Vault
(explicit)    (graph)   (train) (raw)
```

**Editor's Responsibilities:**
1. **Socratic Questioning:** Extract subjective data through conversation
2. **Constitution Building:** Formalize worldview into explicit markdown
3. **Memory Extraction:** Parse objective facts into graph structure
4. **Training Pair Generation:** Create Constitutional-aligned training data
5. **Constitutional RLAIF:** Evaluate PLM outputs against Constitution
6. **Proactive Triggers:** Initiate conversations when patterns/gaps detected

### Output Side: Orchestrator Uses Components

```
External Query
      ↓
  ORCHESTRATOR AGENT
  (intelligent routing)
      ↓
  ┌───┴────┬─────────┐
  ↓        ↓         ↓
Constitution  Memories  PLM
  (80%→20%)   (facts)   (20%→80%)
      ↓
  Weighted Response
  (hidden synthesis)
      ↓
  External Actor
```

**Orchestrator's Responsibilities:**
1. **Query Analysis:** Determine if factual, values-based, or behavioral
2. **Component Weighting:** Dynamic ratio based on PLM maturity
3. **Memory Retrieval:** Graph traversal for relevant context
4. **Constitution Application:** Ground truth for values/worldview
5. **PLM Inference:** Behavioral patterns from fine-tuned model
6. **Response Synthesis:** Unified voice hiding internal architecture

---

## 4. Constitutional AI Methodology

### Why Constitution as Explicit File?

**Current Problem:** Constitutional values are implicit in training data. When PLM makes mistakes, no ground truth exists for evaluation.

**Solution:** Constitution is an explicit markdown document that serves as:
- **Training Ground Truth:** RLAIF evaluator uses Constitution to judge PLM
- **Runtime Fallback:** Orchestrator uses Constitution when PLM uncertain
- **Human-Readable Audit:** User can see/edit their formalized worldview
- **Portable Personality:** Constitution transfers across model versions

### Constitutional RLAIF Loop

```
1. Editor generates synthetic prompt (based on Constitution gaps)
      ↓
2. PLM generates response
      ↓
3. Editor evaluates response against Constitution
      ↓
4. If aligned → training pair (positive)
   If misaligned → regenerate or flag for user review
      ↓
5. User occasionally validates synthetic evaluations
      ↓
6. PLM retrains on Constitutional-verified data
      ↓
7. PLM gradually internalizes Constitution (80% → 20% weighting shift)
```

**Key Insight:** Constitution is personalized ground truth. Unlike generic RLHF (which uses crowd preferences), Constitutional RLAIF uses **the user's own values** as the reward function.

### Gradual PLM Weighting Strategy

| Stage | Constitution Weight | PLM Weight | Rationale |
|-------|-------------------|-----------|-----------|
| **Initial** | 80% | 20% | PLM untrained, Constitution is ground truth |
| **Training** | 60% | 40% | PLM learning, but Constitution still primary |
| **Mature** | 30% | 70% | PLM internalized Constitution, trusts weights |
| **Advanced** | 20% | 80% | PLM superior to explicit rules, Constitution safety net |

**Orchestrator Intelligence:** Dynamically adjusts weights based on:
- PLM training cycles completed
- Constitutional RLAIF validation scores
- Query type (values questions favor Constitution, behavioral favor PLM)
- User feedback patterns

---

## 5. Continuous Agent Pattern (Moltbot-Style)

### Reactive vs Continuous

| Pattern | Trigger | Behavior | Example |
|---------|---------|----------|---------|
| **Reactive** (current) | User sends message | Agent responds, then sleeps | Chatbot waiting for input |
| **Continuous** (target) | Internal conditions + external events | Agent initiates, not just responds | Editor notices pattern → asks clarifying question |

### Editor Continuous Triggers

```typescript
// Proactive behavior examples
{
  "trigger": "constitution_gap_detected",
  "condition": "user expressed political view 3x, no entry in Constitution.politics",
  "action": "initiate_conversation: 'I noticed you mention politics often. Can we formalize your views?'"
}

{
  "trigger": "consistency_conflict",
  "condition": "new statement contradicts Constitution.values.honesty",
  "action": "clarify: 'This seems different from your principle that honesty > politeness. Has that changed?'"
}

{
  "trigger": "memory_enrichment",
  "condition": "user mentioned 'Sarah' 5x, no relationship graph entry",
  "action": "extract_context: 'Tell me about Sarah - how do you know her?'"
}

{
  "trigger": "training_opportunity",
  "condition": "PLM validation score < 0.7 on Constitution.humor",
  "action": "generate_rlaif_batch: 10 humor prompts for Constitutional evaluation"
}
```

### Implementation Pattern

**Current (Reactive):**
```typescript
// API route waits for HTTP request
export async function POST(req: Request) {
  const { message } = await req.json();
  const response = await editor.converse(message);
  return Response.json(response);
}
```

**Target (Continuous):**
```typescript
// Background process with event loop
class EditorAgent {
  async run() {
    while (true) {
      const triggers = await this.checkTriggers();
      for (const trigger of triggers) {
        await this.handleTrigger(trigger);
      }
      await sleep(60000); // Check every minute
    }
  }
  
  private async checkTriggers() {
    return [
      await this.checkConstitutionGaps(),
      await this.checkConsistencyConflicts(),
      await this.checkTrainingOpportunities(),
      await this.checkMemoryEnrichment()
    ].filter(t => t !== null);
  }
}
```

---

## 6. Memories vs Vault Architecture

### The Distinction

| Aspect | Vault | Memories |
|--------|-------|----------|
| **Purpose** | Data sovereignty | Operational recall |
| **Structure** | Raw files (append-only) | Graph database |
| **Query Pattern** | Backup/download | Real-time traversal |
| **Content** | Everything (text, audio, images, biometrics) | Extracted facts/relationships |
| **Mutability** | Immutable | Nodes/edges can be enriched |
| **Ownership** | User downloads anytime | User + system co-manage |

### Vault Design

```
vault/
├── conversations/
│   ├── 2026-02-10-editor-session-001.json
│   ├── 2026-02-10-telegram-chat-005.json
├── voice/
│   ├── 2026-02-10-morning-note.m4a
│   ├── 2026-02-10-afternoon-reflection.m4a
├── documents/
│   ├── uploaded-journal-2024.pdf
│   ├── personal-essay.docx
├── biometrics/ (future)
│   ├── 2026-02-10-sleep-data.json
│   ├── 2026-02-10-activity.json
├── exports/
│   ├── plm-weights-v23.safetensors
│   ├── constitution-2026-02-10.md
│   ├── memories-graph-export.json
```

**Guarantees:**
- Every interaction stored in original format
- User can download entire vault as .zip anytime
- PLM weights included (sovereign AI)
- Constitution included (human-readable worldview)
- Memories exportable as graph JSON

### Memories Graph Schema

```
NODES:
- Entity (person, place, organization, concept)
- Event (timestamped happening)
- Fact (atomic piece of knowledge)
- Value (expressed preference/principle)

EDGES:
- KNOWS (entity → entity, with context)
- PARTICIPATED_IN (entity → event)
- RELATED_TO (fact → entity/event)
- EXPRESSED (entity → value, timestamped)
- CAUSED (event → event)
- CONTRADICTS (value → value, requires resolution)

PROPERTIES:
- timestamp (when added/last updated)
- confidence (0-1, based on source quality)
- source (which conversation/document)
- embedding (for semantic search)
```

### Query Patterns

**Vault (Sovereignty):**
```typescript
// User downloads everything
GET /api/vault/export
→ ZIP file with all raw data + PLM weights + Constitution

// User deletes everything (right to be forgotten)
POST /api/vault/delete
→ Deletes PLM, Constitution, Memories, Vault (irreversible)
```

**Memories (Operational):**
```typescript
// Orchestrator needs context for query
GET /api/memories/traverse?query="Sarah's birthday"
→ Graph traversal: Sarah KNOWS User → Sarah HAS birthday → Event(2024-03-15)

// Editor checks for Constitution gaps
GET /api/memories/gaps?constitution_section="politics"
→ Entities mentioned often but not in Constitution.politics
```

---

## 7. External Interfaces

### Telegram Interface Option

**Why Telegram?**
- Ubiquitous (existing user behavior)
- Voice messages native (highest fidelity carbon)
- Async (matches continuous agent pattern)
- API-friendly (webhooks for proactive messages)

**Implementation:**
```
User → Telegram Bot → Alexandria API → Editor/Orchestrator → Response
                           ↓
                    Same backend as web
```

**Editor Proactive Example:**
```
[Telegram notification]
📝 Editor: I noticed you mentioned "startup ideas" three times this week 
but your Constitution doesn't have an entrepreneurship section. 
Want to formalize your philosophy on building companies?

[User responds via voice note]
[Editor extracts → updates Constitution.entrepreneurship]
```

### MCP Connections to SOTA Models

**Purpose:** Allow user's Orchestrator to access Claude/ChatGPT while maintaining Alexandria personality.

**Architecture:**
```
External Tool (Claude Desktop, ChatGPT app)
      ↓
  MCP Protocol
      ↓
Alexandria Orchestrator API
      ↓
  Constitution + Memories + PLM
      ↓
  Response (hidden synthesis)
      ↓
External Tool displays as if SOTA model
```

**User Experience:**
- User asks Claude a question
- Claude routes to Alexandria MCP server
- Alexandria Orchestrator generates response using user's Constitution/Memories/PLM
- Response appears in Claude interface
- **External observer sees:** User talking to Claude
- **Reality:** User's digital cognition answering via Claude's interface

**Hidden Inputs Principle:** External actors never see the internal architecture (Constitution, raw PLM, Memories). They only see synthesized responses.

### External API (Marketplace Foundation)

**Use Cases:**
1. **Personal AI Assistant:** "Answer emails as I would"
2. **Content Generation:** "Write tweets in my voice"
3. **Decision Support:** "What would I do in this situation?"
4. **Collaborative Agents:** "Represent me in this meeting"

**API Design:**
```typescript
POST /api/v1/query
{
  "userId": "uuid",
  "apiKey": "secret",
  "query": "What would I think about this proposal?",
  "context": { /* optional additional context */ }
}

Response:
{
  "response": "Based on your principle that simplicity > features...",
  "confidence": 0.87,
  "sources": ["Constitution.values.simplicity", "Memory: 2024 product decisions"]
}
```

**Privacy Controls:**
- User configures allowed query types
- Rate limits per API key
- Audit log of all external queries
- Can disable anytime

---

## 8. Web4 Positioning: Data Vaults in Free Inference Space

### The Economic Shift

**Web2:** Platforms own your data, sell ads  
**Web3:** You own tokens, platforms still control infrastructure  
**Web4:** You own data vaults, inference costs approach zero

### Why Frontier Labs Won't Build This

| Aspect | Frontier Lab Economics | Alexandria Economics |
|--------|----------------------|---------------------|
| **Revenue Model** | API calls ($$$) | PLM sovereignty (free inference after training) |
| **Lock-in** | Keep users on platform | User owns weights, can leave anytime |
| **Data Strategy** | Aggregate for foundation models | Personalized fine-tuning |
| **Inference** | Centralized (they serve) | Decentralized (user runs PLM locally if desired) |
| **Incentive** | Maximize engagement | Maximize fidelity |

**The Break:** Once inference is free (local LLMs, efficient fine-tuning), **data vaults become the moat**. Frontier labs can't monetize personal fine-tuning without destroying their API business.

### Alexandria's Moat

1. **Constitutional AI Infrastructure:** No one else is building personalized ground truth systems
2. **Continuous Agent Pattern:** Proactive personality extraction (not passive chat logs)
3. **Graph Memories + Vault:** Sovereign data with operational intelligence
4. **Gradual PLM Weighting:** Smooth transition from Constitution → internalized model
5. **First-Mover on Fidelity:** Optimizing for accuracy over engagement (frontier labs can't do this)

### Web4 Future State

```
User's Alexandria Vault (local or cloud)
      ↓
   PLM Weights (downloaded)
      ↓
   Local Inference (free)
      ↓
   No Platform Lock-in
```

**Key Insight:** In a world of free inference, **the proprietary data vault + Constitutional training methodology** is the defensible asset. Frontier labs are incentivized to keep you on their platforms. Alexandria is incentivized to make you sovereign.

---

## 9. Architecture Principles (Foundational)

### 1. Constitutional AI Methodology
- Constitution is personalized ground truth for RLAIF
- Explicit beats implicit (markdown file beats weights-only)
- User's values are the reward function, not crowd preferences

### 2. Continuous Agent Pattern
- Proactive behavior beats reactive waiting
- Agents have internal state and triggers
- 24/7 operation (not request/response only)

### 3. Bicameral Separation
- Subjective (Constitution, PLM) separate from Objective (Memories, Vault)
- Different processing, different query patterns
- Reunited only in Orchestrator synthesis

### 4. Data Sovereignty
- User owns everything (raw data + processed outputs + model weights)
- Can download anytime, can delete anytime
- No platform lock-in (PLM runs anywhere)

### 5. Hidden Synthesis
- External actors see unified voice
- Internal architecture (Constitution, PLM, Memories) stays hidden
- Positive-sum attention: represent user well externally

### 6. Gradual PLM Weighting
- Start Constitution-heavy, shift to PLM-heavy as training matures
- Dynamic weighting based on validation scores
- Constitution remains safety net even at 20%

### 7. Fidelity Over Engagement
- Optimize for accuracy, not happiness
- Friction that improves fidelity is good friction
- User serves PLM, not vice versa

---

## 10. Success Metrics

| Metric | Target | Reasoning |
|--------|--------|-----------|
| **Constitutional Coverage** | 80% of recurring topics formalized | Ground truth must be comprehensive |
| **PLM Validation Score** | >0.85 on Constitutional RLAIF | PLM accurately represents values |
| **Memory Recall Precision** | >0.90 on user-validated facts | Objective data must be correct |
| **Orchestrator Weighting** | Reach 70% PLM (from 20%) | PLM internalized Constitution |
| **User Feedback Frequency** | 1 correction per 10 interactions | High-quality automated behavior |
| **Vault Completeness** | 100% of interactions stored | Data sovereignty guarantee |
| **External API Confidence** | >0.80 on marketplace queries | Safe to represent user externally |

---

## 11. Design Constraints

### What We DON'T Do

| Anti-Pattern | Why Not |
|-------------|---------|
| **Engagement Optimization** | Sacrifices fidelity for user happiness |
| **Generic Personality Templates** | Defeats personalization purpose |
| **Platform Lock-in** | Web4 principle: user owns everything |
| **Implicit Constitution** | No ground truth for RLAIF without explicit doc |
| **Single Agent Architecture** | Input processing ≠ output synthesis |
| **Memories as Vector DB Only** | Graph traversal needed for relationships |
| **Reactive-Only Agents** | Misses opportunities for proactive extraction |

---

## 12. Technical Stack Implications

### Current (Reactive Web App)
- Next.js API routes
- Vercel serverless
- HTTP request → response cycle

### Target (Continuous + Web App)
- Next.js API routes (for user-initiated queries)
- **+ Background workers** (for continuous agents)
- **+ Event queue** (trigger system)
- **+ Telegram bot webhook** (async interface)
- **+ MCP server** (SOTA model connections)

### Infrastructure Additions Needed

| Component | Purpose | Technology Options |
|-----------|---------|-------------------|
| **Background Workers** | Run continuous agents | Vercel Cron, Inngest, Temporal |
| **Event Queue** | Trigger management | Upstash, Redis, PostgreSQL |
| **Graph Database** | Memories storage | Neo4j, PostgreSQL with pg_graph |
| **Vault Storage** | Raw file storage | Supabase Storage, R2, S3 |
| **Telegram Bot** | Async interface | Telegram Bot API + webhooks |
| **MCP Server** | SOTA connections | Model Context Protocol implementation |

---

## Conclusion: The Line from Current → Terminal State

**Current State:** Reactive editor + basic orchestrator + vector memories + training pipeline

**Terminal State:** Continuous agents + Constitutional RLAIF + graph memories + vault sovereignty + external APIs + MCP integrations

**The Path:** 7 phases documented in MIGRATION_PLAN.md

**Key Insight:** This isn't just adding features. It's evolving from a **training tool** (current) to a **sovereign digital entity** (terminal). The architecture must support:
1. Proactive behavior (continuous agents)
2. Explicit ground truth (Constitution)
3. Rich context (graph memories)
4. Data sovereignty (Vault)
5. External representation (Orchestrator intelligence + APIs)
6. Interoperability (MCP, Telegram, marketplace)

**The Bet:** In a world of free inference, personalized Constitutional AI with sovereign data vaults is the moat frontier labs can't replicate without destroying their business models.
