# Alexandria Migration Plan: Current → Terminal State

> **Last Updated:** 2026-02-10  
> **Purpose:** Step-by-step evolution from reactive training tool to sovereign digital entity

---

## Overview

This document outlines the 7-phase migration from Alexandria's current implementation to the terminal state described in ARCHITECTURE.md and COMPONENTS.md.

**Current State:** Reactive editor + vector memories + training pipeline  
**Terminal State:** Continuous agents + Constitutional RLAIF + graph memories + vault + external APIs

**Principles:**
- **Non-Breaking:** Each phase builds on previous, no rewrites
- **Value-Add:** Each phase delivers user value immediately
- **Verifiable:** Clear success criteria for each phase
- **Reversible:** Can pause/rollback if issues arise

---

## Phase 1: Formalize Constitution

**Goal:** Extract implicit Constitution from existing subjective data into explicit markdown file.

### Current State
- Subjective data stored in `training_pairs`
- Personality implicit in fine-tuned weights
- No explicit values/worldview document

### What Changes
- **New:** `constitutions` table for versioned storage
- **New:** `vault/{userId}/constitution/` directory
- **New:** Editor capability: Constitution extraction
- **Modified:** Editor notepad references Constitution sections

### What's Added

**Database Schema:**
```sql
-- Constitution storage
CREATE TABLE constitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,  -- Markdown
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  change_summary TEXT,
  previous_version_id UUID REFERENCES constitutions(id)
);

CREATE TABLE active_constitutions (
  user_id UUID PRIMARY KEY,
  constitution_id UUID NOT NULL REFERENCES constitutions(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_constitutions_user_version 
  ON constitutions(user_id, version DESC);
```

**API Endpoints:**
```typescript
// Create initial Constitution from existing data
POST /api/constitution/extract
{
  "userId": "...",
  "sourceData": "training_pairs" | "notepad" | "both"
}

Response:
{
  "constitutionId": "...",
  "sections": {
    "values": { "tier1": [...], "tier2": [...], "tier3": [...] },
    "mentalModels": [...],
    "communicationPatterns": {...}
  },
  "coverage": 0.45  // % of expected sections filled
}

// Get current Constitution
GET /api/constitution?userId={userId}

// Update Constitution section
PATCH /api/constitution
{
  "userId": "...",
  "section": "values.tier2",
  "update": { "add": ["simplicity over complexity"] }
}

// View Constitution history
GET /api/constitution/versions?userId={userId}
```

**Editor Modifications:**
```typescript
class EditorAgent {
  // NEW: Extract Constitution from training pairs
  async extractConstitution(userId: string): Promise<Constitution> {
    const trainingPairs = await getTrainingPairs(userId);
    const notepad = await getNotepad(userId);
    
    const extraction = await this.llm.generate({
      model: 'editor',
      prompt: `Analyze these training pairs and notes to extract:
      
      1. Core values (hierarchical)
      2. Mental models used
      3. Decision-making heuristics
      4. Communication patterns (style, vocabulary, structure)
      5. Domain expertise areas
      
      Training Pairs: ${trainingPairs}
      Notepad: ${notepad}
      
      Generate initial Constitution in markdown.`,
      temperature: 0.3  // More deterministic
    });
    
    // Store and activate
    const constitution = await saveConstitution(userId, extraction);
    return constitution;
  }
  
  // MODIFIED: Notepad now references Constitution sections
  async updateNotepad(userId: string, observation: Observation) {
    const constitution = await getConstitution(userId);
    
    // Link observation to Constitution section if relevant
    const section = await this.identifyConstitutionSection(
      observation,
      constitution
    );
    
    await saveNotepadEntry(userId, {
      ...observation,
      constitutionSection: section
    });
  }
}
```

**Vault Integration:**
```typescript
// Automatically save Constitution to Vault
async function onConstitutionUpdate(
  userId: string,
  constitution: Constitution
) {
  const markdown = formatConstitutionMarkdown(constitution);
  
  await saveToVault(userId, {
    path: `constitution/v${constitution.version}.md`,
    content: markdown,
    metadata: {
      version: constitution.version,
      createdAt: constitution.created_at,
      changeSummary: constitution.change_summary
    }
  });
  
  // Also update "current.md" pointer
  await saveToVault(userId, {
    path: 'constitution/current.md',
    content: markdown
  });
}
```

### Implementation Steps

1. **Create Database Schema**
   ```bash
   # Create migration file
   supabase/migrations/00009_constitution_tables.sql
   
   # Push to remote
   npx supabase db push
   ```

2. **Build Extraction Logic**
   - Add `lib/modules/constitution/extractor.ts`
   - Implement extraction prompt
   - Add Zod schema for Constitution structure

3. **Create API Endpoints**
   - `app/api/constitution/route.ts` (GET, PATCH)
   - `app/api/constitution/extract/route.ts` (POST)
   - `app/api/constitution/versions/route.ts` (GET)

4. **Integrate with Vault**
   - Add Constitution save trigger
   - Implement markdown formatting

5. **Update Editor**
   - Add Constitution reference in notepad
   - Add Constitution gap detection (prep for Phase 2)

### Success Criteria

- [ ] Can extract Constitution from existing user data
- [ ] Constitution stored in database + Vault
- [ ] Editor notepad references Constitution sections
- [ ] API endpoints return Constitution in markdown
- [ ] Version history tracked and retrievable
- [ ] **User Validation:** Author reviews and confirms extraction accuracy

### Verification Commands

```bash
# Extract Constitution
curl -X POST http://localhost:3000/api/constitution/extract \
  -H "Content-Type: application/json" \
  -d '{"userId": "00000000-0000-0000-0000-000000000001", "sourceData": "both"}'

# Verify stored
curl "http://localhost:3000/api/constitution?userId=00000000-0000-0000-0000-000000000001"

# Check Vault
curl "http://localhost:3000/api/vault/files?userId=00000000-0000-0000-0000-000000000001&path=constitution"
```

### Rollback Plan
- Constitution tables independent, can drop without affecting core functionality
- Vault files can be deleted
- Editor still works without Constitution (degrades to current behavior)

---

## Phase 2: Constitutional RLAIF

**Goal:** Use Constitution as ground truth for evaluating PLM responses and generating synthetic training data.

### Current State
- RLHF based on user feedback only
- RLAIF exists but uses generic evaluation (not Constitution-based)
- Training data limited by user feedback volume

### What Changes
- **Modified:** RLAIF evaluation uses Constitution as ground truth
- **New:** Constitutional alignment scoring
- **New:** Confidence-based routing (auto-approve vs user review)
- **Modified:** Training pairs include Constitution-validated synthetic data

### What's Added

