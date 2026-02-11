ALEXANDRIA — COMPLETE CONTEXT DOCUMENT

This document is the single source of truth for Alexandria. It contains the full vision, architecture, terminology, technical implementation details, and planning framework. Any AI agent reading this should have everything it needs to understand what Alexandria is, how it works, and what to build next.


=== WHAT ALEXANDRIA IS ===

Alexandria is a platform for mapping biological neural networks (carbon weights — human cognition, values, mental models, decision patterns) into user-owned silicon neural networks. The output is a Persona: a high-fidelity digital representation of how a human thinks, composed of four components the user fully owns and controls.

The core thesis: when intelligence becomes abundant and replication costs approach zero, the only defensible assets are scarcity — frontier models, physical infrastructure, live data generation, and permissions. Everyone becomes valuable not for their labor but for their unique data. The question is who owns it, who can monetize it, and who controls access.

The problem: Your attention remains fixed while AI leverage becomes infinite. You can only be in one conversation, make one decision, process one document at a time — zero-sum attention. Worse, frontier AI labs (Anthropic, OpenAI, Google) are building deep context about you through every interaction — your thinking patterns, preferences, mental models — that you don't own and can't extract. You're locked into their ecosystems, feeding their models, with no cognitive sovereignty.

The solution: Alexandria digitizes your cognition into components you own, creating a Persona that operates independently while you maintain complete sovereignty. This enables positive-sum attention — your Persona represents you while you're not present, multiplying your effective attention without consuming your time. Others interact with your Persona and get authentic responses while you don't lose time. Both parties benefit.

Why frontier labs won't build this: Personal fine-tuning breaks their business model. Their revenue comes from API calls — if users download PLM weights and run locally, that's zero API revenue. Their incentive is to keep users on platform and maximize engagement. Strategic misalignment: they aggregate data for foundation models, not personalized fine-tuning. Data sovereignty destroys their lock-in moat. They optimize for engagement, not fidelity. Personal fine-tuning creates too many models to serve profitably. They will build personalized memory and context (RAG-based behavioral adaptation and user preference learning) but won't let you fine-tune and own weights or give you a portable personal model independent of their API. This creates Alexandria's window — building what they can't build without destroying their economics. Timeline: 2-5 years before labs figure out how to offer personal fine-tuning without breaking their business model.

The tagline: mentes aeternae (Latin for "eternal minds"). The Library of Alexandria preserved what humanity's greatest minds wrote. Alexandria the platform preserves how humanity thinks — living, queryable, eternal minds that outlast their carbon forms.


=== COMPLETE TERMINOLOGY ===

Alexandria — The platform and protocol. The Factory that builds Machines for users.

Machine — Each user's complete system. Comprises four components and two agents, operating within Axioms and guided by a Blueprint, powered by an Engine.

Persona — The output of the Machine. The living, evolving digital representation of how the Author thinks. What external parties interact with.

Author — The user. The human whose cognition is being mapped.

Editor — The input agent. Continuous autonomous biographer. Extracts carbon weights into silicon. Handles Socratic questioning, Constitution building, memory extraction, training pair generation, Constitutional RLAIF evaluation. Proactive — decides when to message the Author.

Orchestrator — The output agent. Intelligent router and synthesizer. Represents the Author externally. Queries components, weights responses, filters for privacy. Mostly reactive — waits for queries — but can surface proactive suggestions.

Constitution — Explicit markdown file. Human-readable representation of the Author's worldview, values, mental models, decision heuristics, communication patterns. Serves as ground truth for RLAIF evaluation. Versioned.

PLM (Personal Language Model) — Fine-tuned model weights (LoRA adapters). Learned behavioral patterns, communication style, thinking patterns. Trained via Constitutional RLAIF. Stored as safetensors format. User can download and run locally.

Memories — Graph database with nodes, edges, and vector embeddings. Structured facts, events, relationships, specific recall. Queryable by traversal, temporal, and semantic patterns.

Vault — Append-only, immutable raw data store. All conversations, voice notes, documents, biometric data, training pairs, PLM weights, Constitution versions, system config, audit logs. The permanent asset from which all other components are derived views. User owns everything and can download anytime. Does NOT store passwords, API keys, or authentication secrets.

Library — The marketplace of queryable Personas. Mentes aeternae. Where external parties can query Author Personas via API.

LLM — Frontier model connections (Claude, ChatGPT, Gemini, etc.). Replaces the term "SOTA" in all contexts.

