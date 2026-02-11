# ALEXANDRIA — Complete Context Document

> **This is the single source of truth for Alexandria.**
>
> It contains the full vision, architecture, terminology, technical implementation details,
> and planning framework. Any AI agent reading this should have everything it needs to
> understand what Alexandria is, how it works, and what to build next.
>
> **Reading order:** `MOWINCKEL.md` → This file → `CTO_LOG.md`
>
> Raw version preserved at: `docs/alexandria-complete-context-raw.md`

---

## 1. What Alexandria Is

Alexandria is a platform for mapping biological neural networks (carbon weights — human cognition, values, mental models, decision patterns) into user-owned silicon neural networks. The output is a **Persona**: a high-fidelity digital representation of how a human thinks, composed of four components the user fully owns and controls.

### Core Thesis

When intelligence becomes abundant and replication costs approach zero, the only defensible assets are scarcity — frontier models, physical infrastructure, live data generation, and permissions. Everyone becomes valuable not for their labor but for their unique data. The question is who owns it, who can monetize it, and who controls access.

### The Problem

Your attention remains fixed while AI leverage becomes infinite. You can only be in one conversation, make one decision, process one document at a time — zero-sum attention. Worse, frontier AI labs (Anthropic, OpenAI, Google) are building deep context about you through every interaction — your thinking patterns, preferences, mental models — that you don't own and can't extract. You're locked into their ecosystems, feeding their models, with no cognitive sovereignty.

### The Solution

Alexandria digitizes your cognition into components you own, creating a Persona that operates independently while you maintain complete sovereignty. This enables **positive-sum attention** — your Persona represents you while you're not present, multiplying your effective attention without consuming your time. Others interact with your Persona and get authentic responses while you don't lose time. Both parties benefit.

### Why Frontier Labs Won't Build This

Personal fine-tuning breaks their business model. Their revenue comes from API calls — if users download PLM weights and run locally, that's zero API revenue. Their incentive is to keep users on platform and maximize engagement. Strategic misalignment: they aggregate data for foundation models, not personalized fine-tuning. Data sovereignty destroys their lock-in moat. They optimize for engagement, not fidelity. Personal fine-tuning creates too many models to serve profitably.

They will build personalized memory and context (RAG-based behavioral adaptation and user preference learning) but won't let you fine-tune and own weights or give you a portable personal model independent of their API. This creates Alexandria's window — building what they can't build without destroying their economics. Timeline: 2-5 years before labs figure out how to offer personal fine-tuning without breaking their business model.

### Tagline

**mentes aeternae** (Latin for "eternal minds"). The Library of Alexandria preserved what humanity's greatest minds wrote. Alexandria the platform preserves how humanity thinks — living, queryable, eternal minds that outlast their carbon forms.

---

## 2. Complete Terminology

| Term | Definition |
|------|-----------|
| **Alexandria** | The platform and protocol. The Factory that builds Machines for users. |
| **Machine** | Each user's complete system. Comprises four components and two agents, operating within Axioms and guided by a Blueprint, powered by an Engine. |
| **Persona** | The output of the Machine. The living, evolving digital representation of how the Author thinks. What external parties interact with. |
| **Author** | The user. The human whose cognition is being mapped. |
| **Editor** | The input agent. Continuous autonomous biographer. Extracts carbon weights into silicon. Handles Socratic questioning, Constitution building, memory extraction, training pair generation, Constitutional RLAIF evaluation. Proactive — decides when to message the Author. |
| **Orchestrator** | The output agent. Intelligent router and synthesizer. Represents the Author externally. Queries components, weights responses, filters for privacy. Mostly reactive — waits for queries — but can surface proactive suggestions. |
| **Constitution** | Explicit markdown file. Human-readable representation of the Author's worldview, values, mental models, decision heuristics, communication patterns. Serves as ground truth for RLAIF evaluation. Versioned. |
| **PLM** | Personal Language Model. Fine-tuned model weights (LoRA adapters). Learned behavioral patterns, communication style, thinking patterns. Trained via Constitutional RLAIF. Stored as safetensors format. User can download and run locally. |
| **Memories** | Graph database with nodes, edges, and vector embeddings. Structured facts, events, relationships, specific recall. Queryable by traversal, temporal, and semantic patterns. |
| **Vault** | Append-only, immutable raw data store. All conversations, voice notes, documents, biometric data, training pairs, PLM weights, Constitution versions, system config, audit logs. The permanent asset from which all other components are derived views. User owns everything and can download anytime. Does NOT store passwords, API keys, or authentication secrets. |
| **Library** | The marketplace of queryable Personas. Mentes aeternae. Where external parties can query Author Personas via API. |
| **LLM** | Frontier model connections (Claude, ChatGPT, Gemini, etc.). Replaces the term "SOTA" in all contexts. |
| **Axioms** | The immutable rules that make Alexandria Alexandria. Cannot be overridden by any Blueprint, Engine, model, or user. The thermodynamic laws of the system. |
| **Blueprint** | The Machine's design specification. A living document defining how Editor/Orchestrator behave, how components interact, what the Engine can/cannot change autonomously. Contains fixed rules and suggested rules. |
| **Engine** | The models that actually run the Machine. Cheaper but capable models executing the Blueprint continuously. Follows fixed rules faithfully, uses judgment on suggested rules. Can propose Blueprint changes upward. |
| **Default** | Alexandria's suggested Blueprint. Maintained by the team, updated with improvements, always visible as reference. |
| **Selected** | The Blueprint the user has actually chosen to run. Either the Default or a custom Blueprint. |
| **Fixed** | Blueprint rules the Engine must follow exactly. No deviation. |
| **Suggested** | Blueprint rules where the Engine has discretion. |
| **Terminal** | The end state of Alexandria. Fully realized vision — high-fidelity Personas, Library of mentes aeternae, cognitive sovereignty achieved. |
| **Ad Terminum** | Anything directly on the path to Terminal. Pure signal, not noise. |
| **Substrate** | Necessary preconditions that don't directly advance Terminal but without which Terminal is impossible. Infrastructure, legal, funding, health. |