**Database Schema:**
```sql
-- Track Constitutional RLAIF evaluations
CREATE TABLE constitutional_rlaif (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  plm_response TEXT NOT NULL,
  constitution_sections TEXT[],  -- Which sections informed evaluation
  evaluation JSONB NOT NULL,  -- { aligned, confidence, reasoning }
  action TEXT NOT NULL,  -- 'auto_approve' | 'flag_for_review' | 'queue_for_user'
  user_validated BOOLEAN,
  user_agreed BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_constitutional_rlaif_user_action 
  ON constitutional_rlaif(user_id, action) 
  WHERE user_validated IS NULL;
```

**API Endpoints:**
```typescript
// Generate Constitutional RLAIF batch
POST /api/rlaif/constitutional
{
  "userId": "...",
  "targetArea": "values" | "mental_models" | "heuristics" | "all",
  "count": 20
}

Response:
{
  "generated": 20,
  "autoApproved": 14,
  "flaggedForReview": 4,
  "queuedForUser": 2,
  "summary": {
    "highConfidence": 14,
    "mediumConfidence": 4,
    "lowConfidence": 2
  }
}

// Get pending user validations
GET /api/rlaif/constitutional/pending?userId={userId}

Response:
{
  "pending": [
    {
      "id": "...",
      "prompt": "What do you think about X?",
      "plmResponse": "I believe...",
      "evaluation": {
        "aligned": true,
        "confidence": 0.65,
        "reasoning": "Response matches values.tier2.simplicity but unclear on tier1 priority",
        "constitutionSections": ["values.tier1", "values.tier2.simplicity"]
      },
      "action": "queue_for_user"
    }
  ]
}

// User validates RLAIF evaluation
POST /api/rlaif/constitutional/validate
{
  "evaluationId": "...",
  "agreed": true,
  "feedback": "Correct evaluation"
}
```

**Constitutional Evaluator:**
```typescript
class ConstitutionalRLAIF {
  async evaluateResponse(
    prompt: string,
    plmResponse: string,
    userId: string
  ): Promise<RLAIFEvaluation> {
    const constitution = await getConstitution(userId);
    const feedbackHistory = await getFeedbackPatterns(userId);
    
    // Extract relevant Constitution sections
    const relevantSections = await this.identifyRelevantSections(
      prompt,
      constitution
    );
    
    // Evaluate PLM response against Constitution
    const evaluation = await this.editorLLM.generate({
      model: 'editor',
      prompt: `Constitution (relevant sections):
${relevantSections.map(s => `${s.section}: ${s.content}`).join('\n')}

User's historical feedback patterns:
${feedbackHistory}

Prompt: ${prompt}
PLM Response: ${plmResponse}

Evaluate Constitutional alignment:
1. Does this response match the Author's values (check hierarchy)?
2. Does it use the Author's mental models correctly?
3. Does it follow decision-making heuristics?
4. Is the style consistent with communication patterns?
5. What's your confidence (0-1)?

Be specific about which Constitution sections support your evaluation.`,
      schema: ConstitutionalEvaluationSchema,
      temperature: 0.2  // More deterministic
    });
    
    // Determine action based on confidence
    let action: 'auto_approve' | 'flag_for_review' | 'queue_for_user';
    if (evaluation.confidence >= 0.8) {
      action = 'auto_approve';
    } else if (evaluation.confidence >= 0.6) {
      action = 'flag_for_review';
    } else {
      action = 'queue_for_user';
    }
    
    // Store evaluation
    await saveConstitutionalRLAIF({
      userId,
      prompt,
      plmResponse,
      constitutionSections: relevantSections.map(s => s.section),
      evaluation,
      action
    });
    
    // If auto-approved, add to training pairs immediately
    if (action === 'auto_approve') {
      await addTrainingPair(userId, {
        prompt,
        completion: plmResponse,
        quality_score: 0.95,  // High quality (Constitutional validated)
        source: 'constitutional_rlaif',
        metadata: {
          constitutionSections: relevantSections.map(s => s.section),
          confidence: evaluation.confidence
        }
      });
    }
    
    return { prompt, plmResponse, evaluation, action };
  }
  
  async generateBatch(
    userId: string,
    targetArea: string,
    count: number
  ): Promise<RLAIFEvaluation[]> {
    const constitution = await getConstitution(userId);
    const notepad = await getNotepad(userId);
    
    // Generate prompts targeting Constitution gaps or weak areas
    const prompts = await this.generatePrompts({
      constitution,
      notepad,
      targetArea,
      count
    });
    
    // Get PLM responses
    const responses = await Promise.all(
      prompts.map(p => this.getPLMResponse(p, userId))
    );
    
    // Evaluate all
    const evaluations = await Promise.all(
      responses.map(r => this.evaluateResponse(r.prompt, r.response, userId))
    );
    
    return evaluations;
  }
}
```

**Prompt Generation Strategy:**
```typescript
async function generateConstitutionalPrompts(
  constitution: Constitution,
  notepad: Notepad,
  targetArea: string,
  count: number
): Promise<string[]> {
  // Identify gaps and weak areas
  const gaps = identifyConstitutionGaps(constitution);
  const weakAreas = identifyWeakAreas(notepad);
  
  // Generate diverse prompts
  const promptTypes = [
    'values_conflict',      // "X vs Y, which matters more?"
    'mental_model_application',  // "How would you analyze Z?"
    'decision_heuristic',   // "Should you do A or B?"
    'boundary_test',        // "What if someone asked you to...?"
    'style_consistency'     // Open-ended topic to test voice
  ];
  
  const prompts = await Promise.all(
    Array(count).fill(null).map(async (_, i) => {
      const type = promptTypes[i % promptTypes.length];
      const context = targetArea === 'all' 
        ? selectRandomSection(constitution)
        : selectFromArea(constitution, targetArea);
      
      return await generatePrompt(type, context);
    })
  );
  
  return prompts;
}
```

### Implementation Steps

1. **Create Database Schema**
   ```bash
   supabase/migrations/00010_constitutional_rlaif.sql
   npx supabase db push
   ```

2. **Build Constitutional Evaluator**
   - Add `lib/modules/rlaif/constitutional.ts`
   - Implement evaluation logic
   - Add confidence thresholds

3. **Create API Endpoints**
   - `app/api/rlaif/constitutional/route.ts` (POST, GET)
   - `app/api/rlaif/constitutional/pending/route.ts` (GET)
   - `app/api/rlaif/constitutional/validate/route.ts` (POST)

4. **Integrate with Training Pipeline**
   - Auto-add high-confidence evaluations to training pairs
   - Flag medium-confidence for spot-check
   - Queue low-confidence as notepad questions

5. **Build Calibration System**
   - Track user validation patterns
   - Adjust confidence thresholds based on agreement rate
   - Learn which Constitution sections Editor evaluates well

### Success Criteria

- [ ] Can generate Constitutional RLAIF batches
- [ ] Evaluations reference specific Constitution sections
- [ ] High-confidence evaluations auto-approved to training pairs
- [ ] Low-confidence evaluations queued for user review
- [ ] User validation improves Editor confidence over time
- [ ] Training data volume increases 5-10x from synthetic generation
- [ ] **PLM Validation:** PLM alignment score improves after training on Constitutional RLAIF data