Axioms — The immutable rules that make Alexandria Alexandria. Cannot be overridden by any Blueprint, Engine, model, or user. These are the thermodynamic laws of the system.

Blueprint — The Machine's design specification. A living document that defines how the Editor and Orchestrator behave, how components interact, what the Engine can and cannot change autonomously. Written by a smart model or accepted as Alexandria's default. Passively monitored and periodically revised. Contains both fixed rules (Engine must follow exactly) and suggested rules (Engine has discretion).

Engine — The models that actually run the Machine. Cheaper but capable models executing the Blueprint continuously as Editor and Orchestrator agents. Follows fixed Blueprint rules faithfully, uses judgment on suggested rules. Can propose Blueprint changes upward.

Default — Alexandria's suggested Blueprint. Maintained by the Alexandria team, updated with improvements, always visible as a reference.

Selected — The Blueprint the user has actually chosen to run. Either the Default or a custom Blueprint. The system only runs what's in the Selected column.

Fixed — Blueprint rules the Engine must follow exactly. No deviation.

Suggested — Blueprint rules where the Engine has discretion. Blueprint offers a default approach but Engine can deviate based on context.

Terminal — The end state of Alexandria. Fully realized vision — high-fidelity Personas, Library of mentes aeternae, cognitive sovereignty achieved.

Ad Terminum — Anything directly on the path to Terminal. Pure signal, not noise. Every hour spent here moves toward Terminal in a straight line.

Substrate — Necessary preconditions that don't directly advance Terminal but without which Terminal is impossible. Infrastructure, legal, funding, health — things that need to be at a certain level for Terminal to be possible.


=== THREE-LAYER ARCHITECTURE ===

Alexandria's architecture has three layers in a strict hierarchy: Axioms constrain Blueprint. Blueprint guides Engine. Engine runs the Machine.

LAYER 1 — AXIOMS (Immutable, permanent, what makes Alexandria Alexandria)

Structural axioms: Must have Phase 1 Input (three input nodes flowing to Editor flowing to four components). Must have Phase 2 Output (four components flowing to Orchestrator flowing to three output channels). Must have two continuous agents (Editor and Orchestrator). Must maintain four components (PLM, Constitution, Memories, Vault).

Data sovereignty axioms: User owns all data (downloadable anytime in portable formats). Raw copies always preserved (Vault is append-only and immutable). User controls access (can revoke, audit, monetize). Local hosting option available (can run entirely offline). Model-agnostic (can swap PLM, Editor model, Orchestrator model anytime).

Privacy axioms: Hidden inputs (PLM weights, Constitution text, Memories graph structure never exposed externally). Exposed outputs only (Orchestrator filters responses before external release). User consent required for any data leaving system. No password or credential storage — instead request permission to access password managers when needed via OAuth or API.

Operational axioms: Constitutional RLAIF methodology (Constitution serves as ground truth for evaluation). Version history for all components (all changes tracked). Gradual PLM weighting strategy (start Constitution-heavy, shift to PLM-heavy as PLM matures).

LAYER 2 — BLUEPRINT (Living design document, how the Machine works)

The Blueprint is not a one-time setup. It is a living document maintained by a smart model (Opus-class or equivalent). The Blueprint specifies: how Editor asks questions (style, frequency, proactive triggers), how Orchestrator routes queries (weighting strategy, thresholds), how RLAIF evaluates (strictness, confidence thresholds), how Memories extract entities (entity types, relationship inference rules), which parts of the system the Engine can change autonomously (suggested rules) and which it cannot (fixed rules).

The Blueprint has two tracks:

Default — Alexandria's suggested design. Proven architecture maintained by Alexandria team with automatic updates. Safe, tested, always visible as reference.

Selected — What actually runs. Either the Default or a custom design. Users can accept the Default as their Selected Blueprint, or they can plug in a smart model to generate a custom Blueprint within Axioms that they review, approve, and select.

The Blueprint is passively monitored and periodically revised. The smart Blueprint model observes how the Engine performs — looking at Engine decisions, outcomes, user satisfaction, Constitution fidelity scores, PLM maturity progression. Periodically it reviews and proposes edits. Author approves changes. Over time the Blueprint gets better at specifying what should be fixed vs suggested, tightening rules where the Engine makes poor calls, loosening where the Engine consistently makes good judgment calls.

The Blueprint is stored as both system-config.json (machine-readable) and SYSTEM.md (human-readable), both in Vault so the user owns it.