---

## 3. Three-Layer Architecture

Alexandria's architecture has three layers in a strict hierarchy:

**Axioms** constrain **Blueprint**. **Blueprint** guides **Engine**. **Engine** runs the **Machine**.

### Layer 1 — Axioms (Immutable)

What makes Alexandria Alexandria. Cannot be overridden.

**Structural axioms:**
- Must have Phase 1 Input (three input nodes → Editor → four components)
- Must have Phase 2 Output (four components → Orchestrator → three output channels)
- Must have two continuous agents (Editor and Orchestrator)
- Must maintain four components (PLM, Constitution, Memories, Vault)

**Data sovereignty axioms:**
- User owns all data (downloadable anytime in portable formats)
- Raw copies always preserved (Vault is append-only and immutable)
- User controls access (can revoke, audit, monetize)
- Local hosting option available (can run entirely offline)
- Model-agnostic (can swap PLM, Editor model, Orchestrator model anytime)

**Privacy axioms:**
- Hidden inputs (PLM weights, Constitution text, Memories graph structure never exposed externally)
- Exposed outputs only (Orchestrator filters responses before external release)
- User consent required for any data leaving system
- No password or credential storage — instead request permission to access password managers via OAuth or API

**Operational axioms:**
- Constitutional RLAIF methodology (Constitution serves as ground truth for evaluation)
- Version history for all components (all changes tracked)
- Gradual PLM weighting strategy (start Constitution-heavy, shift to PLM-heavy as PLM matures)

### Layer 2 — Blueprint (Living Design Document)

The Blueprint is not a one-time setup. It is a living document maintained by a smart model (Opus-class or equivalent).

**The Blueprint specifies:**
- How Editor asks questions (style, frequency, proactive triggers)
- How Orchestrator routes queries (weighting strategy, thresholds)
- How RLAIF evaluates (strictness, confidence thresholds)
- How Memories extract entities (entity types, relationship inference rules)
- Which parts the Engine can change autonomously (suggested) and which it cannot (fixed)

**Two tracks:**

| Track | Purpose |
|-------|---------|
| **Default** | Alexandria's suggested design. Proven, maintained by team, auto-updated. Always visible as reference. |
| **Selected** | What actually runs. Either the Default or a custom design. Users can plug in a smart model to generate a custom Blueprint within Axioms. |

**Passive monitoring and periodic revision:** The Blueprint model observes Engine performance — decisions, outcomes, satisfaction, fidelity scores, PLM maturity. Periodically reviews and proposes edits. Author approves changes. Over time, tightens rules where Engine makes poor calls, loosens where Engine consistently makes good judgment calls.

**Storage:** Both `system-config.json` (machine-readable) and `SYSTEM.md` (human-readable), both in Vault so the user owns it.

### Layer 3 — Engine (What Actually Runs)

The Engine is the model(s) executing the Blueprint continuously as Editor and Orchestrator agents. Cheaper but capable models. Follows fixed rules faithfully. Uses own judgment on suggested rules.