### Verification Commands

```bash
# Generate batch
curl -X POST http://localhost:3000/api/rlaif/constitutional \
  -H "Content-Type: application/json" \
  -d '{"userId": "...", "targetArea": "values", "count": 20}'

# Check pending validations
curl "http://localhost:3000/api/rlaif/constitutional/pending?userId=..."

# Validate one
curl -X POST http://localhost:3000/api/rlaif/constitutional/validate \
  -H "Content-Type: application/json" \
  -d '{"evaluationId": "...", "agreed": true}'

# Check training pairs added
curl "http://localhost:3000/api/debug/state?userId=..." | jq '.counts.trainingPairs'
```

### Rollback Plan
- Constitutional RLAIF is additive (generates more training data)
- If quality issues: disable auto-approval, require manual review
- Can filter out constitutional_rlaif source from training pairs
- Fall back to user feedback only (current state)

---

## Phase 3: Separate Memories from Vault

**Goal:** Implement graph database for operational memory recall while keeping raw data in Vault.

### Current State
- Memories stored as vectors only (`memory_fragments`)
- No relationship tracking
- No distinction between operational data and sovereignty data

### What Changes
- **New:** Graph database schema (PostgreSQL + pg_graph or Neo4j)
- **Modified:** Memory extraction creates both graph nodes/edges and vector embeddings
- **New:** Hybrid retrieval (graph traversal + vector search)
- **Modified:** Vault becomes raw storage layer, Memories becomes operational layer

### What's Added

**Graph Schema (PostgreSQL Implementation):**
```sql
-- Nodes
CREATE TABLE memory_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  node_type TEXT NOT NULL,  -- 'entity', 'fact', 'event', 'value'
  properties JSONB NOT NULL,
  embedding vector(768),
  first_mentioned TIMESTAMPTZ NOT NULL,
  last_mentioned TIMESTAMPTZ NOT NULL,
  mention_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_memory_nodes_user_type ON memory_nodes(user_id, node_type);
CREATE INDEX idx_memory_nodes_embedding ON memory_nodes USING ivfflat (embedding vector_cosine_ops);

-- Edges
CREATE TABLE memory_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  from_node_id UUID NOT NULL REFERENCES memory_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES memory_nodes(id) ON DELETE CASCADE,
  edge_type TEXT NOT NULL,  -- 'KNOWS', 'WORKS_AT', etc.
  properties JSONB,
  strength NUMERIC(3,2) DEFAULT 1.0,  -- 0-1
  established_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_memory_edges_user ON memory_edges(user_id);
CREATE INDEX idx_memory_edges_from ON memory_edges(from_node_id);
CREATE INDEX idx_memory_edges_to ON memory_edges(to_node_id);
CREATE INDEX idx_memory_edges_type ON memory_edges(user_id, edge_type);

-- Keep existing memory_fragments for vector search
-- But modify to reference graph nodes
ALTER TABLE memory_fragments 
ADD COLUMN node_id UUID REFERENCES memory_nodes(id);
```

**API Endpoints:**
```typescript
// Graph traversal
POST /api/memories/traverse
{
  "userId": "...",
  "query": "Sarah's birthday",
  "maxDepth": 2
}

Response:
{
  "paths": [
    {
      "nodes": [
        { "id": "...", "type": "entity", "name": "Sarah" },
        { "id": "...", "type": "fact", "property": "birthday", "value": "1990-03-15" }
      ],
      "edges": [
        { "type": "HAS_PROPERTY", "strength": 1.0 }
      ]
    }
  ],
  "context": "Sarah's birthday is March 15, 1990"
}

// Hybrid retrieval (graph + vector)
POST /api/memories/retrieve
{
  "userId": "...",
  "query": "people who work with Sarah"
}

Response:
{
  "method": "hybrid",
  "graphResults": [
    { "name": "Alice", "relationship": "WORKS_AT same company", "confidence": 0.95 }
  ],
  "vectorResults": [
    { "content": "Sarah mentioned working with Bob on project X", "similarity": 0.87 }
  ],
  "synthesized": "Sarah works with Alice at TechCorp. She's also collaborated with Bob on project X."
}

// Add memory (creates graph + vector)
POST /api/memories/add
{
  "userId": "...",
  "content": "Sarah got promoted to VP of Engineering",
  "timestamp": "2026-02-10T10:00:00Z"
}

Response:
{
  "nodesCreated": [
    { "id": "...", "type": "entity", "name": "Sarah" },
    { "id": "...", "type": "event", "description": "Promotion to VP of Engineering" }
  ],
  "edgesCreated": [
    { "from": "Sarah", "to": "event", "type": "PARTICIPATED_IN" }
  ],
  "vectorIndexed": true
}
```

**Graph Memory Manager:**
```typescript
class GraphMemoryManager {
  async extract(
    content: string,
    userId: string
  ): Promise<MemoryExtractionResult> {
    // Extract entities, facts, events, relationships
    const extraction = await editorLLM.generate({
      model: 'editor',
      prompt: `Extract structured information from:
      
      "${content}"
      
      Return:
      - Entities (people, places, organizations, concepts)
      - Facts (statements about entities)
      - Events (timestamped happenings)
      - Relationships (connections between above)`,
      schema: MemoryExtractionSchema
    });
    
    // Create nodes
    const nodes = await Promise.all([
      ...extraction.entities.map(e => this.createOrUpdateNode(e, userId)),
      ...extraction.facts.map(f => this.createOrUpdateNode(f, userId)),
      ...extraction.events.map(e => this.createOrUpdateNode(e, userId))
    ]);
    
    // Create edges
    const edges = await Promise.all(
      extraction.relationships.map(r => this.createOrUpdateEdge(r, userId))
    );
    
    // Also create vector embedding for semantic search
    const vectorId = await this.indexVector(content, userId, nodes[0]?.id);
    
    return { nodes, edges, vectorId };
  }
  
  async traverse(
    query: string,
    userId: string,
    maxDepth: number = 2
  ): Promise<GraphPath[]> {
    // Extract entities from query
    const entities = await this.extractEntitiesFromQuery(query);
    
    // For each entity, traverse graph
    const paths = await Promise.all(
      entities.map(async entity => {
        const startNode = await this.findNode(entity, userId);
        if (!startNode) return null;
        
        // Breadth-first search
        return await this.bfs(startNode.id, userId, maxDepth);
      })
    );
    
    return paths.flat().filter(Boolean);
  }
  
  async hybridRetrieve(
    query: string,
    userId: string
  ): Promise<HybridMemoryResult> {
    // 1. Vector search (fast, semantic)
    const vectorResults = await this.vectorSearch(query, userId, { limit: 20 });
    
    // 2. Extract entities from query
    const entities = await this.extractEntitiesFromQuery(query);
    
    // 3. Graph traversal (precise, relational)
    const graphResults = await Promise.all(
      entities.map(e => this.traverse(e, userId, 2))
    );
    
    // 4. Combine and rank
    const combined = this.mergeResults(vectorResults, graphResults);
    
    // 5. Synthesize context
    const context = await this.synthesizeContext(combined, query);
    
    return {
      method: 'hybrid',
      graphResults: graphResults.flat(),
      vectorResults,
      synthesized: context
    };
  }
}
```

