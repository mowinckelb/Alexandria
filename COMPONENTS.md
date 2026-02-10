# Alexandria Components: Detailed Specifications

> **Last Updated:** 2026-02-10  
> **Purpose:** Technical specifications for each agent and component in the Alexandria system

---

## Table of Contents

1. [Editor Agent](#1-editor-agent)
2. [Orchestrator Agent](#2-orchestrator-agent)
3. [Constitution](#3-constitution)
4. [PLM (Personal Language Model)](#4-plm-personal-language-model)
5. [Memories](#5-memories)
6. [Vault](#6-vault)

---

## 1. Editor Agent

### Role
Active biographer that extracts subjective data from the Author through Socratic questioning, builds and maintains the Constitution, and generates high-quality training data via Constitutional RLAIF.

### Current vs Target

| Aspect | Current Implementation | Target Implementation |
|--------|----------------------|---------------------|
| **Behavior** | Reactive (waits for user input) | Continuous (proactive triggers) |
| **Constitution** | Implicit in training pairs | Explicit markdown file + RLAIF evaluator |
| **Interface** | Web chat only | Web + Telegram + background processes |
| **Training Decisions** | Manual | LLM-driven (ILO principle) |

### Core Capabilities

#### A. Socratic Questioning

**Purpose:** Extract subjective information through thoughtful dialogue.

**Techniques:**
```typescript
// Example prompts Editor uses
{
  "explore_contradiction": "You said X earlier, but now Y. Which is more true?",
  "deepen_surface_statement": "When you say 'efficiency matters', what does efficiency mean to you specifically?",
  "extract_decision_heuristic": "Walk me through how you decided that. What was the deciding factor?",
  "clarify_boundary": "You value both honesty and kindness. When they conflict, which wins?",
  "temporal_evolution": "Has your view on X changed over time? What caused the shift?"
}
```

**Implementation:**
```typescript
interface SocraticPrompt {
  type: 'contradiction' | 'deepening' | 'heuristic' | 'boundary' | 'evolution';
  context: string;  // What triggered this prompt
  question: string;  // The actual question
  constitutionSection?: string;  // Which section this informs
}

class EditorAgent {
  async generateSocraticPrompt(
    userId: string,
    trigger: ProactiveTrigger
  ): Promise<SocraticPrompt> {
    const constitution = await this.getConstitution(userId);
    const notepad = await this.getNotepad(userId);
    const recentInteractions = await this.getRecentHistory(userId);
    
    // LLM decides what to ask based on gaps/contradictions
    return await this.llm.generate({
      model: 'editor',
      prompt: `Constitution: ${constitution}
               Notepad: ${notepad}
               Recent: ${recentInteractions}
               Trigger: ${trigger}
               
               Generate a Socratic question to extract deeper truth.`,
      schema: SocraticPromptSchema
    });
  }
}
```

#### B. Constitution Building

**Purpose:** Transform implicit patterns into explicit markdown ground truth.

**Structure:**
```markdown
# [Author Name]'s Constitution

## Core Identity
Brief self-description in Author's voice.

## Worldview

### Epistemology (How I Know Things)
- What sources I trust and why
- How I evaluate evidence
- When I say "I don't know"

### Ontology (What Exists)
- Key concepts and how I categorize reality
- What I believe is "real" vs "constructed"

## Values (Hierarchical)

### Tier 1 (Non-Negotiable)
Values that override everything else. Rarely conflict.

Example:
- **Truth over comfort**: Will deliver hard truths even if it hurts feelings
- **Autonomy**: Personal freedom supersedes collective efficiency

### Tier 2 (Strong Preferences)
Important but can be traded off against Tier 1 or each other.

Example:
- **Simplicity**: Prefer simple solutions, but not at cost of truth
- **Kindness**: Be kind, but not if it requires dishonesty (Tier 1)

### Tier 3 (Stylistic)
Preferences that shape behavior but aren't moral imperatives.

Example:
- **Directness**: Say things plainly
- **Humor**: Use dry humor to soften intensity

## Mental Models

### [Domain]: [Model Name]
**When to apply**: [Context]  
**How it works**: [Explanation]  
**Example**: [Specific case]  
**Limitations**: [When it breaks down]

Example:
### Business: First Principles Thinking
**When to apply**: Evaluating startup ideas or strategic decisions  
**How it works**: Break down to fundamental truths, rebuild from there  
**Example**: "Everyone does X" → Ask "Why?" 5 times → Often X is cargo-culting  
**Limitations**: Time-intensive, can miss emergent properties

## Decision-Making Heuristics

### [Situation Type]: [Heuristic]
**Rule**: [Simple decision rule]  
**Why**: [Underlying reasoning]  
**Override conditions**: [When to break the rule]

Example:
### Career Decisions: Slope over Y-intercept
**Rule**: Optimize for learning rate, not current compensation  
**Why**: Long-term compounding beats short-term max  
**Override conditions**: Financial emergency, or learning rate actually zero

## Communication Patterns

### Writing Style
- Sentence structure preferences
- Vocabulary (favorite words, avoided words)
- Punctuation quirks (em-dashes, semicolons, etc.)
- Paragraph rhythm

### Speaking Style
- Verbal tics
- Pace (fast/slow)
- Tangent frequency
- Use of analogies/metaphors

## Domain Expertise

### [Domain]
**Depth**: [Beginner/Intermediate/Expert/World-class]  
**Subdomains**: [Specific areas within domain]  
**Opinions**: [Contrarian takes or strong views]  
**Gaps**: [What I don't know in this domain]

## Boundaries (What I Don't Do)

- Things I will never say/do, even if asked
- Topics I don't have opinions on (and why)
- Roles I don't play (e.g., "I don't give medical advice")

## Evolution Notes

### [Date]: [Change]
**What changed**: [Specific belief/value/model]  
**Why**: [Trigger or reasoning]  
**Old state**: [What I used to believe]  
**New state**: [What I believe now]

---

_This Constitution is living. Last updated: [timestamp]_
```

**Update Triggers:**
```typescript
type ConstitutionUpdateTrigger = 
  | { type: 'new_value_expressed', value: string, context: string }
  | { type: 'contradiction_detected', old: string, new: string }
  | { type: 'mental_model_used', model: string, effectiveness: number }
  | { type: 'boundary_crossed', boundary: string, context: string }
  | { type: 'evolution_acknowledged', domain: string, reason: string };

class ConstitutionManager {
  async shouldUpdate(trigger: ConstitutionUpdateTrigger): Promise<{
    shouldUpdate: boolean;
    section: string;
    proposedChange: string;
    reasoning: string;
  }> {
    // Editor LLM decides if Constitution update needed
    // Returns proposal for user review
  }
}
```

#### C. Constitutional RLAIF

**Purpose:** Generate synthetic training data by evaluating PLM against Constitution.

**Flow:**
```
1. Editor identifies Constitution gap or low-validation area
      ↓
2. Generate synthetic prompt targeting that area
      ↓
3. PLM generates response
      ↓
4. Editor evaluates response against Constitution
      ↓
5. Assign confidence: high (0.8+), medium (0.6-0.8), low (<0.6)
      ↓
6. Route based on confidence:
   - High: Auto-approve, add to training pairs (quality: 0.95)
   - Medium: Add to training pairs, flag for spot-check (quality: 0.80)
   - Low: Add to notepad as question for user validation
      ↓
7. User validates sample of medium-confidence (calibration)
      ↓
8. Editor learns from disagreements (update evaluation model)
```

**Implementation:**
```typescript
interface RLAIFEvaluation {
  prompt: string;
  plmResponse: string;
  evaluation: {
    aligned: boolean;
    confidence: number; // 0-1
    reasoning: string;
    constitutionReferences: string[]; // Which sections informed judgment
  };
  action: 'auto_approve' | 'flag_for_review' | 'queue_for_user';
}

class ConstitutionalRLAIF {
  async evaluateResponse(
    prompt: string,
    plmResponse: string,
    userId: string
  ): Promise<RLAIFEvaluation> {
    const constitution = await this.getConstitution(userId);
    const feedbackHistory = await this.getFeedbackPatterns(userId);
    
    // Editor evaluates PLM response
    const evaluation = await this.editorLLM.generate({
      model: 'editor',
      prompt: `Constitution: ${constitution}
               User's historical feedback patterns: ${feedbackHistory}
               
               Prompt: ${prompt}
               PLM Response: ${plmResponse}
               
               Evaluate if this response aligns with the Constitution.
               Be specific about which values/models/heuristics it matches or violates.`,
      schema: RLAIFEvaluationSchema
    });
    
    // Determine routing
    let action: RLAIFEvaluation['action'];
    if (evaluation.confidence >= 0.8) {
      action = 'auto_approve';
    } else if (evaluation.confidence >= 0.6) {
      action = 'flag_for_review';
    } else {
      action = 'queue_for_user';
    }
    
    return { prompt, plmResponse, evaluation, action };
  }
  
  async generateSyntheticBatch(
    userId: string,
    targetArea: string,
    count: number = 10
  ): Promise<RLAIFEvaluation[]> {
    // Generate prompts targeting Constitution gap
    // Get PLM responses
    // Evaluate all
    // Return batch for processing
  }
}
```

**Confidence Calibration:**
```typescript
// User validates medium-confidence evaluations
interface ValidationFeedback {
  rlaifEvaluationId: string;
  userAgreed: boolean;
  userReasoning?: string;
}

async function calibrateConfidence(
  validations: ValidationFeedback[]
): Promise<CalibrationUpdate> {
  // If user disagrees often, lower confidence thresholds
  // If user agrees often, can raise auto-approve threshold
  // Learn which Constitution sections Editor evaluates well vs poorly
}
```

#### D. Proactive Triggers

**Purpose:** Initiate conversations without user prompting.

**Trigger Types:**
```typescript
type ProactiveTrigger = 
  | { type: 'constitution_gap', topic: string, frequency: number }
  | { type: 'consistency_conflict', statement: string, contradicts: string }
  | { type: 'memory_enrichment', entity: string, mentions: number }
  | { type: 'training_opportunity', domain: string, plmScore: number }
  | { type: 'temporal_check', lastInteraction: Date, reason: string }
  | { type: 'external_event', event: string, relevant: boolean };
```

**Example Implementations:**

**1. Constitution Gap Detection**
```typescript
async function detectConstitutionGaps(userId: string): Promise<ProactiveTrigger[]> {
  // Analyze recent conversations
  const recentTopics = await getTopicFrequency(userId, { days: 30 });
  const constitution = await getConstitution(userId);
  
  // Find topics mentioned 3+ times but not in Constitution
  const gaps = recentTopics
    .filter(t => t.count >= 3)
    .filter(t => !constitutionMentions(constitution, t.topic));
  
  return gaps.map(g => ({
    type: 'constitution_gap',
    topic: g.topic,
    frequency: g.count
  }));
}

// Editor action
async function handleConstitutionGap(trigger: ProactiveTrigger) {
  await sendMessage(userId, {
    type: 'proactive',
    message: `I noticed you've mentioned ${trigger.topic} ${trigger.frequency} times recently, but your Constitution doesn't cover it. Want to formalize your views?`,
    suggestedSection: inferConstitutionSection(trigger.topic)
  });
}
```

**2. Consistency Conflict**
```typescript
async function detectConsistencyConflicts(
  userId: string
): Promise<ProactiveTrigger[]> {
  const newStatements = await getRecentStatements(userId, { hours: 24 });
  const constitution = await getConstitution(userId);
  
  const conflicts = [];
  for (const statement of newStatements) {
    const contradictions = await checkContradiction(statement, constitution);
    if (contradictions.length > 0) {
      conflicts.push({
        type: 'consistency_conflict',
        statement: statement.text,
        contradicts: contradictions[0].section
      });
    }
  }
  
  return conflicts;
}

// Editor action
async function handleConsistencyConflict(trigger: ProactiveTrigger) {
  await sendMessage(userId, {
    type: 'clarification',
    message: `You just said "${trigger.statement}", but your Constitution says "${trigger.contradicts}". Has your view evolved, or did I misunderstand?`,
    options: ['View evolved', 'Misunderstanding', 'Context-dependent']
  });
}
```

**3. Training Opportunity (RLAIF)**
```typescript
async function detectTrainingOpportunities(
  userId: string
): Promise<ProactiveTrigger[]> {
  const plmValidation = await getPLMValidationScores(userId);
  const lowScoreAreas = plmValidation.filter(v => v.score < 0.7);
  
  return lowScoreAreas.map(area => ({
    type: 'training_opportunity',
    domain: area.domain,
    plmScore: area.score
  }));
}

// Editor action
async function handleTrainingOpportunity(trigger: ProactiveTrigger) {
  // Don't message user, just run RLAIF in background
  await generateRLAIFBatch(userId, {
    targetDomain: trigger.domain,
    count: 20,
    reason: `PLM validation low (${trigger.plmScore}) in ${trigger.domain}`
  });
}
```

#### E. Tools & Methods

**Public Interface:**
```typescript
interface EditorAgent {
  // Conversation
  converse(input: string, userId: string): Promise<EditorResponse>;
  handleProactiveTrigger(trigger: ProactiveTrigger): Promise<void>;
  
  // Constitution
  getConstitution(userId: string): Promise<Constitution>;
  proposeConstitutionUpdate(update: ConstitutionUpdate): Promise<UserApproval>;
  applyConstitutionUpdate(update: ConstitutionUpdate): Promise<void>;
  
  // RLAIF
  generateRLAIFBatch(userId: string, params: RLAIFParams): Promise<RLAIFEvaluation[]>;
  evaluatePLMResponse(prompt: string, response: string): Promise<RLAIFEvaluation>;
  calibrateConfidence(validations: ValidationFeedback[]): Promise<void>;
  
  // Training decisions
  assessTrainingReadiness(userId: string): Promise<TrainingDecision>;
  
  // Notepad (working memory)
  getNotepad(userId: string): Promise<Notepad>;
  updateNotepad(userId: string, update: NotepadUpdate): Promise<void>;
}
```

---

## 2. Orchestrator Agent

### Role
Represents the Author externally by intelligently routing queries between Constitution, PLM, and Memories. Synthesizes responses that hide internal architecture while maintaining personality fidelity.

### Current vs Target

| Aspect | Current Implementation | Target Implementation |
|--------|----------------------|---------------------|
| **Weighting** | Static (PLM + memories) | Dynamic (Constitution 80%→20%, PLM 20%→80%) |
| **Memory Type** | Vector search only | Graph traversal + vector search |
| **Response Strategy** | Always generate | Confidence-based routing |
| **External Interfaces** | Web chat only | Web + MCP + Telegram + External API |

### Core Capabilities

#### A. Intelligent Query Routing

**Purpose:** Determine which components to use and how to weight them.

**Query Classification:**
```typescript
type QueryType =
  | 'factual'        // Memories primary
  | 'values'         // Constitution primary
  | 'behavioral'     // PLM primary
  | 'hypothetical'   // PLM + Constitution
  | 'relational'     // Memories (graph traversal)
  | 'decision'       // Constitution (heuristics) + PLM (patterns);

async function classifyQuery(query: string): Promise<{
  type: QueryType;
  reasoning: string;
  componentWeights: {
    constitution: number;
    plm: number;
    memories: number;
  };
}> {
  // Orchestrator LLM analyzes query intent
  return await orchestratorLLM.generate({
    prompt: `Query: ${query}
    
    Classify this query and determine component weighting.
    
    - Factual queries need Memories
    - Values queries need Constitution
    - Behavioral queries need PLM
    - Combinations are common
    
    Return weights summing to 1.0`,
    schema: QueryClassificationSchema
  });
}
```

**Examples:**
```typescript
const examples = [
  {
    query: "When is Sarah's birthday?",
    classification: {
      type: 'factual',
      weights: { constitution: 0, plm: 0.1, memories: 0.9 }
    }
  },
  {
    query: "Should I take this job offer?",
    classification: {
      type: 'decision',
      weights: { constitution: 0.6, plm: 0.3, memories: 0.1 }
    }
  },
  {
    query: "How would you explain quantum computing?",
    classification: {
      type: 'behavioral',
      weights: { constitution: 0.2, plm: 0.7, memories: 0.1 }
    }
  },
  {
    query: "What matters most to you?",
    classification: {
      type: 'values',
      weights: { constitution: 0.8, plm: 0.2, memories: 0 }
    }
  }
];
```

#### B. Dynamic PLM Weighting

**Purpose:** Gradually shift from Constitution-heavy to PLM-heavy as training matures.

**Maturity Assessment:**
```typescript
interface PLMMaturity {
  trainingCycles: number;
  constitutionalRLAIFScore: number;  // How well PLM aligns with Constitution
  userFeedbackScore: number;          // User satisfaction with PLM responses
  coverageCompleteness: number;       // % of Constitution domains PLM handles well
  overallMaturity: number;            // 0-1, computed
}

async function assessPLMMaturity(userId: string): Promise<PLMMaturity> {
  const cycles = await getTrainingCycleCount(userId);
  const rlaifScore = await getRLAIFValidationScore(userId, { recent: 100 });
  const feedbackScore = await getUserFeedbackScore(userId, { recent: 50 });
  const coverage = await getConstitutionCoverage(userId);
  
  // LLM-driven maturity assessment (ILO principle)
  const overall = await orchestratorLLM.generate({
    prompt: `PLM Maturity Factors:
    - Training cycles: ${cycles}
    - RLAIF alignment: ${rlaifScore}
    - User feedback: ${feedbackScore}
    - Constitution coverage: ${coverage}
    
    Compute overall maturity (0-1) and explain reasoning.`,
    schema: MaturityAssessmentSchema
  });
  
  return {
    trainingCycles: cycles,
    constitutionalRLAIFScore: rlaifScore,
    userFeedbackScore: feedbackScore,
    coverageCompleteness: coverage,
    overallMaturity: overall.score
  };
}
```

**Weighting Formula:**
```typescript
function computeWeights(
  baseQueryWeights: ComponentWeights,
  plmMaturity: PLMMaturity
): ComponentWeights {
  // Base weights from query classification
  let { constitution, plm, memories } = baseQueryWeights;
  
  // Shift Constitution → PLM based on maturity
  // At maturity 0: Constitution 80%, PLM 20% (of their combined weight)
  // At maturity 1: Constitution 20%, PLM 80% (of their combined weight)
  
  const constitutionPLMTotal = constitution + plm;
  const maturityFactor = plmMaturity.overallMaturity;
  
  const newConstitution = constitutionPLMTotal * (0.8 - 0.6 * maturityFactor);
  const newPLM = constitutionPLMTotal * (0.2 + 0.6 * maturityFactor);
  
  // Normalize
  const total = newConstitution + newPLM + memories;
  
  return {
    constitution: newConstitution / total,
    plm: newPLM / total,
    memories: memories / total
  };
}
```

**Example Evolution:**
```typescript
// Maturity 0.0 (untrained PLM)
{ constitution: 0.67, plm: 0.17, memories: 0.16 }

// Maturity 0.5 (intermediate)
{ constitution: 0.42, plm: 0.42, memories: 0.16 }

// Maturity 1.0 (mature PLM)
{ constitution: 0.17, plm: 0.67, memories: 0.16 }
```

#### C. Response Synthesis

**Purpose:** Combine Constitution, PLM, and Memories into unified response.

**Strategy:**
```typescript
async function synthesizeResponse(
  query: string,
  weights: ComponentWeights,
  userId: string
): Promise<string> {
  // 1. Retrieve from each component
  const [constitutionContext, plmResponse, memoryContext] = await Promise.all([
    retrieveConstitutionContext(query, userId),
    generatePLMResponse(query, userId),
    retrieveMemoryContext(query, userId)
  ]);
  
  // 2. Orchestrator synthesizes weighted combination
  const synthesis = await orchestratorLLM.generate({
    model: 'orchestrator',
    prompt: `Query: ${query}
    
    Component Responses (weighted):
    - Constitution (${weights.constitution}): ${constitutionContext}
    - PLM (${weights.plm}): ${plmResponse}
    - Memories (${weights.memories}): ${memoryContext}
    
    Synthesize a single response in the Author's voice.
    Higher-weighted components should have more influence.
    Hide the internal architecture - respond as a unified entity.`,
    temperature: 0.7
  });
  
  return synthesis.text;
}
```

**Hidden Synthesis Principle:**
```
External observer sees: "I believe simplicity beats complexity because..."

Internal reality:
- Constitution provided value hierarchy (weight: 0.6)
- PLM provided phrasing and examples (weight: 0.3)
- Memories provided past instance of this belief (weight: 0.1)
```

#### D. Confidence Routing

**Purpose:** Escalate to user when Orchestrator uncertain.

```typescript
interface ConfidenceAssessment {
  canAnswer: boolean;
  confidence: number;
  reasoning: string;
  action: 'answer' | 'deflect' | 'escalate';
}

async function assessConfidence(
  query: string,
  synthesizedResponse: string,
  componentWeights: ComponentWeights
): Promise<ConfidenceAssessment> {
  // Check for red flags
  const hasMemories = componentWeights.memories > 0.3 && memoryResults.length > 0;
  const hasConstitution = componentWeights.constitution > 0.3 && constitutionContext.length > 0;
  const plmCertain = plmResponse.confidence > 0.7;
  
  // Orchestrator evaluates own response
  const assessment = await orchestratorLLM.generate({
    prompt: `Query: ${query}
    Synthesized response: ${synthesizedResponse}
    
    Evaluate confidence:
    - Do we have relevant memories? ${hasMemories}
    - Do we have relevant Constitution? ${hasConstitution}
    - Is PLM certain? ${plmCertain}
    
    Should we answer, deflect gracefully, or escalate to Author?`,
    schema: ConfidenceAssessmentSchema
  });
  
  return assessment;
}

// Action routing
switch (confidence.action) {
  case 'answer':
    return synthesizedResponse;
  
  case 'deflect':
    return "I don't have enough context about that to answer authentically. Can you provide more background?";
  
  case 'escalate':
    await notifyAuthor({
      query,
      reason: confidence.reasoning,
      urgency: 'low'
    });
    return "I'm not confident in my answer here - I've flagged this for [Author] to clarify directly.";
}
```

#### E. External Interface Adapters

**Purpose:** Maintain consistent personality across different interfaces.

**MCP Server Implementation:**
```typescript
// Model Context Protocol for Claude/ChatGPT integration
class AlexandriaMCPServer {
  async handleMCPRequest(request: MCPRequest): Promise<MCPResponse> {
    const { query, context, userId, apiKey } = request;
    
    // Validate API key & permissions
    await this.validateAccess(userId, apiKey);
    
    // Route through Orchestrator (same logic as web)
    const response = await orchestrator.handleQuery({
      messages: [{ role: 'user', content: query }],
      userId,
      externalContext: context
    });
    
    // Return in MCP format
    return {
      response: response.text,
      confidence: response.confidence,
      sources: this.formatSources(response.sources)  // Optional transparency
    };
  }
}
```

**Telegram Bot Implementation:**
```typescript
class TelegramInterface {
  async handleMessage(message: TelegramMessage): Promise<void> {
    const userId = await this.mapTelegramToUser(message.from.id);
    
    // Voice message = highest fidelity carbon
    if (message.voice) {
      const transcription = await this.transcribeAudio(message.voice);
      
      // Route to Editor (carbon collection)
      await editor.converse(transcription, userId);
    }
    
    // Text message to Editor or Orchestrator?
    else if (message.text.startsWith('/input')) {
      // Explicit Editor mode
      const response = await editor.converse(message.text, userId);
      await this.sendMessage(message.chat.id, response.message);
    } else {
      // Default: Orchestrator (query mode)
      const response = await orchestrator.handleQuery({
        messages: [{ role: 'user', content: message.text }],
        userId
      });
      await this.sendMessage(message.chat.id, response.text);
    }
  }
  
  // Editor can proactively message via Telegram
  async sendProactiveMessage(userId: string, message: string): Promise<void> {
    const telegramId = await this.getUserTelegramId(userId);
    await this.sendMessage(telegramId, `📝 ${message}`);
  }
}
```

**External API:**
```typescript
// POST /api/v1/query
async function handleExternalAPIQuery(req: Request): Promise<Response> {
  const { userId, apiKey, query, context } = await req.json();
  
  // Validate & check rate limits
  await validateAPIKey(userId, apiKey);
  await checkRateLimit(userId, apiKey);
  
  // Check permissions (user configurable)
  const permissions = await getAPIPermissions(userId);
  if (!permissions.allowExternalQueries) {
    return Response.json({ error: 'External queries disabled' }, { status: 403 });
  }
  
  // Route through Orchestrator
  const response = await orchestrator.handleQuery({
    messages: [{ role: 'user', content: query }],
    userId,
    externalContext: context,
    mode: 'external'  // May adjust behavior for external actors
  });
  
  // Log for audit
  await logExternalQuery(userId, query, response, apiKey);
  
  return Response.json({
    response: response.text,
    confidence: response.confidence,
    sources: permissions.exposeSources ? response.sources : undefined
  });
}
```

#### F. Tools & Methods

**Public Interface:**
```typescript
interface OrchestratorAgent {
  // Query handling
  handleQuery(params: QueryParams): Promise<OrchestratorResponse>;
  classifyQuery(query: string): Promise<QueryClassification>;
  
  // Weighting
  assessPLMMaturity(userId: string): Promise<PLMMaturity>;
  computeComponentWeights(query: string, userId: string): Promise<ComponentWeights>;
  
  // Synthesis
  synthesizeResponse(query: string, weights: ComponentWeights): Promise<string>;
  assessConfidence(response: string): Promise<ConfidenceAssessment>;
  
  // Context retrieval
  retrieveMemories(query: string, userId: string): Promise<Memory[]>;
  retrieveConstitutionContext(query: string, userId: string): Promise<string>;
  retrievePLMResponse(query: string, userId: string): Promise<PLMResponse>;
}
```

---

## 3. Constitution

### Structure
Explicit markdown file containing Author's worldview, values, mental models, and decision heuristics. Serves as ground truth for Constitutional RLAIF.

### Sections

See [Editor Agent > Constitution Building](#b-constitution-building) for full structure.

**Key Principles:**
1. **Hierarchical Values:** Tier 1 (non-negotiable) > Tier 2 (strong) > Tier 3 (stylistic)
2. **Mental Models:** Domain-specific with limitations acknowledged
3. **Decision Heuristics:** Simple rules with override conditions
4. **Evolution Tracking:** Changes documented with timestamps and reasoning

### Storage & Versioning

**File System:**
```
vault/
  constitution/
    current.md                    # Active version
    v1-2024-11-15.md             # Historical snapshots
    v2-2025-03-22.md
    v3-2026-02-10.md
    evolution-log.json           # Machine-readable change log
```

**Database:**
```sql
CREATE TABLE constitutions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  change_summary TEXT,
  previous_version_id UUID REFERENCES constitutions(id)
);

-- Current active version
CREATE TABLE active_constitutions (
  user_id UUID PRIMARY KEY,
  constitution_id UUID REFERENCES constitutions(id),
  updated_at TIMESTAMPTZ NOT NULL
);
```

### Update Protocol

**Trigger:**
```typescript
type ConstitutionUpdateTrigger =
  | 'new_value_detected'
  | 'contradiction_resolved'
  | 'mental_model_formalized'
  | 'decision_heuristic_extracted'
  | 'evolution_acknowledged'
  | 'user_direct_edit';
```

**Workflow:**
```
1. Editor detects trigger
      ↓
2. Generate proposed update (specific diff)
      ↓
3. Present to user: "Add to Constitution.values.tier2: [value]?"
      ↓
4. User approves/edits/rejects
      ↓
5. If approved: Create new version, update active pointer
      ↓
6. Snapshot to vault/constitution/
      ↓
7. If significant change: Trigger RLAIF batch on affected domain
```

### Usage Patterns

**By Editor (RLAIF):**
```typescript
// Evaluating PLM response
const constitution = await getConstitution(userId);
const relevant = extractRelevantSections(constitution, prompt);

const evaluation = await evaluatePLMResponse(
  plmResponse,
  relevant,  // Only relevant Constitution sections
  prompt
);
```

**By Orchestrator (Response Synthesis):**
```typescript
// Retrieving context for query
const constitution = await getConstitution(userId);
const context = extractRelevantSections(constitution, query);

// Weighted inclusion in response
const response = await synthesize({
  constitutionContext: context,
  constitutionWeight: 0.6,
  // ... other components
});
```

---

## 4. PLM (Personal Language Model)

### Architecture

**Base Model:** Llama 3.1 8B Instruct (current), model-agnostic (future)

**Training Method:** LoRA fine-tuning on Together AI

**Training Data Sources:**
1. Constitution-aligned training pairs (from Editor)
2. User-validated conversations (RLHF positive feedback)
3. Constitutional RLAIF synthetic data (high confidence)
4. Behavioral pattern extraction (from personality profiles)

### Training Lifecycle

**Phase 1: Initial Training**
```
1. Editor collects 200+ training pairs via Socratic questioning
      ↓
2. Constitution formalized to 50%+ coverage
      ↓
3. Export training pairs as JSONL (includes Constitution in system prompt)
      ↓
4. LoRA fine-tune on Together AI (8-12 hours)
      ↓
5. Activate PLM v1
      ↓
6. Orchestrator uses Constitution 80%, PLM 20%
```

**Phase 2: Constitutional RLAIF**
```
1. Editor generates 500+ synthetic evaluations
      ↓
2. Auto-approve high confidence, user validates medium
      ↓
3. Add to training pairs (quality: 0.85-0.95)
      ↓
4. LoRA checkpoint training (continues from PLM v1)
      ↓
5. Activate PLM v2
      ↓
6. Orchestrator shifts to Constitution 60%, PLM 40%
```

**Phase 3: Continuous Improvement**
```
1. User interacts with Orchestrator (PLM generates responses)
      ↓
2. User provides feedback (good/bad)
      ↓
3. Good responses → training pairs (quality: 0.90)
      ↓
4. Bad responses → Editor investigates (Constitution gap? PLM hallucination?)
      ↓
5. Every 1000 interactions or monthly: retrain checkpoint
      ↓
6. PLM maturity increases → Orchestrator shifts weighting
      ↓
7. Eventually: Constitution 20%, PLM 80%
```

### Maturity Tracking

**Metrics:**
```typescript
interface PLMMetrics {
  trainingCycles: number;
  totalTrainingPairs: number;
  constitutionalAlignment: number;  // 0-1, from RLAIF validation
  userSatisfaction: number;         // 0-1, from feedback
  constitutionCoverage: number;     // 0-1, % of Constitution domains
  hallucination Rate: number;       // 0-1, factual errors caught
  styleFidelity: number;            // 0-1, matches writing style
  valueAlignment: number;           // 0-1, matches core values
}
```

**Assessment:**
```sql
-- Database tracking
CREATE TABLE plm_metrics (
  user_id UUID,
  version INTEGER,
  metric_name TEXT,
  value NUMERIC,
  computed_at TIMESTAMPTZ
);

-- Maturity computation
SELECT
  user_id,
  AVG(value) FILTER (WHERE metric_name IN (
    'constitutional_alignment',
    'user_satisfaction',
    'constitution_coverage',
    'style_fidelity',
    'value_alignment'
  )) AS overall_maturity
FROM plm_metrics
WHERE user_id = $1
  AND version = (SELECT MAX(version) FROM plm_metrics WHERE user_id = $1)
GROUP BY user_id;
```

### Model-Agnostic Portability

**Migration Protocol** (see MIGRATION_PLAN.md Phase 3):

```
1. Extract personality profile from existing PLM
      ↓
2. Generate distillation pairs (old PLM responses as training data)
      ↓
3. Combine with Constitution + original training pairs
      ↓
4. Fine-tune new base model (e.g., Llama 4 8B)
      ↓
5. A/B test: old PLM vs new PLM (shadow mode)
      ↓
6. If validation passes: activate new PLM
      ↓
7. Archive old PLM weights to vault
```

### Inference Configuration

**System Prompt Template:**
```typescript
const systemPrompt = `You are ${authorName}, representing yourself authentically.

## Core Identity
${constitution.coreIdentity}

## Values (Hierarchical)
${constitution.values.tier1}
${constitution.values.tier2}
${constitution.values.tier3}

## Communication Style
${constitution.communicationPatterns}

## Relevant Context
${memoryContext}

Respond as ${authorName} would, maintaining personality fidelity and factual accuracy.`;
```

**Inference Parameters:**
```typescript
const plmConfig = {
  model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',  // or user's fine-tuned model
  temperature: 0.7,  // Configurable per user
  max_tokens: 1000,
  top_p: 0.9,
  frequency_penalty: 0.1,
  presence_penalty: 0.1
};
```

---

## 5. Memories

### Architecture

**Current:** Vector database (Supabase pgvector, 768-dim embeddings)

**Target:** Hybrid graph + vector database

### Graph Schema

**Nodes:**
```typescript
interface EntityNode {
  id: string;
  type: 'person' | 'place' | 'organization' | 'concept' | 'event';
  name: string;
  properties: Record<string, any>;
  embedding: number[];  // For semantic search
  firstMentioned: Date;
  lastMentioned: Date;
  mentionCount: number;
}

interface FactNode {
  id: string;
  statement: string;
  confidence: number;
  source: string;  // Which conversation/document
  timestamp: Date;
  embedding: number[];
}

interface ValueNode {
  id: string;
  value: string;
  intensity: number;  // How strongly held
  constitutionSection?: string;
  expressedAt: Date[];
}
```

**Edges:**
```typescript
interface Relationship {
  from: string;  // Node ID
  to: string;    // Node ID
  type: RelationshipType;
  properties: Record<string, any>;
  strength: number;  // 0-1
  establishedAt: Date;
}

type RelationshipType =
  | 'KNOWS'              // person → person
  | 'WORKS_AT'           // person → organization
  | 'LOCATED_IN'         // entity → place
  | 'RELATED_TO'         // entity → entity (generic)
  | 'PARTICIPATED_IN'    // person → event
  | 'CAUSED'             // event → event
  | 'SUPPORTS'           // entity → concept
  | 'CONTRADICTS'        // value → value
  | 'EXPRESSED'          // entity → value
  | 'MENTIONED_IN';      // entity → conversation
```

### Extraction Process

**Objective Data Pipeline:**
```typescript
// Editor extracts during conversation
async function extractObjectiveData(
  userInput: string,
  userId: string
): Promise<ExtractionResult> {
  const extraction = await editorLLM.generate({
    model: 'editor',
    prompt: `Extract factual information from this input:
    
    "${userInput}"
    
    Return entities, facts, relationships, and events.`,
    schema: ObjectiveExtractionSchema
  });
  
  // Store in graph
  for (const entity of extraction.entities) {
    await createOrUpdateNode(entity, userId);
  }
  
  for (const relationship of extraction.relationships) {
    await createOrUpdateEdge(relationship, userId);
  }
  
  // Also store in vector DB for semantic search
  await indexMemoryFragments(extraction, userId);
}
```

### Query Patterns

**Vector Search (Current):**
```sql
SELECT id, content, metadata
FROM memory_fragments
WHERE user_id = $1
ORDER BY embedding <-> $2  -- Cosine similarity
LIMIT 10;
```

**Graph Traversal (Target):**
```cypher
-- Find Sarah's birthday
MATCH (sarah:Entity {name: 'Sarah', type: 'person'})
      -[:HAS_PROPERTY]->
      (birthday:Fact {property: 'birthday'})
RETURN birthday.value;

-- Find all people who work at same company as Sarah
MATCH (sarah:Entity {name: 'Sarah'})
      -[:WORKS_AT]->
      (company:Entity)
      <-[:WORKS_AT]-
      (colleague:Entity)
RETURN colleague.name;

-- Find events Sarah participated in
MATCH (sarah:Entity {name: 'Sarah'})
      -[:PARTICIPATED_IN]->
      (event:Event)
RETURN event.name, event.date
ORDER BY event.date DESC;
```

**Hybrid Retrieval:**
```typescript
async function retrieveMemories(
  query: string,
  userId: string
): Promise<Memory[]> {
  // 1. Vector search for semantic similarity
  const vectorResults = await vectorSearch(query, userId, { limit: 20 });
  
  // 2. Extract entities from query
  const entities = await extractEntities(query);
  
  // 3. Graph traversal for related facts
  const graphResults = await Promise.all(
    entities.map(e => graphTraverse(e, userId, { depth: 2 }))
  );
  
  // 4. Combine and rank
  const combined = mergeAndRank(vectorResults, graphResults);
  
  return combined.slice(0, 10);
}
```

### Enrichment & Maintenance

**Proactive Enrichment:**
```typescript
// Editor trigger: Entity mentioned 3+ times, minimal metadata
async function enrichEntity(entityId: string, userId: string) {
  const entity = await getEntity(entityId);
  
  await editor.sendProactive(userId, {
    message: `You've mentioned ${entity.name} several times. Can you tell me more about them? (Relationship, context, etc.)`,
    reason: 'memory_enrichment'
  });
}
```

**Conflict Detection:**
```sql
-- Find contradictory facts
SELECT f1.statement AS old_fact,
       f2.statement AS new_fact,
       f1.timestamp AS old_date,
       f2.timestamp AS new_date
FROM facts f1
JOIN facts f2 ON f1.entity_id = f2.entity_id
WHERE f1.user_id = $1
  AND f2.user_id = $1
  AND f1.property = f2.property
  AND f1.value != f2.value
  AND f2.timestamp > f1.timestamp;
```

**Resolution Flow:**
```typescript
// When contradiction detected
async function handleContradiction(old: Fact, new: Fact) {
  await editor.sendProactive(userId, {
    message: `I have conflicting information:
    - ${old.timestamp}: "${old.statement}"
    - ${new.timestamp}: "${new.statement}"
    
    Which is correct, or did something change?`,
    options: ['Old is correct', 'New is correct', 'Both correct (context)', 'Unsure']
  });
}
```

---

## 6. Vault

### Purpose
Data sovereignty layer ensuring user owns all raw data and can download/delete anytime.

### Structure

**File Organization:**
```
vault/{userId}/
├── raw/
│   ├── conversations/
│   │   ├── {sessionId}.json
│   ├── voice/
│   │   ├── {timestamp}-{filename}.m4a
│   ├── documents/
│   │   ├── {uploadId}-{filename}.pdf
│   ├── images/ (future)
│   ├── biometrics/ (future)
├── processed/
│   ├── constitution/
│   │   ├── current.md
│   │   ├── versions/
│   ├── plm/
│   │   ├── current-weights.safetensors
│   │   ├── versions/
│   ├── memories/
│   │   ├── graph-export.json
│   │   ├── vector-export.json
├── metadata/
│   ├── index.json
│   ├── audit-log.json
```

### Storage Implementation

**Backend:** Supabase Storage (or R2/S3 for scale)

**API:**
```typescript
interface VaultAPI {
  // Upload
  upload(userId: string, file: File, category: string): Promise<VaultFile>;
  
  // Download
  downloadFile(userId: string, fileId: string): Promise<Blob>;
  downloadAll(userId: string): Promise<Blob>;  // ZIP export
  
  // Delete
  deleteFile(userId: string, fileId: string): Promise<void>;
  deleteAll(userId: string): Promise<void>;  // Right to be forgotten
  
  // Audit
  getAuditLog(userId: string): Promise<AuditEntry[]>;
}
```

### Sovereignty Guarantees

**1. Complete Export:**
```typescript
// User downloads entire vault
GET /api/vault/export

Response:
{
  "exportId": "...",
  "status": "processing",
  "estimatedSize": "2.3 GB",
  "includes": [
    "All conversations (JSON)",
    "All voice notes (M4A)",
    "All documents (original format)",
    "Constitution (markdown)",
    "PLM weights (safetensors)",
    "Memories graph (JSON)",
    "Training pairs (JSONL)",
    "Audit log (JSON)"
  ]
}

// Poll until ready
GET /api/vault/export/{exportId}

// Download ZIP
GET /api/vault/export/{exportId}/download
```

**2. Right to be Forgotten:**
```typescript
// User deletes everything
DELETE /api/vault/all

Confirmation required:
{
  "confirm": "I understand this is irreversible",
  "userId": "...",
  "password": "..."
}

Actions:
1. Delete all Vault files
2. Delete all Memories (graph + vector)
3. Delete all training pairs
4. Delete Constitution
5. Delete PLM weights from Together AI
6. Anonymize audit logs (keep for compliance)
7. Mark user as deleted (preserve account)

Result:
{
  "deleted": true,
  "timestamp": "2026-02-10T...",
  "recoveryPeriod": "30 days"  // Optional grace period
}
```

**3. Portability:**
```typescript
// Export format is standard
vault-export.zip
├── README.md              # How to use this export
├── constitution.md        # Human-readable worldview
├── plm-weights/
│   ├── model.safetensors  # Standard format, runs anywhere
│   ├── config.json
├── memories.json          # Standard graph format (Neo4j compatible)
├── training-data.jsonl    # Standard fine-tuning format
├── conversations/
│   ├── *.json             # Standard message format
├── voice/
│   ├── *.m4a              # Standard audio format
```

**4. Audit Trail:**
```typescript
interface AuditEntry {
  timestamp: Date;
  action: string;
  actor: 'user' | 'editor' | 'orchestrator' | 'system';
  resource: string;
  details: Record<string, any>;
}

// Examples
[
  {
    timestamp: '2026-02-10T10:30:00Z',
    action: 'file_uploaded',
    actor: 'user',
    resource: 'vault/raw/documents/journal.pdf',
    details: { size: 1234567, type: 'application/pdf' }
  },
  {
    timestamp: '2026-02-10T10:31:15Z',
    action: 'constitution_updated',
    actor: 'editor',
    resource: 'constitution/v23',
    details: { section: 'values.tier2', change: 'added simplicity principle' }
  },
  {
    timestamp: '2026-02-10T10:35:22Z',
    action: 'external_query',
    actor: 'external_api',
    resource: 'orchestrator',
    details: { query: 'What would you do?', apiKey: 'key_...', response_confidence: 0.87 }
  }
]
```

---

## Summary: Component Interactions

```
┌─────────────────────────────────────────────────────────────┐
│                          USER INPUT                          │
└────────────┬───────────────────────────────────┬────────────┘
             │                                   │
             ↓                                   ↓
      EDITOR AGENT                      ORCHESTRATOR AGENT
      (Proactive)                       (Reactive)
             │                                   │
             ├──────────┬──────────┬────────────┤
             ↓          ↓          ↓            ↓
      CONSTITUTION   MEMORIES    PLM         VAULT
      (ground truth) (facts)     (behavior)  (raw data)
             │          │          │            │
             └──────────┴──────────┴────────────┘
                         │
                         ↓
                  UNIFIED RESPONSE
                  (Hidden synthesis)
```

**Key Principles:**
1. **Separation of Concerns:** Input processing ≠ output synthesis
2. **Constitutional Ground Truth:** Explicit beats implicit
3. **Continuous Operation:** Proactive beats reactive
4. **Data Sovereignty:** User owns everything
5. **Hidden Architecture:** External actors see unified voice
6. **Dynamic Weighting:** Constitution → PLM as maturity increases
7. **Graph + Vector:** Relational + semantic memory