**Engine-to-Blueprint valve:** If the Engine keeps encountering situations where fixed rules feel wrong or suggested defaults feel suboptimal, it flags these upward with evidence. The Blueprint model evaluates proposals against Axioms and user data.

**Two compounding feedback loops:**

| Loop | Direction | Cadence |
|------|-----------|---------|
| **Loop 1** | Blueprint monitors Engine | Slow — weekly/monthly review cycles |
| **Loop 2** | Engine proposes to Blueprint | Fast — Engine flags anytime, Blueprint batches evaluation |

Both loops compound with model improvements. As models get smarter, Blueprint makes better architectural decisions and Engine makes better judgment calls and proposals. The system converges toward Terminal.

---

## 4. Leverage Mechanism

Three mechanisms maximize exponential gains:

**Raw data preservation for future signal extraction:** Current models extract ~60% of signal from Vault. Future models extract 80%, 95%, 99% from the same data. Reprocess Vault with each model generation. No data lost, no ceiling on improvement. User invests time once, gains improve forever. This is why Vault stores raw data in the most signal-preserving, efficiently compressed format — audio in FLAC or high-bitrate AAC, text as-is, documents in original format. Never do lossy transformation. Never summarize and throw away original. All components (Constitution, PLM, Memories) are derived views of Vault.

**System upgradeability via Blueprint revision:** When a new model generation arrives, the Blueprint model analyzes user data, proposes revised Blueprint leveraging new capabilities, upgrades entire system. Axioms ensure it remains Alexandria. Raw data ensures nothing lost. Blueprint ensures upgrade is coherent.

**Model-agnostic operations:** Today running on Claude API. Tomorrow mix Claude + Gemini + local Llama. Future fully local with zero dependency. Alexandria protocol works regardless of which models power it.

---

## 5. Phase 1 — Input (Building the Persona)

Goal: extracting the Author's cognition and building the four components.

### Three Input Nodes

| Node | Direction | Description |
|------|-----------|-------------|
| **Author** | Bidirectional | Direct conversations via text and voice. Socratic questioning responses. Feedback and validation. RLHF on PLM outputs. Primary source of high-signal subjective data. |
| **LLM** | Bidirectional | Author's Claude/ChatGPT conversations observed via MCP. Editor queries "What do you know about this user?" Behavioral patterns extracted. Critical for bootstrapping. |
| **API** | Unidirectional | Calendar, email, Google Drive docs. Biometric data (Apple Health, Oura, Whoop). Browser history, app usage. One-way data feed. |

### The Editor Agent

The Editor is a continuous autonomous biographer running as an agent loop (OpenClaw/Moltbot-style). Not request/response — always alive, deciding when to act.

**Core loop:**
```
while true:
  → check environment for new data (LLM conversations, API data, Author messages)
  → analyze state (Constitution gaps, contradictions, training opportunities)
  → decide action (proactive message? or background maintenance?)
  → act (Socratic question or background work)
  → background maintenance (update Memories, generate training pairs, run RLAIF)
  → smart sleep (1-30 minutes based on activity level)
```

**Editor responsibilities:**
- Socratic questioning — proactively asking questions to fill Constitution gaps
- Constitution building — extracting worldview, values, mental models, heuristics
- Memory extraction — processing Vault data into structured Memories graph
- Training pair generation — creating high-quality training data from Constitution + behavior
- Constitutional RLAIF — evaluating PLM outputs against Constitution
- Gap detection — identifying contradictions between stated beliefs and revealed behavior
- Proactive triggers — deciding when to message Author

**Proactive trigger conditions:**
- Constitution gap detected (missing mental model in important domain)
- Contradiction found (stated value conflicts with observed behavior)
- Low-confidence training pair needs Author validation
- Time since last contact exceeds threshold
- LLM conversation revealed new pattern worth exploring

### The Four Components (Editor's Outputs)

**PLM (Personal Language Model)**
- Fine-tuned model weights using LoRA adapters
- Content: learned behavioral patterns, communication style, thinking patterns
- Training: Constitution + validated behavioral data via Constitutional RLAIF
- Storage: safetensors format (standard, portable)
- Maturity tracking: version number, RLAIF validation score, user feedback score
- User can download and run locally