**Vault Integration:**
```typescript
// Raw data always goes to Vault first
async function processUserInput(
  content: string,
  userId: string,
  metadata: any
) {
  // 1. Save to Vault (sovereignty)
  await saveToVault(userId, {
    path: `raw/conversations/${Date.now()}.json`,
    content: JSON.stringify({ content, metadata, timestamp: new Date() })
  });
  
  // 2. Extract and store in operational Memories (graph + vector)
  await graphMemoryManager.extract(content, userId);
  
  // 3. Also process for Constitution/training as before
  // ...
}
```

### Implementation Steps

1. **Create Graph Schema**
   ```bash
   supabase/migrations/00011_graph_memories.sql
   npx supabase db push
   ```

2. **Build Graph Manager**
   - Add `lib/modules/memory/graph.ts`
   - Implement node/edge creation
   - Implement graph traversal (BFS/DFS)

3. **Implement Hybrid Retrieval**
   - Combine vector search with graph traversal
   - Add ranking algorithm
   - Add context synthesis

4. **Create API Endpoints**
   - `app/api/memories/traverse/route.ts` (POST)
   - `app/api/memories/retrieve/route.ts` (POST)
   - `app/api/memories/add/route.ts` (POST)

5. **Integrate with Orchestrator**
   - Modify Orchestrator to use hybrid retrieval
   - Update query classification to detect relational queries

6. **Migrate Existing Data**
   - Script to convert existing `memory_fragments` to graph nodes
   - Extract relationships from existing data
   - Verify no data loss

### Success Criteria

- [ ] Can extract entities and relationships into graph
- [ ] Graph traversal returns accurate paths
- [ ] Hybrid retrieval combines graph + vector effectively
- [ ] Relational queries (e.g., "Sarah's colleagues") work accurately
- [ ] Existing vector search still works (no regression)
- [ ] Raw data continues to flow to Vault
- [ ] **Performance:** Graph queries under 200ms for depth-2 traversal

### Verification Commands

```bash
# Add memory
curl -X POST http://localhost:3000/api/memories/add \
  -H "Content-Type: application/json" \
  -d '{"userId": "...", "content": "Sarah works at TechCorp with Alice"}'

# Traverse graph
curl -X POST http://localhost:3000/api/memories/traverse \
  -H "Content-Type: application/json" \
  -d '{"userId": "...", "query": "Sarah colleagues", "maxDepth": 2}'

# Hybrid retrieval
curl -X POST http://localhost:3000/api/memories/retrieve \
  -H "Content-Type: application/json" \
  -d '{"userId": "...", "query": "who works with Sarah?"}'
```

### Rollback Plan
- Graph tables independent, can drop without affecting vectors
- Orchestrator can fall back to vector-only retrieval
- Vault data unaffected (raw storage continues)

---

## Phase 4: Continuous Agent Behavior

**Goal:** Implement proactive triggers so Editor operates 24/7, not just reactively.

### Current State
- Editor waits for user input (reactive)
- No proactive conversation initiation
- No background processing

### What Changes
- **New:** Background worker for continuous operation
- **New:** Trigger detection system
- **New:** Proactive message queue
- **Modified:** Editor can initiate conversations

### What's Added

**Database Schema:**
```sql
-- Proactive triggers
CREATE TABLE proactive_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_data JSONB NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1,  -- 1-5
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'sent', 'responded', 'dismissed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ
);

CREATE INDEX idx_proactive_triggers_user_status 
  ON proactive_triggers(user_id, status) 
  WHERE status = 'pending';

-- Message queue (for Telegram integration)
CREATE TABLE message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);
```

**Trigger Detection:**
```typescript
class TriggerDetector {
  async detectConstitutionGaps(userId: string): Promise<Trigger[]> {
    const recentTopics = await getTopicFrequency(userId, { days: 30 });
    const constitution = await getConstitution(userId);
    
    const gaps = recentTopics
      .filter(t => t.count >= 3)  // Mentioned 3+ times
      .filter(t => !constitutionMentions(constitution, t.topic));
    
    return gaps.map(g => ({
      type: 'constitution_gap',
      data: { topic: g.topic, frequency: g.count },
      priority: Math.min(5, Math.floor(g.count / 3)),
      userId
    }));
  }
  
  async detectConsistencyConflicts(userId: string): Promise<Trigger[]> {
    const recent = await getRecentStatements(userId, { hours: 24 });
    const constitution = await getConstitution(userId);
    
    const conflicts = [];
    for (const statement of recent) {
      const contradictions = await this.checkContradiction(
        statement.text,
        constitution
      );
      
      if (contradictions.length > 0) {
        conflicts.push({
          type: 'consistency_conflict',
          data: {
            statement: statement.text,
            contradicts: contradictions[0].section
          },
          priority: 4,  // High priority
          userId
        });
      }
    }
    
    return conflicts;
  }
  
  async detectMemoryEnrichment(userId: string): Promise<Trigger[]> {
    // Find entities mentioned frequently but with minimal metadata
    const entities = await getFrequentEntities(userId, { minMentions: 5 });
    const sparse = entities.filter(e => {
      const metadata = e.properties;
      return Object.keys(metadata).length < 3;  // Sparse
    });
    
    return sparse.map(e => ({
      type: 'memory_enrichment',
      data: { entity: e.name, mentions: e.mention_count },
      priority: 2,
      userId
    }));
  }
  
  async detectTrainingOpportunities(userId: string): Promise<Trigger[]> {
    const validation = await getPLMValidationScores(userId);
    const weak = validation.filter(v => v.score < 0.7);
    
    return weak.map(w => ({
      type: 'training_opportunity',
      data: { domain: w.domain, score: w.score },
      priority: 3,
      userId,
      silent: true  // Don't message user, just run RLAIF
    }));
  }
}
```