LAYER 3 — ENGINE (What actually runs, continuously)

The Engine is the model(s) plugged in to execute the Blueprint. Cheaper but still capable models that run continuously as Editor and Orchestrator agents. The Engine follows the Blueprint's fixed rules faithfully and uses its own judgment on suggested rules where the Blueprint grants discretion.

The Engine has a valve to propose Blueprint changes upward. If the Engine keeps encountering situations where fixed rules feel wrong or suggested defaults feel suboptimal, it flags these to the Blueprint layer with evidence. The Blueprint model evaluates proposals against Axioms and user data.

Two feedback loops compound over time:

Loop 1 — Blueprint monitors Engine: Blueprint model observes Engine behavior and outcomes, identifies patterns, proposes refinements. Slow loop — weekly or monthly review cycles.

Loop 2 — Engine proposes to Blueprint: Engine flags friction points upward. Blueprint model evaluates proposals. Fast signal — Engine can flag anytime, Blueprint batches evaluation.

Both loops compound with model improvements. As models get smarter, the Blueprint model makes better architectural decisions and the Engine model makes better judgment calls and better proposals. The system converges toward Terminal: a Machine so well-designed and well-executed that the Persona is indistinguishable from the Author.


=== LEVERAGE MECHANISM ===

The architecture maximizes exponential gains through three mechanisms:

Raw data preservation for future signal extraction: Current models might extract 60% of signal from raw data stored in Vault. Future models extract 80%, then 95%, then 99% from the same data. Reprocess Vault with each model generation to refine Constitution, enhance Memories, retrain PLM. No data is lost. No ceiling on improvement. User invests time once and gains improve forever. This is why the Vault stores raw data in the most signal-preserving, efficiently compressed format possible — audio in compressed lossless or high-bitrate formats, text as-is, documents in original format. Never do lossy transformation on raw data. Never summarize and throw away the original. All components (Constitution, PLM, Memories) are derived views of the Vault. When a better model arrives, it can reprocess the Vault and generate new derived views.

System upgradeability via Blueprint revision: When a new model generation arrives, the Blueprint model can analyze the user's data, propose a revised Blueprint leveraging new capabilities, and upgrade the entire system. The Axioms ensure it remains Alexandria. The raw data ensures nothing is lost. The Blueprint ensures the upgrade is coherent.

Model-agnostic operations for no vendor lock-in: Today running on Claude API. Tomorrow can mix Claude plus Gemini plus local Llama. Future can be fully local with zero dependency. Alexandria protocol still works regardless of which models power it.


=== PHASE 1 — INPUT (Building the Persona) ===

The goal of Phase 1 is extracting the Author's cognition and building the four components.

THREE INPUT NODES:

Author node (bidirectional) — Direct conversations via text and voice. Socratic questioning responses. Feedback and validation on extractions. RLHF on PLM outputs. The primary source of high-signal subjective data.

LLM node (bidirectional) — Author's Claude/ChatGPT conversations observed via MCP. Existing AI context queried by Editor asking "What do you know about this user?" Behavioral patterns extracted from usage. Bidirectional means Editor can query LLMs about the Author, which is critical for bootstrapping.

API node (unidirectional) — Calendar, email, documents from Google Drive etc. Biometric data from Apple Health, Oura, Whoop. Browser history and app usage. One-way data feed.

THE EDITOR AGENT:

The Editor is a continuous autonomous biographer running as an OpenClaw/Moltbot-style agent loop. Not request/response — always alive, deciding when to act.

Core loop: While true → check environment for new data (LLM conversations, API data, Author messages) → analyze state (identify Constitution gaps, find contradictions between stated beliefs and behavior, find training opportunities) → decide action (should I send a proactive message based on gaps, contradictions, time since last contact?) → act (send Socratic question if decided to message, or do background maintenance) → background maintenance (update Memories from new data, generate training pairs, run RLAIF evaluation) → smart sleep (calculate duration 1-30 minutes based on activity level).

Editor responsibilities: Socratic questioning (proactively asking questions to fill Constitution gaps). Constitution building (extracting worldview, values, mental models, heuristics into explicit markdown). Memory extraction (processing raw Vault data into structured Memories graph). Training pair generation (creating high-quality training data from Constitution plus behavior). Constitutional RLAIF (evaluating PLM outputs against Constitution and generating reward signals). Gap detection (identifying contradictions between stated beliefs and revealed behavior). Proactive triggers (deciding when to message Author).