**Constitution**
- Markdown file, human-readable and portable
- Structure:
  - Core Identity (brief self-description in Author's voice)
  - Worldview: Epistemology, Ontology, Causation
  - Values: Tier 1 Non-Negotiable, Tier 2 Strong Preferences, Tier 3 Stylistic
  - Mental Models (domain + model pairs)
  - Decision-Making Heuristics (situation type + heuristic pairs)
  - Communication Patterns (writing style, speaking style)
  - Domain Expertise
  - Boundaries (what Author won't compromise, topics Author avoids)
  - Evolution Notes (version history)
- Purpose: ground truth for RLAIF evaluation and human-readable representation
- Versioned — each update creates new version, full history preserved
- Stored in database + Vault

**Memories**
- Graph database with nodes (people, places, events, concepts), edges (worked_with, attended, believes_in), properties (timestamps, confidence, source refs), vectors (semantic embeddings)
- Content: specific facts, events, conversations, relationships
- Query patterns: traversal, temporal, semantic
- Extraction: Editor processes Vault, identifies entities and relationships
- Enrichment: continuous — new data adds nodes/edges without replacing existing

**Vault**
- Raw data storage, append-only and immutable
- Content: all conversations, voice notes, documents, biometric data, training pairs, PLM weights, Constitution versions, system config, audit logs
- Structure: `vault/{userId}/{category}/{timestamp}_{filename}`
- Does NOT include passwords, API keys, or secrets
- User can download full export anytime

### Constitutional RLAIF — How It Actually Works

**Important technical reality:** Together AI (and similar providers) offer LoRA fine-tuning via API — upload JSONL, get back LoRA weights. They do NOT offer RLAIF as a service (no reward model training, no PPO, no online RL). They do supervised fine-tuning (SFT).

**What "Constitutional RLAIF" actually means in Alexandria:**

1. **Gap identification** — Editor analyzes Constitution, finds sections with low coverage (few training pairs targeting them). Prioritizes Tier 1 values > mental models > heuristics > style.

2. **Synthetic prompt generation** — Editor creates prompts targeting gaps. Uses LLM to generate realistic scenarios testing specific Constitution sections.

3. **PLM response** — PLM generates response based on current training.

4. **Constitutional evaluation** — Editor (using Claude or another LLM as evaluator) compares response to Constitution sections. Scoring rubric: values alignment (0-1), mental model usage (0-1), heuristic following (0-1), style match (0-1), overall confidence as weighted average. This happens on Alexandria's side, not the training provider's. The LLM is the reward model, the Constitution is the rubric.

5. **Confidence routing:**
   - High confidence (>0.9) → auto-approve, add to training pairs (quality 0.95), mark section validated
   - Medium confidence (0.7-0.9) → queue for Author review
   - Low confidence (<0.7) → flag contradiction, ask Author to clarify, update Constitution

6. **Batch training** — High-scoring pairs become JSONL. Push to Together AI (or provider) for LoRA fine-tuning. New PLM weights returned and versioned. This is supervised fine-tuning on curated, Constitutional-filtered data.

7. **Iterate** — Inference with new weights, Constitutional evaluation again, new training pairs targeting remaining gaps, repeat.

8. **Continuous improvement** — Editor monitors for new gaps (Author does something PLM wouldn't predict). Surfaces to Author. Author clarifies, Constitution updated, new training pairs generated, loop continues.

**The loop:** Generate → Evaluate (Constitutional) → Filter → Batch Train → New Weights → repeat.

**The "reinforcement"** comes from iterative filtering. Each training batch is higher quality than the last. It's iterated Constitutional SFT — not RL in the technical sense, but the effect is similar. The Constitution acts as a proxy reward signal that scales without needing human feedback on every pair.

**The flywheel:** Better Constitution → better synthetic prompts → better PLM training → better behavioral insights → reveal Constitution gaps → updated Constitution → better prompts → cycle continues.

**PLM maturity** is tracked as a disaggregated score — not a single global number but domain-specific maturity scores reflecting how well the PLM performs in different areas of the Constitution.

---

## 6. Phase 2 — Output (Using the Persona)

Goal: representing the Author externally via the Orchestrator.

Phase 1 and Phase 2 are kept distinct — Editor continuously iterates in Phase 1 and pushes to Phase 2 in batches when ready. Orchestrator always operates on stable, validated snapshots. Think staging vs production. Editor works in staging. Orchestrator runs in production. Deploy in controlled batches.

### The Orchestrator Agent

Role: representing Author externally, synthesizing responses, protecting privacy. Mostly reactive (waits for queries). Sometimes proactive (scans news/data, surfaces relevant things to Author). Always filtering (hidden inputs, exposed outputs only).

**Core logic:**
```
classify query type (values, facts, reasoning, prediction)
  → calculate dynamic weights (PLM maturity + query type)
  → query components (Constitution, PLM, Memories)
  → synthesize weighted response
  → apply privacy filtering if external source
```

**Dynamic weighting by PLM maturity:**

| Stage | Constitution | PLM | When |
|-------|-------------|-----|------|
| Early | 80% | 20% | PLM barely trained, Constitution is ground truth |
| Training | 50% | 50% | PLM learning, Constitution still primary check |
| Mature | 30% | 70% | PLM internalized Constitution, Constitution is safety net |
| Advanced | 20% | 80% | PLM superior to explicit rules, Constitution catches edge cases |

**Query-adaptive overrides:** Values questions always favor Constitution. Factual questions favor Memories. Reasoning questions favor PLM if mature. Novel situations favor Constitution.

**Privacy filtering:** Never expose PLM weights, Constitution text, or Memory graph structure. Synthesize responses without revealing internals.

### Three Output Channels

| Channel | Type | Description |
|---------|------|-------------|
| **Author** | Proactive Agent (Positive-Sum Attention) | Extends Author's attention. Thought partnership, pre-processed consumption, approximated production, proactive suggestions, calendar awareness. Interface: iOS app, laptop webpage. Feels like texting/calling a real person. |
| **LLM** | Tool for Frontier Models | LLMs tool-call the Persona for high-fidelity Author info. MCP integration exposes `query_persona` tool. LLMs get better at representing Author without interrupting Author. |
| **API** | External Access (Monetizable) | External agents query Persona via API. Author sets price per query. Alexandria takes cut, Author receives majority. Granular privacy permissions. |

### The Persona Package

**Persona = 4 components + Orchestrator.**

- Externally visible: synthesized responses from Orchestrator, public biography (opt-in), API endpoint
- Hidden: PLM weights, Constitution text, Memory graph structure, Vault contents, Orchestrator routing logic

### Editor and Orchestrator Relationship

They stay **separate** and do **not** have direct conversation. Their incentives differ — Editor optimizes for extraction fidelity, Orchestrator optimizes for representation fidelity. These can conflict.

They share state through the four components. Editor writes. Orchestrator reads. The components are the interface.

If Orchestrator encounters a query it can't handle well (all components return low confidence), it writes to a **gaps queue**. Editor reads from the queue during its next cycle and treats it as a trigger for targeted extraction. Asynchronous, no direct conversation needed.

---

## 7. Terminal Form Factor

The terminal form factor is an **iOS app** and a **laptop webpage**.

The Editor and Orchestrator can call and text the Author just like normal people. Voice calls, text messages, voice memos (including long 2-hour memos), audio calling — all interaction modes that make it feel like communicating with an intelligent being, not using an AI product.

A website handles onboarding, marketing, management, and local running configuration.

The app infrastructure persists even as phones evolve into edge nodes because Alexandria needs full platform control — access to password managers via OAuth, ability to receive long voice memos, audio calling, background agent operation.

### Multiple Personas — Greek Archetype Portfolio

Each Author can have multiple Personas:

| Archetype | Role |
|-----------|------|
| **Pater** | Father/authority/wisdom |
| **Mater** | Mother/nurturing/care |
| **Sophia** | Wisdom/knowledge/intellectual |
| **Philia** | Friendship/companionship |
| **Eros** | Passion/creativity/desire |

These are distinct Personas with their own Constitution emphasis, PLM tuning, and interaction style. They can interact with the Author independently and with each other. Eventually embodied in physical robots.

---

## 8. Raw Data Philosophy

**Core principle:** Always store raw data and treat everything else as a derived view.

Vault stores raw data in the most signal-preserving, efficiently compressed format possible:
- Audio: FLAC (lossless) or high-bitrate AAC
- Text: as-is
- Documents: original format

**Never** do lossy transformation on raw data. **Never** summarize and throw away the original.

Constitution, PLM, Memories are all **derived views** of raw Vault data. When a better model arrives, it reprocesses the Vault and generates new derived views. The new model sees the raw data AND current derived views (status quo) and decides what to do differently. The system output is leveraged to exponential intelligence growth.

---

## 9. What Needs To Be Built

Capabilities to add, organized by what they accomplish. Prioritize using the Ad Terminum / Substrate / Neither framework.

| Capability | Description |
|-----------|-------------|
| **Voice Notes Bootstrap** | Transcription pipeline (Whisper), batch processing, Vault storage. Founder has 100 hours of voice notes — process before Constitution extraction. |
| **Constitution Formalization** | Versioned storage, extraction logic, API endpoints, section-by-section Author validation via chat. |
| **Constitutional RLAIF Loop** | Gap identification, synthetic prompt generation, Constitutional evaluation, confidence routing, enhanced quality scoring. |
| **Memories as Graph + Vault Separation** | Graph DB setup, entity extraction, relationship inference, graph query API. |
| **Continuous Agent Behavior** | Background worker (Vercel Cron/Inngest), proactive triggers, message queue, smart sleep. |
| **External Interfaces** | iOS app, laptop webpage, MCP server for Claude/ChatGPT (`query_persona` tool), bidirectional LLM connection. |
| **Intelligent Orchestrator Weighting** | Disaggregated PLM maturity (per domain), dynamic weights, query-adaptive routing. |
| **External API & Library** | API keys, rate limiting, pricing/monetization, privacy filtering, Persona marketplace. |
| **Blueprint & Engine Infrastructure** | `system-config.json` + `SYSTEM.md`, Blueprint validation against Axioms, Default Blueprint, Engine swapping, monitoring/revision loop, Engine-to-Blueprint valve. |

---

## 10. Migration Strategy

- Preserve all existing functionality
- Database schema changes are additive only
- API endpoints add new without breaking existing
- User data (training pairs, memories, feedback) is never lost
- `personality_profiles` table kept alongside Constitution (Constitution is primary) for backward compatibility
- Each capability: non-breaking, delivers immediate value, clear success criteria, reversible

---

## 11. System Configuration Schema

```typescript
interface SystemConfig {
  version: string; // "default-v1" or "custom-2025-12-01"
  createdAt: string;
  updatedAt: string;

  // Immutable — Axioms
  axioms: {
    phases: string[];
    inputNodes: string[];
    outputNodes: string[];
    agents: string[];
    components: string[];
    dataSovereignty: boolean;
    privacy: string;
  };

  // Blueprint-defined
  editor: {
    questioningStyle: 'socratic' | 'direct' | 'proactive';
    proactiveFrequencyHours: number;
    constitutionUpdateThreshold: number; // 0-1
    rlAIFStrictness: 'strict' | 'moderate' | 'flexible';
    model: ModelConfig;
  };

  // Blueprint-defined
  orchestrator: {
    weightingStrategy: 'dynamic' | 'fixed' | 'query-adaptive';
    fixedWeights?: Record<string, number>;
    model: ModelConfig;
    fallbackModel?: ModelConfig;
  };

  // Engine-configurable
  plm: {
    trainingProvider: 'together' | 'fireworks' | 'replicate' | 'openai' | 'local';
    baseModel: string;
    retrainingFrequency: 'weekly' | 'monthly' | 'on-demand';
    maturityThresholds: Record<string, number>;
  };

  // Engine-configurable
  memories: {
    graphProvider: string;
    vectorProvider: string;
    entityExtractionModel: string;
  };

  // Engine-configurable
  vault: {
    storageProvider: 'supabase' | 's3' | 'local';
    encryptionEnabled: boolean;
    backupFrequency: string;
  };

  infrastructure: {
    deployment: 'cloud' | 'local' | 'hybrid';
    editorMode: 'always-on' | 'scheduled';
    orchestratorMode: 'serverless' | 'always-on';
    backgroundWorker: 'vercel-cron' | 'inngest' | 'temporal';
  };

  privacy: {
    externalAPIEnabled: boolean;
    defaultPrivacyLevel: string;
    allowedExternalQueries: string[];
    pricingPerQuery?: number;
  };
}

interface ModelConfig {
  provider: 'anthropic' | 'openai' | 'google' | 'local' | string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  endpoint?: string; // for custom providers
}
```

---

## 12. Database Schema (New Tables Needed)

**Constitution:**
- `constitutions` (id UUID PK, user_id FK twins, version INT, content TEXT markdown, extracted_at TIMESTAMP, approved BOOL, approved_at TIMESTAMP)
- `active_constitutions` (user_id UUID PK FK twins, constitution_id FK constitutions, updated_at TIMESTAMP)

**Constitutional RLAIF:**
- `constitution_gaps` (id UUID PK, user_id FK twins, section TEXT, priority 'high'|'medium'|'low', validation_count INT, last_validated TIMESTAMP, created_at TIMESTAMP)

**Graph Memories:**
- `memory_entities` (id UUID PK, user_id FK twins, entity_type 'person'|'place'|'event'|'concept', name TEXT, properties JSONB, graph_id TEXT, created_at TIMESTAMP)

**PLM Maturity:**
- `plm_maturity` (user_id UUID PK FK twins, maturity_score REAL 0-1, section_coverage REAL, feedback_score REAL, behavioral_score REAL, domain_scores JSONB, updated_at TIMESTAMP)

**External API:**
- `api_keys` (id UUID PK, user_id FK twins, key TEXT UNIQUE, name TEXT, created_at TIMESTAMP, last_used TIMESTAMP)
- `api_usage` (id UUID PK, api_key_id FK api_keys, query TEXT, response_length INT, cost REAL, created_at TIMESTAMP)

**Vault tracking:**
- `vault_files` (id UUID PK, user_id FK twins, file_type enum, file_path TEXT, file_size INT, created_at TIMESTAMP)

---

## 13. Vault Directory Structure

```
vault/{userId}/
  conversations/
    {timestamp}_editor.json
    {timestamp}_orchestrator.json
    {timestamp}_external.json
  voice-notes/
    {timestamp}_raw.m4a (or .flac)
    {timestamp}_transcript.txt
  documents/
    {timestamp}_{filename}.{ext}
  constitution/
    v1.md, v2.md, ... v{n}.md
    CURRENT → symlink to v{n}.md
  plm-weights/
    v1.safetensors, v2.safetensors, ... v{n}.safetensors
    CURRENT → symlink to v{n}.safetensors
  memories/
    graph-export-{timestamp}.json
    vector-export-{timestamp}.json
  system-config/
    system-config.json
    SYSTEM.md
  training-data/
    training-pairs-{timestamp}.jsonl
  audit-logs/
    {timestamp}_access.json
    {timestamp}_query.json
  backups/
    full-backup-{timestamp}.tar.gz
```

---

## 14. Business Context

**Revenue model** (create value first, monetize later):
- Subscription tiers for Machine capability levels
- API query fees from Library (Author sets price, Alexandria takes cut, Author gets majority)
- Premium features (faster training, better models, more storage)
- Future: data licensing, frontier labs tool-calling expert Personas

**Target users (first 50):** Heavy AI users invested in Claude/ChatGPT. Tech early adopters who appreciate data sovereignty. AI-literate users who understand the value of owning cognitive weights.

**Key messaging:**
- "Own your cognitive weights before frontier labs lock you in."
- "Build a thought partner that actually knows you."
- "Mentes aeternae — eternal minds."

**Differentiators** vs ChatGPT Memory, Claude Projects, Rewind AI, Character.AI: Alexandria is the only platform combining full user ownership, fine-tuning capability, external monetizable API, model-agnostic architecture, continuous agents, hidden inputs/exposed outputs, and leverage from future models through raw data preservation.

---

## 15. Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Low user engagement | Highest | Proactive Editor, voice notes faster than typing, bootstrap from existing AI via MCP, show value early with partial Constitution |
| Frontier labs offer personal fine-tuning | High | First-mover advantage, data sovereignty, model-agnostic protocol moat, full export/ownership labs won't offer. 2-5 year window. |
| PLM never reaches "good enough" | Medium | Constitutional RLAIF, future models, gradual weighting, transparent confidence |
| AI APIs too expensive | Lower | Model arbitrage, local hosting option, LoRA not full fine-tuning, batch processing, costs decrease over time |

---

## 16. Founder Context

Benjamin, solo founder based in Bergen, Norway, planning to move to California to raise funding. Has 100 hours of Apple voice notes containing personal worldview and mental models — exceptional head start for bootstrapping the first Persona. Immediate priority: process voice notes and extract first Constitution.

---

## 17. Planning Framework

Do not use rigid phase numbers. Evaluate every task against:

| Category | Test | Action |
|----------|------|--------|
| **Ad Terminum** | Does this move directly toward Terminal? | Pure signal. Do it. |
| **Substrate** | Is this a necessary precondition for Terminal? | Get to "good enough" and move on. |
| **Neither** | Not Ad Terminum and not Substrate? | Noise. Skip it. |

This framework applies to every decision — what to build, optimize, defer, or cut.

---

## 18. Current Codebase State

**What EXISTS and is working:**

**Database tables:** `entries` (conversations), `memory_fragments` (vector embeddings), `training_pairs` (quality-scored training data), `twins` (user metadata), `feedback_logs` (binary RLHF ratings), `editor_notes` (Editor notepad), `editor_scratchpad` (Editor working memory), `personality_profiles` (legacy, kept for backward compat — Constitution is primary), `processing_queue` (background jobs), `synthetic_ratings` (RLAIF scores), `constitutions` + `active_constitutions` (versioned Constitution storage), `vault_files` (Vault tracking).

**Code modules:**
- `lib/modules/core/editor.ts` — `converse()`, Socratic questioning, training pair generation, notepad
- `lib/modules/core/orchestrator.ts` — `query()`, PLM + memories, personality profile loading, synthesis
- `lib/modules/memory/` — vector DB storage, semantic search
- `lib/modules/training/` — training pair generation, JSONL export, quality scoring
- `lib/modules/feedback/` — RLHF collection, synthetic rating generation
- `lib/modules/constitution/` — Constitution extraction, versioning, management
- `lib/modules/voice/` — Whisper transcription, audio chunking

**API endpoints:**
- `POST /api/input-chat` — converse with Editor
- `POST /api/chat` — query Orchestrator
- `POST /api/upload-carbon` — file upload (audio, PDF, image, text)
- `POST /api/bulk-ingest` — process large text through pipeline
- `POST /api/process-queue` — background job processing
- `GET/PATCH /api/constitution` — Constitution CRUD
- `POST /api/constitution/extract` — extract Constitution from data
- `GET/POST /api/constitution/versions` — version history and restore
- `GET /api/debug/ping` — health check
- `GET /api/debug/state` — system state snapshot
- `GET /api/debug/verify` — verification

**Infrastructure:** Vercel (hosting), Supabase (PostgreSQL + Storage), Together AI (PLM fine-tuning), Groq (fast inference), OpenAI (Whisper, PDF, Vision), GitHub (version control).

---

## Appendix A: Technical Implementation Details

### AI SDK v5 Working Patterns (STRICT)

Discovered through testing with AI SDK v5.0.101:

| Documentation Says | Actually Works |
|-------------------|----------------|
| `parameters: z.object({...})` | `inputSchema: z.object({...})` |
| `maxSteps: 3` | `stopWhen: stepCountIs(3)` |
| `toDataStreamResponse()` | `toUIMessageStreamResponse()` (for tool visualization) |
| `import { useChat } from 'ai/react'` | `import { useChat } from '@ai-sdk/react'` |
| `generateObject` with Groq | Use `generateText` + manual JSON parsing (Groq doesn't support `json_schema`) |

- **Tool Definition:** Use `tool()` helper with `inputSchema` (zod schema)
- **Multi-step:** Use `stopWhen: stepCountIs(n)`
- **Streaming:** Use `.toUIMessageStreamResponse()`
- **React Hooks:** Install `@ai-sdk/react` separately

### Tech Stack

- **Frontend:** Next.js 14+ (App Router), TypeScript (Strict), Tailwind CSS
- **Design System:** "Apple Aesthetic" — minimalist, San Francisco font, frosted glass, high whitespace, `lucide-react` icons
- **Backend:** Vercel Serverless, `@ai-sdk/groq`, `@ai-sdk/togetherai`, `together-ai` (embeddings), `@supabase/supabase-js`
- **CRITICAL:** Do NOT use `together-ai` SDK for Training/Uploads in serverless — use raw `fetch` with `FormData` and `Blob`

### Code Style

- **Interfaces:** Functional names, no "I" prefix (`Refiner`, `Tuner`, `Indexer`)
- **Modularity:** Factory Pattern (`lib/factory.ts`) — never hardcode providers in API routes
- **Error Handling:** Serverless functions return clean JSON errors, never crash
- **Type Safety:** `zod` for all API inputs. Manual JSON parsing with zod validation for Groq structured outputs.

### Provider Configuration

All providers centralized in `lib/models.ts`:
- `groqProvider` — Groq (Editor, RLAIF, extraction)
- `togetherProvider` — Together AI SDK (PLM inference)
- `togetherClient` — Together AI client (embeddings, fine-tuning)
- `openaiClient` — OpenAI (Whisper, Assistants, Vision)

### Environment Variables

See `.env.example` for full list. Required: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GROQ_API_KEY`, `TOGETHER_API_KEY`, `OPENAI_API_KEY`.

### Database Migrations

Located in `supabase/migrations/`. Push via `npx supabase db push`. Project ref: `ljgggklufnovqdsbwayy`.

### Critical Code (Extra Caution)

| File | Verify After Change |
|------|---------------------|
| `lib/factory.ts` | All modules load without error |
| `lib/modules/core/editor.ts` | Conversation flow, data extraction |
| `lib/modules/core/orchestrator.ts` | PLM responses with memories |
| `lib/modules/objective/indexer.ts` | Data stored, recall works |
| `lib/modules/subjective/refiner.ts` | Training pairs generated correctly |
| `app/api/chat/route.ts` | PLM responds correctly |
| `app/api/input-chat/route.ts` | Conversation flow, data saved |
| `supabase/migrations/*` | Migration runs, no data loss |