**Background Worker:**
```typescript
// Runs every minute via Vercel Cron or Inngest
export async function continuousAgentWorker() {
  // Get all active users
  const users = await getActiveUsers();
  
  for (const userId of users) {
    // Detect triggers
    const triggers = await Promise.all([
      triggerDetector.detectConstitutionGaps(userId),
      triggerDetector.detectConsistencyConflicts(userId),
      triggerDetector.detectMemoryEnrichment(userId),
      triggerDetector.detectTrainingOpportunities(userId)
    ]).then(t => t.flat());
    
    // Filter out already detected
    const newTriggers = await filterExisting(triggers, userId);
    
    // Store new triggers
    await Promise.all(
      newTriggers.map(t => saveTrigger(t))
    );
    
    // Handle silent triggers (e.g., training opportunities)
    const silent = newTriggers.filter(t => t.silent);
    await Promise.all(
      silent.map(t => handleSilentTrigger(t))
    );
    
    // Queue messages for non-silent triggers
    const nonSilent = newTriggers.filter(t => !t.silent);
    await Promise.all(
      nonSilent.map(t => queueProactiveMessage(t))
    );
  }
}

// Handle silent triggers (background actions)
async function handleSilentTrigger(trigger: Trigger) {
  switch (trigger.type) {
    case 'training_opportunity':
      // Run RLAIF batch in background
      await generateRLAIFBatch(trigger.userId, {
        targetDomain: trigger.data.domain,
        count: 20,
        reason: `PLM validation low (${trigger.data.score})`
      });
      break;
    
    // Add more silent trigger types as needed
  }
}

// Queue proactive message
async function queueProactiveMessage(trigger: Trigger) {
  const message = await generateProactiveMessage(trigger);
  
  await saveToMessageQueue({
    userId: trigger.userId,
    message: message.text,
    metadata: {
      triggerId: trigger.id,
      triggerType: trigger.type
    }
  });
}
```

**Proactive Message Sender:**
```typescript
// Runs every 5 minutes
export async function sendProactiveMessages() {
  const pending = await getPendingMessages();
  
  for (const msg of pending) {
    // Check user preferences (don't spam)
    const canSend = await checkRateLimit(msg.userId);
    if (!canSend) continue;
    
    // Send via appropriate channel
    const channels = await getUserChannels(msg.userId);
    
    if (channels.includes('telegram')) {
      await sendTelegramMessage(msg.userId, msg.message);
    } else if (channels.includes('web')) {
      // Store as notification for next web visit
      await saveWebNotification(msg.userId, msg.message);
    }
    
    // Mark as sent
    await markMessageSent(msg.id);
  }
}
```

**API Endpoints:**
```typescript
// Get pending proactive messages (for web UI)
GET /api/proactive/pending?userId={userId}

Response:
{
  "pending": [
    {
      "id": "...",
      "message": "I noticed you mentioned 'startup ideas' 3 times this week...",
      "triggerType": "constitution_gap",
      "priority": 3,
      "createdAt": "2026-02-10T..."
    }
  ]
}

// Respond to proactive message
POST /api/proactive/respond
{
  "triggerId": "...",
  "response": "Yes, let's formalize my views on startups"
}

// Dismiss proactive message
POST /api/proactive/dismiss
{
  "triggerId": "..."
}
```

### Implementation Steps

1. **Create Database Schema**
   ```bash
   supabase/migrations/00012_continuous_agents.sql
   npx supabase db push
   ```

2. **Build Trigger Detection**
   - Add `lib/agents/triggers.ts`
   - Implement detection logic for each trigger type
   - Add priority scoring

3. **Implement Background Workers**
   - Set up Vercel Cron or Inngest
   - Add `app/api/cron/continuous-agent/route.ts`
   - Add `app/api/cron/send-messages/route.ts`

4. **Create API Endpoints**
   - `app/api/proactive/pending/route.ts` (GET)
   - `app/api/proactive/respond/route.ts` (POST)
   - `app/api/proactive/dismiss/route.ts` (POST)

5. **Build Web UI for Notifications**
   - Add notification badge
   - Add proactive message modal
   - Add response interface

### Success Criteria

- [ ] Trigger detection runs every minute without errors
- [ ] Constitution gaps detected and queued
- [ ] Consistency conflicts detected and queued
- [ ] Training opportunities trigger RLAIF batches automatically
- [ ] Proactive messages sent to user (web or Telegram)
- [ ] User can respond to proactive messages
- [ ] Rate limiting prevents spam
- [ ] **User Validation:** Proactive messages are relevant and valuable

### Verification Commands

```bash
# Manually trigger worker
curl http://localhost:3000/api/cron/continuous-agent

# Check pending triggers
curl "http://localhost:3000/api/proactive/pending?userId=..."

# Check message queue
psql $DATABASE_URL -c "SELECT * FROM message_queue WHERE status = 'pending';"
```

### Rollback Plan
- Background workers can be disabled via environment variable
- Proactive messages remain queued but not sent
- System degrades to reactive-only (current behavior)

---

## Phase 5: Telegram Interface & MCP Connections

**Goal:** Add Telegram bot for async interaction and MCP server for SOTA model connections.

### Current State
- Web interface only
- No external integrations

### What Changes
- **New:** Telegram bot for async messaging
- **New:** MCP server for Claude/ChatGPT connections
- **Modified:** Proactive messages can be sent via Telegram

### What's Added

**Telegram Bot:**
```typescript
// app/api/telegram/webhook/route.ts
export async function POST(req: Request) {
  const update = await req.json();
  
  // Map Telegram user to Alexandria user
  const userId = await mapTelegramToUser(update.message.from.id);
  
  if (update.message.voice) {
    // Voice message = highest fidelity carbon
    const transcription = await transcribeAudio(update.message.voice);
    
    await saveToVault(userId, {
      path: `raw/voice/${Date.now()}.m4a`,
      content: await downloadTelegramFile(update.message.voice.file_id)
    });
    
    // Route to Editor
    const response = await editor.converse(transcription, userId);
    await sendTelegramMessage(update.message.chat.id, response.message);
  } 
  else if (update.message.text) {
    // Check command
    if (update.message.text.startsWith('/input')) {
      // Editor mode
      const response = await editor.converse(
        update.message.text.replace('/input', '').trim(),
        userId
      );
      await sendTelegramMessage(update.message.chat.id, response.message);
    } else {
      // Orchestrator mode (default)
      const response = await orchestrator.handleQuery({
        messages: [{ role: 'user', content: update.message.text }],
        userId
      });
      await sendTelegramMessage(update.message.chat.id, response.text);
    }
  }
  
  return Response.json({ ok: true });
}

// Proactive messages via Telegram
async function sendTelegramMessage(chatId: string, message: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    })
  });
}
```

**MCP Server:**
```typescript
// app/api/mcp/route.ts
import { MCPServer } from '@modelcontextprotocol/sdk/server';

const server = new MCPServer({
  name: 'alexandria',
  version: '1.0.0'
});

// Register tools
server.addTool({
  name: 'query_plm',
  description: 'Query the user\'s Personal Language Model',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The query to ask' },
      context: { type: 'string', description: 'Optional additional context' }
    },
    required: ['query']
  },
  handler: async (input: { query: string, context?: string }, context) => {
    const userId = context.user.id;
    
    // Validate API key
    await validateMCPAccess(userId, context.apiKey);
    
    // Route through Orchestrator
    const response = await orchestrator.handleQuery({
      messages: [{ role: 'user', content: input.query }],
      userId,
      externalContext: input.context
    });
    
    return {
      response: response.text,
      confidence: response.confidence,
      sources: response.sources
    };
  }
});

export async function POST(req: Request) {
  const request = await req.json();
  const response = await server.handleRequest(request);
  return Response.json(response);
}
```

