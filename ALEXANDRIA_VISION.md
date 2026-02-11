# Alexandria: The Complete Vision

> **This is the permanent source of truth for what Alexandria is and how to build it.**
> 
> All future sessions, agents, and models must read this document first.
> 
> Last updated: 2026-02-11

---

## Executive Summary

**Alexandria is a platform for cognitive immortalization.** We transform raw human data ("Carbon") into a Personal Language Model ("PLM") that possesses both the Author's subjective personality and objective memory. The PLM is a dynamic digital representation of the Author — a sovereign digital entity that can act on their behalf.

**The terminal state:** When digital AGI arrives, you plug it into Alexandria, and it understands exactly what to do. The system is model-agnostic, self-organizing within constraints, and continuously running.

**The architecture:** Two phases, each with input nodes flowing through an autonomous agent (Editor/Orchestrator) to output nodes. The agent's internal architecture is flexible — we provide a suggested default, but users can plug in their own model to redesign it entirely.

---

## Core Philosophy

### 1. Fidelity Over Engagement
Alexandria is not a consumer app maximizing engagement. It's a tool for cognitive immortalization. The Author serves the PLM, not the other way around. Friction that improves fidelity is good friction.

### 2. Model-Agnostic, Future-Proof
The system must work with any AI model. When better models arrive, they should be able to:
- Reprocess all raw data for better signal extraction
- Redesign the internal architecture for better performance
- Operate the runtime layer more effectively

### 3. Raw Data is Sacred
Every piece of input is stored in its original form, forever. This is axiomatic. Future models may extract signal we can't today.

### 4. Author Sovereignty
The Author owns their data. The Author decides what's shared. The Author can override any AI decision. The Author is the sole judge of PLM accuracy.

### 5. Minimal Immutability
The immutable rules should be as light as possible. Just enough to ensure the system is still solving for Alexandria's purpose and doesn't become a different app.

---

## Phase 1: The Editor

**Purpose:** Build the Persona by processing all input data and organizing it into the four output nodes.

### Input Nodes (3)

#### 1. AUTHOR (Bidirectional)
Direct communication between Author and Editor, like a human would communicate with their biographer.

- **Inbound:** Audio calls, text messages, voice memos, file shares, direct conversation
- **Outbound:** Editor can respond, ask questions, request clarification, send information back
- **Nature:** Real-time and asynchronous. The primary high-signal channel.

#### 2. AI (Bidirectional)
Connection to the Author's personal AI(s) — Claude, GPT, Gemini, or whatever they use.

- **Inbound:** Full conversation history (if allowed), real-time observation, data extraction
- **Outbound:** Editor can query the AI, ask clarifying questions, request context
- **Nature:** MCP-style connection. The AI may not allow full access — Editor should try to get maximum signal. As personal AIs become more personalized, they'll know a lot about the Author that Editor can extract.

#### 3. API (Unidirectional, Push-Based)
Background data streams from the Author's data silos.

- **Sources:** Google Drive, Gmail, Calendar, Notes apps, Health data, Social media, Screenshots, etc.
- **Nature:** Automatic push-based streaming. Editor has discretion to filter (e.g., may not want endless screenshots). Editor decides what's useful signal.
- **Goal:** Access to all data the Author generates in their normal life.

### The Editor Agent

The Editor is an autonomous agent that processes all inputs and builds the Persona. It has three layers:

#### Immutable Layer (Minimal Constraints)
These rules cannot be changed by any model:

1. **The Goal:** Build and refine a high-fidelity digital twin of the Author
2. **Raw Preservation:** All input data must be stored in original form
3. **Author Sovereignty:** Author can always override AI decisions
4. **Safety:** No harm, no deception
5. **Purpose Lock:** System must remain focused on cognitive immortalization (can't become a different app)

#### Architecture Layer (Model-Defined)

The internal architecture of the Editor is flexible. We provide:

- **SUGGESTED:** Alexandria's default architecture (always available as fallback)
- **SELECTED:** What's actually used (defaults to Suggested)

**How it works:**
1. By default, SELECTED = SUGGESTED
2. User can plug in their own model to design a new architecture
3. That model gets complete context about Alexandria (this document + everything)
4. The model designs an architecture (agents, loops, tools, workflows)
5. User locks in the new SELECTED architecture
6. User can always revert to SUGGESTED

**What the architecture model needs:**
- Complete understanding of Alexandria's purpose
- Full explanation of all decisions made so far
- Access to the current state of all data
- Knowledge of what the runtime model will need to do
- Freedom to design: spawn agents, create loops, define tools, set up workflows

**Like OpenClaw:** The architecture should provide enough structure that a smaller/faster model can operate the runtime effectively, while still allowing evolution and self-improvement within constraints.

#### Runtime Layer (Execution)

The runtime model operates within the Selected architecture:

- Executes 24/7 autonomously
- Processes all inputs continuously
- Routes data to appropriate output nodes
- Engages bidirectionally with Author (asks questions, fills gaps)
- Runs RLAIF using Constitution as ground truth
- Can browse the web for research if needed
- Evaluates its own performance
- Can be a smaller/faster model than the architecture model

**The runtime model does whatever the architecture decided it should do.** It's given the autonomy the architecture specified.

### Output Nodes (4)

#### 1. PLM (Training Data)
Everything needed to fine-tune the Personal Language Model:
- Training pairs (prompt/response examples in Author's voice)
- Quality scores for filtering
- Fine-tuning job history
- Model versions and checkpoints

#### 2. CONSTITUTION (Ground Truth)
The Author's explicit values, worldview, and rules:
- Core identity
- Tier 1/2/3 values
- Worldview (epistemology, ontology)
- Mental models and heuristics
- Boundaries (what Author won't do)
- Communication patterns
- Domain expertise

**This is the primary ground truth for RLAIF.** The Editor evaluates PLM responses against the Constitution to generate synthetic training signal. Constitutional AI approach.

#### 3. MEMORIES (Factual Knowledge)
Objective information about the Author:
- Facts, dates, events
- Entities and relationships
- Timeline of life events
- Vector embeddings for retrieval

#### 4. VAULT (Raw Preservation)
All original data in its unprocessed form:
- Raw audio files
- Original documents
- Unedited transcripts
- Everything, forever

**Plus cleaned versions:** Every raw file also has a "best-effort cleaned" version using current models. Future models can reprocess from raw.

### The RLAIF Loop

The primary mechanism for improving PLM:

1. Editor generates test prompts based on gaps in understanding
2. PLM responds to prompts
3. Editor evaluates responses against Constitution
4. High confidence → auto-approve as training data
5. Low confidence → queue for Author review
6. Author feedback refines Constitution and training data
7. PLM is retrained with improved data
8. Loop continues

### Phase 1 Output: The Persona

The four output nodes together form the **Persona**:
- PLM (the fine-tuned model)
- Constitution (ground truth)
- Memories (factual knowledge)
- Vault (raw data)

This becomes the input to Phase 2.

---

## Phase 2: The Orchestrator

**Purpose:** Package the Persona and deploy it to the world through controlled output channels.

### Input Nodes (4)
The four output nodes from Phase 1:
- PLM
- Constitution
- Memories
- Vault

### The Orchestrator Agent

Same three-layer pattern as the Editor:

#### Immutable Layer
1. **Privacy:** Author data is private and sovereign
2. **Control:** Author decides what information is shared
3. **Monetization Option:** Author can charge for access (or not)
4. **Gatekeeper:** Raw data never leaves; only Orchestrator outputs are exposed
5. **Uncertainty Handling:** When unsure, check with Author

#### Architecture Layer
- **SUGGESTED:** Alexandria's default orchestrator architecture
- **SELECTED:** What's actually used
- Same pattern: user can plug in model to redesign

#### Runtime Layer
- Creates unified Persona from the four input nodes
- Routes requests to appropriate output
- Manages privacy and access control
- Checks with Author when uncertain
- Operates 24/7 autonomously

### Output Nodes (3)

#### 1. AUTHOR (Continuous, Proactive)
Direct interface between Persona and Author:

**Reactive:**
- Responds when Author engages
- Answers questions
- Handles requests

**Proactive (Key differentiator):**
- Continuously browses the web
- Looks for things Author would find interesting
- Suggests content, opportunities, ideas
- Attends to things Author doesn't have time for
- Acts as an extension of Author's attention
- Like if Author had unlimited time/attention

**Goal:** Positive-sum attention. The Persona gives the Author more effective attention capacity.

#### 2. TOOL
Persona as a callable tool for Author's other AIs:

- Author's Claude/GPT/etc. can call the Persona when relevant
- The AI should understand Persona = digital twin of Author
- AI interacts with Persona as it would interact with Author
- Supplements AI's own understanding with Persona's deep knowledge
- How exactly this works is left to the AI and Orchestrator to figure out

#### 3. API (External Access)
Controlled access for external parties:

**Gatekeeper model:** The Persona process is hidden. External parties only see Orchestrator outputs. They can copy the outputs (that's fine), but never access the raw data.

**Privacy:** Author data stays private and sovereign
**Monetization:** Author can charge for access (or not, or varied pricing)
**Control:** Author approves uncertain interactions

---

## The Architecture Pattern (Suggested/Selected)

This pattern appears in both Editor and Orchestrator:

```
┌─────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE LAYER                        │
│                                                              │
│   ┌─────────────────┐         ┌─────────────────┐           │
│   │    SUGGESTED    │         │    SELECTED     │           │
│   │                 │ ──────▶ │                 │           │
│   │  Alexandria     │ default │  What's         │           │
│   │  default        │         │  actually used  │           │
│   │                 │         │                 │           │
│   │  Always         │         │  Can be:        │           │
│   │  available      │         │  • = Suggested  │           │
│   │  as fallback    │         │  • Custom       │           │
│   └─────────────────┘         └─────────────────┘           │
│                                                              │
│   User can plug in their own model to create custom         │
│   Selected architecture. Can always revert to Suggested.    │
└─────────────────────────────────────────────────────────────┘
```

**Format:** Architecture is stored as data (YAML/JSON), not hardcoded. The architecture model writes it, the runtime model reads and executes it.

---

## Context for New Models

When a new model is plugged in to design an architecture, it needs to understand:

### What Alexandria Is
1. A cognitive immortalization platform
2. Transforms human data into a sovereign digital entity
3. Two phases: Editor (build Persona) → Orchestrator (deploy Persona)
4. Model-agnostic, future-proof, always preserves raw data
5. Author is the sole judge of accuracy

### What the Model's Job Is
1. Design an architecture for the Editor or Orchestrator
2. The architecture will be executed by a (possibly different) runtime model
3. The architecture should enable the runtime model to:
   - Process all inputs effectively
   - Route to correct output nodes
   - Engage bidirectionally with Author
   - Run RLAIF against Constitution
   - Operate 24/7 autonomously

### What Tools Are Available
- Agent spawning (create sub-agents for specific tasks)
- Loops (periodic actions, reflection cycles)
- Notepad/scratchpad (persistent state)
- Web browsing
- Author queries
- Memory lookup
- All storage nodes

### Constraints
- Must stay within Immutable Layer rules
- Must still be solving for Alexandria's purpose
- Raw data must always be preserved
- Author sovereignty must be maintained

### What Good Looks Like
- OpenClaw-style: enough structure that smaller models can operate
- But flexible enough to evolve and self-improve
- Clear separation of concerns
- Efficient data routing
- Effective RLAIF loop
- Proactive Author engagement

---

## Immutable Rules (Complete List)

These cannot be changed by any model:

### Phase 1 (Editor)
1. Goal is to build high-fidelity digital twin of Author
2. All raw input data must be preserved forever
3. Author can override any AI decision
4. System must remain focused on cognitive immortalization
5. No harm, no deception

### Phase 2 (Orchestrator)
1. Author data is private and sovereign
2. Author controls what information is shared
3. Monetization must always be an option
4. Raw data never leaves the system
5. When uncertain, check with Author

---

## Storage Principles

### Raw + Cleaned Dual Storage
Every piece of data has two versions:
1. **Raw:** Original, unprocessed, permanent
2. **Cleaned:** Best-effort interpretation by current model

Future models can reprocess from raw to create better cleaned versions.

### Scalable Format
Store in formats that scale:
- Structured data → PostgreSQL with proper indexing
- Vector data → pgvector
- Large files → Object storage (Supabase Storage)
- Raw text → Preserved with full metadata

### Lineage Tracking
Know where every piece of data came from:
- Source (which input node)
- Timestamp
- Processing model
- Confidence scores

---

## Summary Diagram

```
                              PHASE 1: EDITOR
                              
     ┌─────────┐  ┌─────────┐  ┌─────────┐
     │ AUTHOR  │  │   AI    │  │   API   │
     │(bidirec)│  │(bidirec)│  │ (push)  │
     └────┬────┘  └────┬────┘  └────┬────┘
          │            │            │
          └────────────┼────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │     EDITOR      │
              │                 │
              │ [Immutable]     │
              │ [Architecture]  │
              │ [Runtime]       │
              └────────┬────────┘
                       │
     ┌─────────┬───────┼───────┬─────────┐
     │         │       │       │         │
     ▼         ▼       ▼       ▼         │
  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐     │
  │ PLM │  │CONST│  │ MEM │  │VAULT│     │
  └──┬──┘  └──┬──┘  └──┬──┘  └──┬──┘     │
     │        │        │        │        │
     └────────┴────────┴────────┘        │
                       │                 │
                       ▼                 │
              ┌─────────────────┐        │
              │    PERSONA      │        │
              └────────┬────────┘        │
                       │                 │
                              PHASE 2: ORCHESTRATOR
                       │
                       ▼
              ┌─────────────────┐
              │  ORCHESTRATOR   │
              │                 │
              │ [Immutable]     │
              │ [Architecture]  │
              │ [Runtime]       │
              └────────┬────────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
     ┌─────────┐  ┌─────────┐  ┌─────────┐
     │ AUTHOR  │  │  TOOL   │  │   API   │
     │(proact.)│  │(for AI) │  │(extern.)│
     └─────────┘  └─────────┘  └─────────┘
```

---

## Appendix: Raw Conversation Archive

The complete conversation that led to this vision is preserved at:
`docs/vision-conversation-2026-02-11.md`

This includes all raw discussion, questions, clarifications, and iterations. Future models should reference this if anything in the synthesized version above is unclear.

---

## Next Steps (Current State)

### What Exists (as of 2026-02-11)
- ✅ Phase 1 output nodes (PLM, Constitution, Memories, Vault)
- ✅ Basic Editor functionality (processes input, routes to nodes)
- ✅ RLAIF implementation (evaluates against Constitution)
- ✅ Web UI for direct Author input
- ⚠️ No autonomous 24/7 loop (requires compute upgrade)
- ❌ AI input node (MCP bridge)
- ❌ API input node (data silo integrations)
- ❌ Real-time audio (requires iOS app or Twilio)
- ❌ Architecture layer (Suggested/Selected pattern)
- ❌ Phase 2 (Orchestrator)

### Priority Order
1. Formalize the architecture pattern (Suggested/Selected)
2. Add autonomous loop (cron or always-on compute)
3. Build AI input node (MCP bridge)
4. Build API input node (start with Google)
5. Build real-time audio (iOS app)
6. Build Phase 2 (Orchestrator)

---

*This document is the source of truth. Update it as the vision evolves.*