Proactive trigger conditions: Constitution gap detected (missing mental model in an important domain). Contradiction found (stated value conflicts with observed behavior). Low-confidence training pair needs Author validation. Time since last contact exceeds threshold. LLM conversation revealed new pattern worth exploring.

THE FOUR COMPONENTS (Editor's outputs):

PLM (Personal Language Model) — Fine-tuned model weights using LoRA adapters. Content: learned behavioral patterns, communication style, thinking patterns. Training: Constitution plus validated behavioral data via Constitutional RLAIF. Storage: safetensors format (standard, portable). Maturity tracking: version number, RLAIF validation score, user feedback score. User can download and run locally.

Constitution — Markdown file, human-readable and portable. Structure: Core Identity (brief self-description in Author's voice). Worldview section with Epistemology (How I Know Things), Ontology (What Exists), Causation (How Things Work). Values Hierarchical section with Tier 1 Non-Negotiable (core identity), Tier 2 Strong Preferences (important but flexible), Tier 3 Stylistic (nice-to-have). Mental Models section (domain and model pairs). Decision-Making Heuristics section (situation type and heuristic pairs). Communication Patterns section (writing style, speaking style). Domain Expertise section. Boundaries section (what Author won't compromise, topics Author avoids). Evolution Notes section (version history of updates). Purpose: ground truth for RLAIF evaluation and human-readable representation. Versioned — each update creates new version with full history preserved. Stored in database plus Vault.

Memories — Graph database with nodes (entities: people, places, events, concepts), edges (relationships: worked_with, attended, believes_in), properties (timestamps, confidence scores, source references), and vectors (semantic embeddings for similarity search). Content: specific facts, events, conversations, relationships. Query patterns: traversal ("Who did I meet through Sarah?"), temporal ("What happened in Q3 2024?"), semantic ("Conversations about AI regulation"). Extraction: Editor processes Vault data, identifies entities and relationships, stores in graph. Enrichment: continuous — new data adds nodes and edges without replacing existing.

Vault — Raw data storage, append-only and immutable. Content: all conversations (with Editor, with LLMs, with external agents), voice notes (original audio files), documents (PDFs, markdown, images), biometric data (health logs, activity), training pairs (JSONL format), PLM weights (safetensors), Constitution versions (markdown), system config (JSON), audit logs (who accessed what when). Structure: vault/{userId}/{category}/{timestamp}_{filename}. Does NOT include passwords, API keys, or secrets. User can download full export anytime.

CONSTITUTIONAL RLAIF — HOW IT ACTUALLY WORKS:

Important technical reality: Together AI (and similar providers) offer LoRA fine-tuning via API. You upload a JSONL file of training pairs, they run the fine-tuning job, you get back LoRA weights. They do not offer RLAIF as a service — no reward model training, no PPO, no online RL. They do supervised fine-tuning (SFT).

What "Constitutional RLAIF" actually means in Alexandria's architecture:

Step 1 — Gap identification: Editor analyzes Constitution. Finds sections with low coverage (few training pairs targeting them). Prioritizes Tier 1 values over mental models over heuristics over style.

Step 2 — Synthetic prompt generation: Editor creates prompts specifically targeting gaps. Uses an LLM to generate realistic scenarios that would test specific Constitution sections.

Step 3 — PLM response: PLM generates response based on current training.

Step 4 — Constitutional evaluation: Editor (using Claude or another LLM as evaluator) compares response to Constitution sections. Scoring rubric: values alignment (0-1), mental model usage (0-1), heuristic following (0-1), style match (0-1), overall confidence as weighted average. This happens on Alexandria's side, not the training provider's side. The LLM is the reward model, the Constitution is the rubric.

Step 5 — Confidence routing: High confidence (above 0.9) → auto-approve, add to training pairs with quality score 0.95, mark Constitution section as validated. Medium confidence (0.7-0.9) → queue for Author review. Low confidence (below 0.7) → flag contradiction, ask Author to clarify, update Constitution if needed.

Step 6 — Batch training: High-scoring pairs become training data JSONL. Push batch to Together AI (or user's selected provider) for LoRA fine-tuning. New PLM weights returned and versioned. This is supervised fine-tuning on curated, Constitutional-filtered data.

Step 7 — Iterate: Inference with new weights, run Constitutional evaluation again, generate new training pairs targeting remaining gaps, repeat. Each cycle produces higher quality training data because the Constitution-based evaluation improves and the PLM gets better at generating aligned responses.

Step 8 — Continuous improvement: Editor monitors for new gaps (Author does something PLM wouldn't predict). Surfaces to Author: "I noticed you did X but Constitution doesn't cover this — should we add it?" Author clarifies, Constitution updated, new training pairs generated targeting updated section, loop continues.

The loop is: Generate → Evaluate (Constitutional) → Filter → Batch Train → New Weights → Generate → Evaluate → Filter → Batch Train → ...

The "reinforcement" comes from iterative filtering. Each training batch is higher quality than the last. It's iterated Constitutional SFT — not RL in the technical sense, but the effect is similar. The Constitution acts as a proxy reward signal that scales without needing human feedback on every pair.

The flywheel: Better Constitution → better synthetic prompts → better PLM training → better behavioral insights → reveal Constitution gaps → updated Constitution → better prompts → cycle continues.

PLM maturity is tracked as a disaggregated score — not a single global number but domain-specific maturity scores reflecting how well the PLM performs in different areas of the Constitution.


=== PHASE 2 — OUTPUT (Using the Persona) ===

The goal of Phase 2 is representing the Author externally via the Orchestrator. Phase 1 and Phase 2 are kept distinct — Editor continuously iterates in Phase 1 and pushes to Phase 2 in batches when ready, so Orchestrator always operates on stable, validated snapshots. Think staging vs production. Editor works in staging. Orchestrator runs in production. Deploy from staging to production in controlled batches.

THE ORCHESTRATOR AGENT:

Role: representing Author externally, synthesizing responses, protecting privacy. Mostly reactive (waits for queries). Sometimes proactive (scans news/data, surfaces relevant things to Author). Always filtering (hidden inputs, exposed outputs only).

Core logic: Classify query type (values, facts, reasoning, prediction) → calculate dynamic weights based on PLM maturity plus query type → query components (Constitution, PLM, Memories) → synthesize weighted response → apply privacy filtering if source is external.

Dynamic weighting depends on PLM maturity:

Early stage (low maturity): Constitution 80%, PLM 20%. PLM barely trained, Constitution is ground truth.
Training stage (medium maturity): Constitution 50%, PLM 50%. PLM learning, Constitution still primary check.
Mature stage (high maturity): Constitution 30%, PLM 70%. PLM internalized Constitution, Constitution is safety net.
Advanced stage (very high maturity): Constitution 20%, PLM 80%. PLM superior to explicit rules, Constitution catches edge cases.

Query-adaptive overrides: Values questions always favor Constitution regardless of PLM maturity. Factual questions favor Memories. Reasoning questions favor PLM if mature. Novel situations favor Constitution.

Privacy filtering: Never expose PLM weights, Constitution text, or Memory graph structure. Synthesize responses without revealing internals.

THREE OUTPUT CHANNELS:

Author output (Proactive Agent — Positive-Sum Attention): Extends Author's attention. Thought partnership ("Should I take this meeting?"). Pre-processed consumption (screens articles/emails). Approximated production ("Draft email in my style"). Proactive suggestions. Calendar awareness. Interface: iOS app, laptop webpage, Telegram. Feels like texting/calling a real person.

LLM output (Tool for Frontier Models): LLMs like Claude or ChatGPT tool-call the Persona for high-fidelity Author info. Instead of asking Author (which interrupts flow), the LLM queries the Persona and gets authentic answers. MCP integration exposes query_persona tool. LLMs get better at representing Author without interrupting Author.

API output (External Access — Monetizable): External agents query Persona via API. Use cases: other users' Personas querying each other, research surveys across expert Personas, frontier labs tool-calling expert Personas for domain knowledge, market research, biography generation. Author sets price per query. Alexandria takes percentage cut. Author receives majority. Author configures granular privacy permissions for what external agents can access.

THE PERSONA PACKAGE:

Persona = 4 components + Orchestrator. Externally visible: synthesized responses from Orchestrator, public biography if Author opts in, API endpoint for queries. Hidden: PLM weights, Constitution text, Memory graph structure, Vault contents, Orchestrator routing logic.

EDITOR AND ORCHESTRATOR RELATIONSHIP:

They stay separate and do not have direct conversation. Their incentives differ — Editor optimizes for extraction fidelity (accurate picture of how Author thinks), Orchestrator optimizes for representation fidelity (accurate responses to queries). These can conflict.

They share state through the four components. Editor writes to components. Orchestrator reads from components. The components are the interface between them.

If Orchestrator encounters a query it can't handle well (all components return low confidence), it writes to a gaps queue. Editor reads from the queue during its next cycle and treats it as a trigger for targeted extraction. Asynchronous, no direct conversation needed.


=== TERMINAL FORM FACTOR ===

The terminal form factor for Alexandria is an iOS app and a laptop webpage.

The Editor and Orchestrator can call and text the Author just like normal people. The Author chats back and forth and it feels like speaking to a real human editor or a real twin version of themselves. This means voice calls, text messages, voice memos (including long 2-hour voice memos), audio calling — all the interaction modes that make it feel like communicating with an intelligent being, not using an AI product.

Authors can have access to multiple different Personas following the Greek archetype portfolio: pater, mater, sophia, philia, eros. These Personas can also chat with the Author and with each other. Eventually they can be embodied in physical robots.

A website handles onboarding, marketing, management, and local running configuration.

The app infrastructure persists even as phones evolve into edge nodes because Alexandria needs full platform control — access to password manager apps via OAuth, ability to receive long voice memos, audio calling capabilities, background agent operation.


=== MULTIPLE PERSONAS AND ARCHETYPE PORTFOLIO ===

Each Author can have multiple Personas, each representing different aspects or archetypes. The Greek archetype portfolio:

Pater — Father/authority/wisdom archetype.
Mater — Mother/nurturing/care archetype.
Sophia — Wisdom/knowledge/intellectual archetype.
Philia — Friendship/companionship archetype.
Eros — Passion/creativity/desire archetype.

These are distinct Personas that can each have their own Constitution emphasis, PLM tuning, and interaction style. They can interact with the Author independently and can interact with each other. The optimal portfolio of Personas gives the Author a complete support system across different dimensions of life and thinking.


=== RAW DATA PHILOSOPHY ===

A core principle throughout Alexandria: always store raw data and treat everything else as a derived view.

The Vault stores raw data in the most signal-preserving, efficiently compressed format possible. Audio in compressed lossless format (FLAC) or high-bitrate AAC. Text as-is. Documents in original format. Never do lossy transformation on raw data. Never summarize and throw away the original.

Constitution, PLM, Memories are all derived views of raw Vault data. When a better model arrives, it reprocesses the Vault and generates new derived views. The new model can see the raw data AND the current derived views (the status quo of how the data is being used, what signal has supposedly been extracted) and can then decide to do things differently. This means the overall output of the entire system is leveraged to the exponential intelligence growth of models.

Raw data should be stored in the most efficient way that retains all potential signal while being as scalably stored as possible.


=== CURRENT CODEBASE STATE ===

What EXISTS and is working:

Database schema: entries table (user conversations), memory_fragments table (vector embeddings for semantic search), training_pairs table (generated training data with quality scores), twins table (user metadata), feedback_logs table (RLHF binary ratings), editor_notes table (Editor's notepad tracking questions and gaps), editor_scratchpad table (Editor's working memory), personality_profiles table with constitutional_rules field (legacy — keep alongside Constitution for backward compatibility, Constitution is primary), processing_queue table (background job queue), synthetic_ratings table (RLAIF evaluation scores).

Code modules: lib/modules/core/editor.ts (converse() method for reactive chat, Socratic questioning, training pair generation, notepad management). lib/modules/core/orchestrator.ts (query() method, PLM plus memories querying, personality profile loading, response synthesis). lib/modules/memory/ (vector DB storage, semantic search). lib/modules/training/ (training pair generation, JSONL export for Together AI, quality scoring). lib/modules/feedback/ (RLHF feedback collection, synthetic rating generation).

API endpoints: /api/input-chat POST (converse with Editor), /api/chat POST (query Orchestrator), /api/debug/ping GET (health check), /api/debug/state GET (system state), /api/debug/verify GET (verification).

Infrastructure: Vercel for hosting, Supabase for PostgreSQL and Storage, Together AI for PLM fine-tuning via LoRA, Groq for fast inference for Editor and Orchestrator, GitHub for version control.


=== WHAT NEEDS TO BE BUILT ===

These are the capabilities that need to be added, organized by what they accomplish rather than rigid phase numbers. Prioritize by asking: is this Ad Terminum (direct path to Terminal) or Substrate (necessary precondition)?

Voice Notes Bootstrap: Transcription pipeline (Whisper API), batch processing, voice note storage in Vault, bulk conversation ingestion. The founder has 100 hours of Apple voice notes containing personal worldview and mental models — exceptional head start that should be processed before Constitution extraction.

Constitution Formalization: constitutions table for versioned storage, active_constitutions table as pointer to current version, Constitution extraction logic in Editor, Constitution API endpoints, Vault integration saving Constitution markdown, section-by-section validation flow where Editor walks Author through approval via chat ("Here's your Core Identity section. Does this feel right?" — Author says yes or refines conversationally).

Constitutional RLAIF Loop: Gap identification (which Constitution sections lack validation), synthetic prompt generation targeting specific gaps, Constitutional evaluation scoring PLM against Constitution, confidence routing (auto-approve vs Author review), enhanced training pair quality scoring.

Memories as Graph Plus Vault Separation: Graph database setup, entity extraction from Vault, relationship inference, graph query API, Vault directory structure separate from Memories.

Continuous Agent Behavior: Background worker (Vercel Cron or Inngest), proactive trigger detection, message queue for Editor, smart sleep logic adjusting polling frequency.

External Interfaces: iOS app, laptop webpage, Telegram bot integration, MCP server for Claude/ChatGPT (exposing query_persona tool), bidirectional LLM connection (Editor queries frontier models about Author).

Intelligent Orchestrator Weighting: Disaggregated PLM maturity tracking (per domain, not single global score), dynamic weight calculation, query-adaptive routing.

External API and Library: API key generation, rate limiting, usage tracking, pricing/monetization, privacy filtering, marketplace of queryable Personas.

Blueprint and Engine Infrastructure: Blueprint specification format (system-config.json plus SYSTEM.md), Blueprint validation against Axioms, Default Blueprint maintained by Alexandria, Engine model swapping, Blueprint monitoring and revision loop, Engine-to-Blueprint proposal valve.


=== MIGRATION STRATEGY ===

Preserve all existing functionality. Database schema changes are additive only. API endpoints add new without breaking existing. User data (training pairs, memories, feedback) is never lost. The personality_profiles table is kept alongside Constitution with Constitution as primary for backward compatibility.

Each capability built should be non-breaking (builds on previous work), deliver immediate value, have clear success criteria, and be reversible (can rollback if issues).


=== SYSTEM CONFIGURATION SCHEMA ===

TypeScript interface SystemConfig:
- version: string (e.g. "default-v1" or "custom-2025-12-01")
- createdAt, updatedAt: string
- axioms: object containing phases array, inputNodes array, outputNodes array, agents array, components array, dataSovereignty boolean, privacy string — these are immutable
- editor: object with questioningStyle ('socratic' | 'direct' | 'proactive'), proactiveFrequencyHours number, constitutionUpdateThreshold number (0-1), rlAIFStrictness ('strict' | 'moderate' | 'flexible'), model ModelConfig — these are Blueprint-defined
- orchestrator: object with weightingStrategy ('dynamic' | 'fixed' | 'query-adaptive'), optional fixedWeights, model ModelConfig, optional fallbackModel — Blueprint-defined
- plm: object with trainingProvider ('together' | 'fireworks' | 'replicate' | 'openai' | 'local'), baseModel string, retrainingFrequency ('weekly' | 'monthly' | 'on-demand'), maturityThresholds — Engine-configurable
- memories: object with graphProvider, vectorProvider, entityExtractionModel — Engine-configurable
- vault: object with storageProvider ('supabase' | 's3' | 'local'), encryptionEnabled boolean, backupFrequency — Engine-configurable
- infrastructure: object with deployment ('cloud' | 'local' | 'hybrid'), editorMode ('always-on' | 'scheduled'), orchestratorMode ('serverless' | 'always-on'), backgroundWorker ('vercel-cron' | 'inngest' | 'temporal')
- privacy: object with externalAPIEnabled boolean, defaultPrivacyLevel, allowedExternalQueries, optional pricingPerQuery

ModelConfig interface: provider ('anthropic' | 'openai' | 'google' | 'local' | string), model string, optional temperature, optional maxTokens, optional endpoint for custom providers.


=== DATABASE SCHEMA (NEW TABLES NEEDED) ===

For Constitution: constitutions table (id UUID PK, user_id UUID FK twins, version INTEGER, content TEXT markdown, extracted_at TIMESTAMP, approved BOOLEAN, approved_at TIMESTAMP). active_constitutions table (user_id UUID PK FK twins, constitution_id UUID FK constitutions, updated_at TIMESTAMP).

For Constitutional RLAIF: constitution_gaps table (id UUID PK, user_id UUID FK twins, section TEXT, priority 'high'|'medium'|'low', validation_count INTEGER, last_validated TIMESTAMP, created_at TIMESTAMP).

For Graph Memories: memory_entities table (id UUID PK, user_id UUID FK twins, entity_type 'person'|'place'|'event'|'concept', name TEXT, properties JSONB, graph_id TEXT, created_at TIMESTAMP).

For PLM Maturity: plm_maturity table (user_id UUID PK FK twins, maturity_score REAL 0-1, section_coverage REAL, feedback_score REAL, behavioral_score REAL, domain_scores JSONB for disaggregated per-domain maturity, updated_at TIMESTAMP).

For External API: api_keys table (id UUID PK, user_id UUID FK twins, key TEXT UNIQUE, name TEXT, created_at TIMESTAMP, last_used TIMESTAMP). api_usage table (id UUID PK, api_key_id UUID FK api_keys, query TEXT, response_length INTEGER, cost REAL, created_at TIMESTAMP).

For Vault tracking: vault_files table (id UUID PK, user_id UUID FK twins, file_type 'conversation'|'voice-note'|'document'|'constitution'|'plm-weights', file_path TEXT, file_size INTEGER, created_at TIMESTAMP).


=== VAULT DIRECTORY STRUCTURE ===

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
    v1.md
    v2.md
    v{n}.md
    CURRENT → symlink to v{n}.md
  plm-weights/
    v1.safetensors
    v2.safetensors
    v{n}.safetensors
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


=== BUSINESS CONTEXT ===

Revenue model (not primary focus — create value first, monetize later): Subscription tiers for different levels of Machine capability. API query fees from Library where external agents pay per query to Author Personas (Author sets price, Alexandria takes cut, Author receives majority). Premium features (faster training, better models, increased storage). Future data licensing (aggregate anonymized insights, frontier labs tool-calling expert Personas).

Target users Phase 1 (first 50): Heavy AI users already invested in Claude/ChatGPT. Tech early adopters who appreciate data sovereignty. AI-literate users who understand the value of owning their cognitive weights.

Key messaging: "Own your cognitive weights before frontier labs lock you in." "Build a thought partner that actually knows you." "Mentes aeternae — eternal minds."

Differentiators vs ChatGPT Memory, Claude Projects, Rewind AI, Character.AI: Alexandria is the only platform combining full user ownership, fine-tuning capability, external monetizable API, model-agnostic architecture, continuous agents, hidden inputs/exposed outputs, and leverage from future models through raw data preservation.


=== RISKS ===

Biggest risk: Low user engagement (users don't invest enough time to build high-fidelity Persona). Mitigation: proactive Editor makes it easy, voice notes are faster than typing, bootstrap from existing AI usage via MCP, show value early with partial Constitution after limited input.

Frontier labs risk: Labs eventually offer personal fine-tuning (2-5 year window). Mitigation: first-mover advantage, data sovereignty positioning, model-agnostic protocol moat, full export/ownership that labs won't offer.

Fidelity risk: PLM never reaches "good enough." Mitigation: Constitutional RLAIF ensures alignment, leverage future models, gradual weighting, transparent confidence scores.

Cost risk: AI APIs too expensive. Mitigation: model arbitrage (cheap models where possible), local hosting option, LoRA not full fine-tuning, batch processing, models get cheaper over time. Note: cost optimization is not the primary focus — value creation comes first.


=== FOUNDER CONTEXT ===

The founder (Benjamin) is a solo founder based in Bergen, Norway, planning to move to California to raise funding. He has 100 hours of Apple voice notes containing personal worldview and mental models — an exceptional head start for bootstrapping the first Persona. The existing codebase has working Editor with Socratic questioning, working Orchestrator, working training pair generation, working RLHF feedback loop, and working RLAIF synthetic feedback generation. The immediate priority is processing the voice notes and extracting the first Constitution.


=== PLANNING FRAMEWORK ===

Do not use rigid phase numbers. Instead, evaluate every task against:

Terminal — Does this move directly toward the end state? If yes, it's Ad Terminum — pure signal, do it.

Substrate — Is this a necessary precondition that needs to be at a certain level for Terminal to be possible? If yes, get it to "good enough" and move on.

Neither — If it's neither Ad Terminum nor Substrate, it's noise. Skip it.

This framework applies to every decision — what to build next, what to optimize, what to defer, what to cut.