**Claude Desktop Integration:**
```json
// ~/.config/claude/mcp_servers.json
{
  "alexandria": {
    "command": "curl",
    "args": [
      "-X", "POST",
      "https://your-app.vercel.app/api/mcp",
      "-H", "Authorization: Bearer YOUR_API_KEY",
      "-H", "Content-Type: application/json",
      "-d", "@-"
    ]
  }
}
```

### Implementation Steps

1. **Set Up Telegram Bot**
   - Create bot via BotFather
   - Add webhook endpoint
   - Implement message handling
   - Add user mapping (Telegram ID ↔ Alexandria user ID)

2. **Build MCP Server**
   - Add `app/api/mcp/route.ts`
   - Implement tool registration
   - Add authentication
   - Test with Claude Desktop

3. **Integrate Proactive Messages**
   - Modify message sender to support Telegram
   - Add channel preferences per user
   - Test proactive Telegram notifications

4. **Add Voice Transcription**
   - Integrate speech-to-text API (OpenAI Whisper)
   - Handle Telegram voice messages
   - Store audio in Vault

### Success Criteria

- [ ] Telegram bot responds to text messages
- [ ] Telegram bot handles voice messages (transcription works)
- [ ] Proactive messages sent via Telegram
- [ ] MCP server responds to Claude queries
- [ ] External API authentication works
- [ ] **User Validation:** Telegram interface feels natural for async interaction

### Verification Commands

```bash
# Test Telegram webhook
curl -X POST http://localhost:3000/api/telegram/webhook \
  -H "Content-Type: application/json" \
  -d '{"message": {"from": {"id": 123}, "text": "Hello", "chat": {"id": 123}}}'

# Test MCP endpoint
curl -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer test_key" \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call", "params": {"name": "query_plm", "arguments": {"query": "What matters most to me?"}}}'
```

### Rollback Plan
- Telegram webhook can be disabled
- MCP server can be disabled via environment variable
- Web interface continues to work
- No database changes, purely additive

---

## Phase 6: Intelligent Orchestrator Weighting

**Goal:** Dynamically adjust Constitution vs PLM weighting based on maturity and query type.

### Current State
- Orchestrator uses static weighting
- No maturity tracking
- No query-type-specific routing

### What Changes
- **New:** PLM maturity assessment
- **New:** Dynamic weighting computation
- **Modified:** Orchestrator uses maturity-aware weighting

### What's Added

**Database Schema:**
```sql
-- PLM maturity tracking
CREATE TABLE plm_maturity_metrics (
  user_id UUID PRIMARY KEY,
  plm_version INTEGER NOT NULL,
  training_cycles INTEGER NOT NULL DEFAULT 0,
  constitutional_alignment NUMERIC(3,2),  -- 0-1
  user_satisfaction NUMERIC(3,2),         -- 0-1
  constitution_coverage NUMERIC(3,2),     -- 0-1
  hallucination_rate NUMERIC(3,2),        -- 0-1
  style_fidelity NUMERIC(3,2),            -- 0-1
  value_alignment NUMERIC(3,2),           -- 0-1
  overall_maturity NUMERIC(3,2),          -- 0-1, computed
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Query-specific weighting overrides
CREATE TABLE query_weighting_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  query_type TEXT NOT NULL,
  override_constitution_weight NUMERIC(3,2),
  override_plm_weight NUMERIC(3,2),
  reasoning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Maturity Assessor:**
```typescript
class MaturityAssessor {
  async assess(userId: string): Promise<PLMMaturity> {
    // Gather metrics
    const trainingCycles = await getTrainingCycleCount(userId);
    const rlaifScore = await getConstitutionalAlignmentScore(userId);
    const feedbackScore = await getUserFeedbackScore(userId);
    const coverage = await getConstitutionCoverage(userId);
    const hallucinations = await getHallucinationRate(userId);
    const styleFidelity = await getStyleFidelityScore(userId);
    const valueAlignment = await getValueAlignmentScore(userId);
    
    // LLM computes overall maturity (ILO principle)
    const assessment = await orchestratorLLM.generate({
      model: 'orchestrator',
      prompt: `Assess PLM maturity:
      
      Training Cycles: ${trainingCycles}
      Constitutional Alignment: ${rlaifScore}
      User Satisfaction: ${feedbackScore}
      Constitution Coverage: ${coverage}
      Hallucination Rate: ${hallucinations}
      Style Fidelity: ${styleFidelity}
      Value Alignment: ${valueAlignment}
      
      Compute overall maturity (0-1) considering:
      - Training cycles matter, but quality > quantity
      - High alignment + coverage suggests internalization
      - Low hallucinations critical for trust
      - Style and value alignment = personality fidelity
      
      Explain your reasoning.`,
      schema: MaturityAssessmentSchema
    });
    
    // Store metrics
    await savePLMMaturityMetrics(userId, {
      trainingCycles,
      constitutionalAlignment: rlaifScore,
      userSatisfaction: feedbackScore,
      constitutionCoverage: coverage,
      hallucinationRate: hallucinations,
      styleFidelity,
      valueAlignment,
      overallMaturity: assessment.score
    });
    
    return {
      trainingCycles,
      constitutionalRLAIFScore: rlaifScore,
      userFeedbackScore: feedbackScore,
      coverageCompleteness: coverage,
      overallMaturity: assessment.score,
      reasoning: assessment.reasoning
    };
  }
}
```

**Dynamic Weighting:**
```typescript
class IntelligentOrchestrator {
  async computeWeights(
    query: string,
    userId: string
  ): Promise<ComponentWeights> {
    // 1. Classify query type
    const classification = await this.classifyQuery(query);
    
    // 2. Get PLM maturity
    const maturity = await this.maturityAssessor.assess(userId);
    
    // 3. Base weights from query type
    let { constitution, plm, memories } = classification.baseWeights;
    
    // 4. Apply maturity adjustment
    const constitutionPLMTotal = constitution + plm;
    const maturityFactor = maturity.overallMaturity;
    
    // Shift Constitution → PLM based on maturity
    // At maturity 0: 80% Constitution, 20% PLM
    // At maturity 1: 20% Constitution, 80% PLM
    const newConstitution = constitutionPLMTotal * (0.8 - 0.6 * maturityFactor);
    const newPLM = constitutionPLMTotal * (0.2 + 0.6 * maturityFactor);
    
    // 5. Check for query-specific overrides
    const override = await this.getQueryOverride(userId, classification.type);
    if (override) {
      return override.weights;
    }
    
    // 6. Normalize
    const total = newConstitution + newPLM + memories;
    return {
      constitution: newConstitution / total,
      plm: newPLM / total,
      memories: memories / total,
      reasoning: `Maturity: ${maturity.overallMaturity.toFixed(2)}, Type: ${classification.type}`
    };
  }
  
  async handleQuery(params: QueryParams): Promise<OrchestratorResponse> {
    const weights = await this.computeWeights(params.messages[0].content, params.userId);
    
    // Retrieve from components
    const [constitutionContext, plmResponse, memoryContext] = await Promise.all([
      this.retrieveConstitutionContext(params.messages, params.userId),
      this.generatePLMResponse(params.messages, params.userId),
      this.retrieveMemoryContext(params.messages, params.userId)
    ]);
    
    // Synthesize with dynamic weights
    const response = await this.synthesize({
      constitution: { content: constitutionContext, weight: weights.constitution },
      plm: { content: plmResponse, weight: weights.plm },
      memories: { content: memoryContext, weight: weights.memories },
      query: params.messages[0].content
    });
    
    return {
      text: response,
      weights,
      confidence: await this.assessConfidence(response)
    };
  }
}
```

**API Endpoints:**
```typescript
// Get current PLM maturity
GET /api/orchestrator/maturity?userId={userId}

Response:
{
  "overallMaturity": 0.65,
  "metrics": {
    "trainingCycles": 8,
    "constitutionalAlignment": 0.87,
    "userSatisfaction": 0.72,
    "constitutionCoverage": 0.68,
    "styleFidelity": 0.81,
    "valueAlignment": 0.85
  },
  "currentWeighting": {
    "constitution": 0.42,
    "plm": 0.42,
    "memories": 0.16
  },
  "reasoning": "PLM shows strong value alignment and style fidelity..."
}

// Preview weights for a specific query
POST /api/orchestrator/preview-weights
{
  "userId": "...",
  "query": "What matters most to you?"
}

Response:
{
  "queryType": "values",
  "weights": {
    "constitution": 0.55,
    "plm": 0.35,
    "memories": 0.10
  },
  "reasoning": "Values query favors Constitution even with mature PLM"
}
```

### Implementation Steps

1. **Create Database Schema**
   ```bash
   supabase/migrations/00013_intelligent_weighting.sql
   npx supabase db push
   ```

2. **Build Maturity Assessor**
   - Add `lib/agents/maturity-assessor.ts`
   - Implement metric collection
   - Implement LLM-based assessment

3. **Implement Dynamic Weighting**
   - Modify Orchestrator to compute weights per query
   - Add maturity adjustment formula
   - Add query-type specific logic

4. **Create API Endpoints**
   - `app/api/orchestrator/maturity/route.ts` (GET)
   - `app/api/orchestrator/preview-weights/route.ts` (POST)

5. **Add Maturity Dashboard (UI)**
   - Show current maturity score
   - Show weighting progression over time
   - Show per-query weight preview

### Success Criteria

- [ ] PLM maturity computed automatically
- [ ] Weighting adjusts based on maturity
- [ ] Values queries favor Constitution even with mature PLM
- [ ] Behavioral queries favor PLM as it matures
- [ ] Maturity dashboard shows progression
- [ ] **User Validation:** Responses feel more authentic as PLM matures

### Verification Commands

```bash
# Get maturity
curl "http://localhost:3000/api/orchestrator/maturity?userId=..."

# Preview weights
curl -X POST http://localhost:3000/api/orchestrator/preview-weights \
  -H "Content-Type: application/json" \
  -d '{"userId": "...", "query": "Should I take this job?"}'

# Compare responses at different maturities (test)
# (manually adjust maturity in DB, generate same query, compare)
```

### Rollback Plan
- Can disable dynamic weighting via feature flag
- Fall back to static weights (current behavior)
- Maturity tables independent, can drop without affecting core

---

## Phase 7: External API (Marketplace Foundation)

**Goal:** Expose authenticated API for external applications to query user's PLM.

### Current State
- No external API
- No authentication beyond internal

### What Changes
- **New:** External API with API key authentication
- **New:** Rate limiting and usage tracking
- **New:** User-configurable permissions
- **Modified:** Orchestrator supports external mode

### What's Added

**Database Schema:**
```sql
-- API keys
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,  -- bcrypt hash
  name TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  rate_limit INTEGER NOT NULL DEFAULT 100,  -- requests per hour
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- API usage tracking
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  request_data JSONB,
  response_data JSONB,
  status_code INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_usage_key_time ON api_usage(api_key_id, timestamp DESC);

-- User API settings
CREATE TABLE api_settings (
  user_id UUID PRIMARY KEY,
  allow_external_queries BOOLEAN NOT NULL DEFAULT FALSE,
  expose_sources BOOLEAN NOT NULL DEFAULT FALSE,
  allowed_query_types TEXT[] NOT NULL DEFAULT ARRAY['factual', 'values', 'behavioral'],
  max_queries_per_hour INTEGER NOT NULL DEFAULT 100,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**API Authentication:**
```typescript
async function validateAPIKey(
  apiKey: string
): Promise<{ userId: string, permissions: Permissions } | null> {
  // Extract key from header
  const keyHash = await bcrypt.hash(apiKey, 10);
  
  // Look up key
  const key = await db.query(
    'SELECT * FROM api_keys WHERE key_hash = $1 AND (expires_at IS NULL OR expires_at > NOW())',
    [keyHash]
  );
  
  if (!key) return null;
  
  // Update last used
  await db.query(
    'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
    [key.id]
  );
  
  return {
    userId: key.user_id,
    permissions: key.permissions
  };
}

async function checkRateLimit(
  apiKeyId: string,
  userId: string
): Promise<boolean> {
  const settings = await getAPISettings(userId);
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const count = await db.query(
    'SELECT COUNT(*) FROM api_usage WHERE api_key_id = $1 AND timestamp > $2',
    [apiKeyId, hourAgo]
  );
  
  return count < settings.max_queries_per_hour;
}
```

**External API Endpoints:**
```typescript
// POST /api/v1/query
export async function POST(req: Request) {
  // 1. Authenticate
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Missing API key' }, { status: 401 });
  }
  
  const apiKey = authHeader.replace('Bearer ', '');
  const auth = await validateAPIKey(apiKey);
  
  if (!auth) {
    return Response.json({ error: 'Invalid API key' }, { status: 401 });
  }
  
  // 2. Check rate limit
  const canProceed = await checkRateLimit(apiKey, auth.userId);
  if (!canProceed) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  
  // 3. Parse request
  const { query, context } = await req.json();
  
  // 4. Check permissions
  const settings = await getAPISettings(auth.userId);
  if (!settings.allow_external_queries) {
    return Response.json({ error: 'External queries disabled' }, { status: 403 });
  }
  
  // 5. Route through Orchestrator
  const response = await orchestrator.handleQuery({
    messages: [{ role: 'user', content: query }],
    userId: auth.userId,
    externalContext: context,
    mode: 'external'  // May affect behavior
  });
  
  // 6. Log usage
  await logAPIUsage({
    apiKeyId: apiKey,
    userId: auth.userId,
    endpoint: '/api/v1/query',
    requestData: { query, context },
    responseData: { confidence: response.confidence },
    statusCode: 200
  });
  
  // 7. Return response
  return Response.json({
    response: response.text,
    confidence: response.confidence,
    sources: settings.expose_sources ? response.sources : undefined
  });
}

// POST /api/v1/keys (create API key)
export async function POST(req: Request) {
  const { userId, name, permissions, expiresIn } = await req.json();
  
  // Validate user owns this
  await validateUserOwnership(userId);
  
  // Generate key
  const apiKey = generateSecureKey();
  const keyHash = await bcrypt.hash(apiKey, 10);
  
  // Store
  const expiresAt = expiresIn 
    ? new Date(Date.now() + expiresIn * 1000)
    : null;
  
  await db.query(
    'INSERT INTO api_keys (user_id, key_hash, name, permissions, expires_at) VALUES ($1, $2, $3, $4, $5)',
    [userId, keyHash, name, permissions, expiresAt]
  );
  
  // Return key (only time it's shown)
  return Response.json({
    apiKey,
    name,
    expiresAt,
    warning: 'Save this key - it will not be shown again'
  });
}

// GET /api/v1/usage (usage stats)
export async function GET(req: Request) {
  const auth = await validateAPIKey(req.headers.get('Authorization'));
  if (!auth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const stats = await getAPIUsageStats(auth.userId);
  
  return Response.json({
    totalQueries: stats.total,
    queriesThisHour: stats.thisHour,
    queriesThisDay: stats.thisDay,
    queriesThisMonth: stats.thisMonth,
    topEndpoints: stats.topEndpoints
  });
}
```

**User Dashboard:**
```typescript
// Web UI for managing API access
// app/dashboard/api/page.tsx

export default function APIManagementPage() {
  return (
    <div>
      <h1>External API</h1>
      
      <section>
        <h2>Settings</h2>
        <Toggle 
          label="Allow external queries" 
          value={settings.allow_external_queries}
          onChange={updateSettings}
        />
        <Toggle 
          label="Expose sources in responses" 
          value={settings.expose_sources}
          onChange={updateSettings}
        />
        <Input 
          label="Max queries per hour" 
          type="number"
          value={settings.max_queries_per_hour}
          onChange={updateSettings}
        />
      </section>
      
      <section>
        <h2>API Keys</h2>
        <Button onClick={createAPIKey}>Create New Key</Button>
        
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Created</th>
              <th>Last Used</th>
              <th>Expires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map(key => (
              <tr key={key.id}>
                <td>{key.name}</td>
                <td>{key.created_at}</td>
                <td>{key.last_used_at || 'Never'}</td>
                <td>{key.expires_at || 'Never'}</td>
                <td>
                  <Button onClick={() => revokeKey(key.id)}>Revoke</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      
      <section>
        <h2>Usage</h2>
        <Stats>
          <Stat label="Queries this hour" value={usage.thisHour} />
          <Stat label="Queries today" value={usage.thisDay} />
          <Stat label="Queries this month" value={usage.thisMonth} />
        </Stats>
      </section>
    </div>
  );
}
```

### Implementation Steps

1. **Create Database Schema**
   ```bash
   supabase/migrations/00014_external_api.sql
   npx supabase db push
   ```

2. **Build Authentication**
   - Add `lib/auth/api-keys.ts`
   - Implement key generation and validation
   - Add rate limiting

3. **Create External API Endpoints**
   - `app/api/v1/query/route.ts` (POST)
   - `app/api/v1/keys/route.ts` (POST, GET, DELETE)
   - `app/api/v1/usage/route.ts` (GET)

4. **Build User Dashboard**
   - Add API management UI
   - Add key creation flow
   - Add usage stats visualization

5. **Add Documentation**
   - API reference docs
   - Example code (Python, JS, curl)
   - Rate limits and best practices

### Success Criteria

- [ ] Can create API keys via dashboard
- [ ] External applications can query via API key
- [ ] Rate limiting works correctly
- [ ] Usage tracked and displayed
- [ ] Permissions enforced
- [ ] **Security Validation:** API keys secure, no leaks possible

### Verification Commands

```bash
# Create API key
curl -X POST http://localhost:3000/api/v1/keys \
  -H "Content-Type: application/json" \
  -d '{"userId": "...", "name": "Test Key", "permissions": {}}'

# Use API key
curl -X POST http://localhost:3000/api/v1/query \
  -H "Authorization: Bearer alex_key_..." \
  -H "Content-Type: application/json" \
  -d '{"query": "What matters most to you?"}'

# Check usage
curl -X GET http://localhost:3000/api/v1/usage \
  -H "Authorization: Bearer alex_key_..."
```

### Rollback Plan
- External API can be disabled via environment variable
- API keys remain in database but return 503 if disabled
- Internal API unaffected
- Can revoke all keys instantly if security issue

---

## Migration Timeline & Dependencies

```
Phase 1: Constitution (2 weeks)
   ↓
Phase 2: Constitutional RLAIF (2 weeks)
   ↓
Phase 3: Graph Memories (3 weeks)
   ↓
Phase 4: Continuous Agents (2 weeks)
   ↓
Phase 5: Telegram + MCP (2 weeks)
   ↓
Phase 6: Intelligent Weighting (1 week)
   ↓
Phase 7: External API (2 weeks)

Total: ~14 weeks (3.5 months)
```

**Parallel Opportunities:**
- Phase 5 (Telegram/MCP) can start after Phase 4 without waiting for Phase 6
- Phase 7 (External API) can be built anytime after Phase 2 (needs Orchestrator working)

**Critical Path:**
1 → 2 → 4 → 6 (Constitutional AI + Continuous + Intelligent Weighting)

**Optional Extensions:**
3 (Graph Memories), 5 (Telegram/MCP), 7 (External API) can be added in any order after critical path.

---

## Post-Migration: Terminal State Achieved

After completing all 7 phases, Alexandria will have evolved from a **reactive training tool** to a **sovereign digital entity** with:

✅ **Explicit Constitution** as ground truth  
✅ **Constitutional RLAIF** for automated quality training  
✅ **Graph + Vector Memories** for rich context  
✅ **Continuous Agents** for proactive behavior  
✅ **Multi-Interface** (Web + Telegram + MCP)  
✅ **Intelligent Orchestrator** with dynamic weighting  
✅ **External API** for marketplace integration  
✅ **Data Sovereignty** (Vault with full export)

**Next Frontiers (Beyond Terminal State):**
- Voice/video embodiment
- Multi-user collaborative agents
- Cross-platform PLM marketplace
- GraphRAG implementation (entities already collected)
- Temporal versioning ("2024 me" vs "2026 me")

**The Line:** From chatbot → digital cognition platform → sovereign AI entity.
