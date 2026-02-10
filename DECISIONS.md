# Alexandria Architecture Decisions

> **Last Updated:** 2026-02-10  
> **Purpose:** Document the "why" behind key architectural choices

---

## Table of Contents

1. [Why Constitution as Explicit File](#1-why-constitution-as-explicit-file)
2. [Why Constitutional RLAIF](#2-why-constitutional-rlaif)
3. [Why Graph Database for Memories](#3-why-graph-database-for-memories)
4. [Why Continuous Agents](#4-why-continuous-agents)
5. [Why Telegram Option](#5-why-telegram-option)
6. [Why Gradual PLM Weighting](#6-why-gradual-plm-weighting)
7. [Why Data Sovereignty Matters](#7-why-data-sovereignty-matters)
8. [Why Separate Editor and Orchestrator](#8-why-separate-editor-and-orchestrator)
9. [Why Hidden Synthesis](#9-why-hidden-synthesis)
10. [Why Model-Agnostic Design](#10-why-model-agnostic-design)

---

## 1. Why Constitution as Explicit File

### The Problem
Most personal AI systems rely on implicit personality captured in training data. When the PLM makes a mistake, there's no ground truth to evaluate against—just "it feels wrong."

### Alternatives Considered

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Implicit in weights** | Simple, no extra work | No ground truth, can't audit, hard to update | ❌ Current limitation |
| **System prompt only** | Easy to update | Not comprehensive, conflicts with weights, shallow | ❌ Insufficient |
| **Explicit Constitution file** | Ground truth, auditable, portable, human-readable | Requires extraction work, needs maintenance | ✅ **Chosen** |
| **Database-only storage** | Structured, queryable | Not human-readable, not portable | ❌ Doesn't serve user sovereignty |

### Why Explicit Constitution Wins

**1. Ground Truth for RLAIF**
```
Without Constitution:
PLM response → "Does this feel right?" → Subjective, inconsistent

With Constitution:
PLM response → "Does this match Constitution.values.tier1?" → Objective, consistent
```

**2. Auditability**
Users can **read their Constitution** and verify accuracy. Implicit personality is a black box.

```markdown
# Bad (Implicit)
"The model thinks I value honesty, I think?"

# Good (Explicit)
## Values - Tier 1 (Non-Negotiable)
- **Truth over comfort**: Will deliver hard truths even if it hurts feelings
```

**3. Portability**
When migrating to Llama 4 (or any new base model), Constitution transfers instantly. Weights take 8+ hours to retrain.

**4. Human-Readable Evolution**
```markdown
## Evolution Notes
### 2026-02-10: Updated stance on privacy
**What changed**: Added "privacy > convenience" to Tier 2 values
**Why**: Realized most apps trade convenience for surveillance
**Old state**: No explicit privacy principle
**New state**: Privacy is strong preference, but not absolute (Tier 2)
```

Users can **see how they've evolved**. Weights don't provide this.

**5. Enables Constitutional RLAIF**
The entire RLAIF methodology depends on explicit ground truth. Without Constitution as a file, synthetic evaluation is just "does this sound good?" With Constitution, it's "does this align with Author's documented values?"

### Code Example

**Without Constitution (Current):**
```typescript
// RLAIF has no ground truth
const evaluation = await evaluatePLMResponse(prompt, response);
// Returns: { score: 0.7, reasoning: "seems good?" }
```

**With Constitution (Target):**
```typescript
// RLAIF references Constitution
const constitution = await getConstitution(userId);
const evaluation = await evaluatePLMResponse(prompt, response, constitution);
// Returns: { 
//   score: 0.9, 
//   reasoning: "Response matches values.tier1.truth_over_comfort and uses mental_models.first_principles correctly",
//   constitutionSections: ["values.tier1", "mental_models.first_principles"]
// }
```

### Objections Addressed

**"Constitution will get out of sync with weights"**
- That's the point! Constitution is ground truth. Weights are cache. When they diverge, we retrain weights to match Constitution, not vice versa.

**"Users won't want to formalize their worldview"**
- True for generic AI apps. Not true for Alexandria. Our users are optimizing for fidelity, not convenience. Explicit > implicit.

**"Too much maintenance"**
- Constitution updates are rare. Core values don't change weekly. Mental models might be added monthly. This is manageable.

---

## 2. Why Constitutional RLAIF

### The Problem
Traditional RLHF requires massive human feedback. Limited feedback = limited training data = slow PLM improvement.

### Alternatives Considered

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **RLHF only** | Simple, battle-tested | Requires tons of human feedback, slow scaling | ❌ Doesn't scale |
| **Generic RLAIF** | Scales feedback via LLM | No personalization, crowd preferences leak in | ❌ Loses personality |
| **Constitutional RLAIF** | Scales feedback using user's own values | Requires Constitution, more complex | ✅ **Chosen** |
| **No feedback loop** | No extra work | PLM never improves | ❌ Non-starter |

### Why Constitutional RLAIF Wins

**1. Personalized Ground Truth**
```
Generic RLAIF: "Would most people approve of this response?"
↓
Crowd preferences (not Author's personality)

Constitutional RLAIF: "Does this match the Author's Constitution?"
↓
Author's actual values (personality preserved)
```

**2. Scales Feedback 10-100x**
```
Human feedback: 1 response per minute (limited by user time)
Constitutional RLAIF: 1000 responses per hour (limited by API rate)

Result: 10,000+ synthetic evaluations from 100 human feedbacks
```

**3. Confidence Routing Catches Errors**
```
High confidence (0.8+): Auto-approve
↓
Most synthetic ratings are correct, scale training data

Medium confidence (0.6-0.8): Flag for spot-check
↓
User validates sample, Editor learns calibration

Low confidence (<0.6): Queue for user review
↓
Uncertain cases become explicit Constitution updates
```

**4. Different Models (No Self-Reinforcement)**
```
Editor (Groq llama-3.3-70b) evaluates PLM (Together AI llama-3.1-8b)
↓
Different models = no echo chamber
↓
As Groq releases better models, RLAIF quality improves automatically
```

**5. Closes the Loop**
```
Constitution gaps detected
↓
Generate prompts targeting gaps
↓
PLM responds
↓
Editor evaluates against Constitution
↓
High-quality responses → training data
Low-quality responses → Constitution refinement
↓
PLM retrains with Constitutional alignment
↓
Cycle repeats, PLM internalizes Constitution
```

### Code Example

**Generic RLAIF (Not Used):**
```typescript
const evaluation = await genericLLM.evaluate(plmResponse);
// Uses generic LLM's values (OpenAI/Anthropic crowd preferences)
// Result: PLM starts sounding like ChatGPT
```

**Constitutional RLAIF (Chosen):**
```typescript
const constitution = await getConstitution(userId);
const evaluation = await editorLLM.evaluate(plmResponse, constitution);
// Uses Author's Constitution as ground truth
// Result: PLM internalizes Author's actual personality
```

### Objections Addressed

**"LLM evaluator will have biases"**
- Yes, but we calibrate via user validation. When user disagrees with Editor evaluation, Editor learns. Over time, Editor gets better at evaluating this specific Author.

**"Synthetic data might be lower quality"**
- We track quality scores. High-confidence synthetic data (0.9+) is often better than casual human feedback because it's explicitly Constitutional. Low-confidence synthetic data is rejected.

**"This is complex"**
- Complexity is in the infrastructure, not the user experience. User just gives binary feedback occasionally. System does the scaling work.

---

## 3. Why Graph Database for Memories

### The Problem
Vector databases are great for semantic search ("find similar content") but terrible for relationships ("who works with Sarah?").

### Alternatives Considered

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Vector DB only** | Simple, fast semantic search | Can't traverse relationships, loses context | ❌ Current limitation |
| **Graph DB only** | Perfect for relationships | Semantic search awkward, slower | ❌ Missing semantic capability |
| **Hybrid (Graph + Vector)** | Best of both worlds | More complex, dual storage | ✅ **Chosen** |
| **SQL with joins** | Familiar, battle-tested | Complex queries, not built for graphs | ❌ Wrong tool for job |

### Why Hybrid Graph + Vector Wins

**1. Different Query Types Need Different Structures**

```
Semantic Query: "What did Sarah say about AI?"
↓ Vector search (embeddings)
↓ Returns similar content regardless of relationships

Relational Query: "Who works with Sarah?"
↓ Graph traversal (edges)
↓ Returns connected entities

Hybrid Query: "People Sarah works with who mentioned AI"
↓ Graph traversal (Sarah's colleagues) + Vector filter (mentioned AI)
↓ Returns precise, context-aware results
```

**2. Graph Enables Future GraphRAG**
```
Current: Vector RAG
Query → Find similar chunks → Context

Future: Graph RAG
Query → Traverse entity graph → Follow relationships → Rich context
Example: "Sarah's career arc" 
→ Sarah WORKS_AT companies (chronological)
→ Sarah PARTICIPATED_IN projects
→ Sarah KNOWS colleagues (network over time)
```

**3. Conflict Detection**
```
Vector DB:
- "Sarah's birthday is March 15"
- "Sarah's birthday is May 20"
→ Both stored, no way to detect conflict

Graph DB:
Sarah HAS_PROPERTY birthday="March 15" (timestamp: 2024-01-01)
Sarah HAS_PROPERTY birthday="May 20" (timestamp: 2026-02-10)
→ Conflict detected! Editor asks: "Which is correct?"
```

**4. Enrichment Opportunities**
```
Graph analysis:
- Sarah mentioned 10 times, but only 2 properties
→ Trigger: "Tell me more about Sarah"

- Alice KNOWS Sarah, Bob KNOWS Sarah, but no Alice-Bob edge
→ Trigger: "Do Alice and Bob know each other?"
```

**5. Contextual Recall**
```
Vector-only: "Sarah" → All mentions of Sarah (flat)

Graph: "Sarah" → 
  - Sarah WORKS_AT TechCorp
  - Sarah KNOWS [Alice, Bob, Charlie]
  - Sarah PARTICIPATED_IN [Project X, Event Y]
  - Sarah HAS_PROPERTY birthday="March 15"
→ Rich, structured context
```

### Code Example

**Vector Only (Current):**
```typescript
const results = await vectorSearch("Sarah's job", userId);
// Returns: ["Sarah works at TechCorp", "Sarah mentioned her job", ...]
// No structure, can't ask "Where does Sarah work?" reliably
```

**Hybrid Graph + Vector (Target):**
```typescript
// Relational query
const job = await graphTraverse({
  start: "Sarah",
  relationship: "WORKS_AT",
  userId
});
// Returns: { entity: "TechCorp", confidence: 1.0, established: "2024-01-15" }

// Semantic query
const mentions = await vectorSearch("Sarah job", userId);
// Returns: Conversations where Sarah's job was discussed

// Hybrid query
const colleagues = await hybridRetrieve({
  query: "Sarah's colleagues who mentioned AI",
  userId
});
// Graph: Sarah WORKS_AT company ← WORKS_AT colleagues
// Vector: Filter colleagues by "mentioned AI"
// Returns: [Alice, Bob] with context
```

### Objections Addressed

**"Graph databases are overkill"**
- For generic chatbots, yes. For personal cognition with years of data and complex relationships, no. We're building for terminal state, not MVP limitations.

**"Dual storage is complex"**
- True, but the complexity is abstracted. User never sees "graph vs vector." They just get better recall.

**"Why not just better prompting on vector results?"**
- You can't prompt your way out of missing structure. "Who does Sarah know?" requires explicit KNOWS edges. Vector search returns "Sarah and Alice were mentioned together" which could mean anything.

---

## 4. Why Continuous Agents

### The Problem
Reactive agents wait for user input. This misses opportunities for proactive extraction and improvement.

### Alternatives Considered

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Reactive only** | Simple, deterministic | Misses opportunities, passive | ❌ Current limitation |
| **Scheduled batch jobs** | Proactive, simple | Not context-aware, spammy | ❌ Poor UX |
| **Continuous agents** | Proactive, intelligent, context-aware | Complex, requires triggers | ✅ **Chosen** |
| **Real-time streaming** | Instant, always on | Expensive, overkill | ❌ Over-engineered |

### Why Continuous Agents Win

**1. Catch Constitution Gaps in Real-Time**
```
Reactive:
User: "I hate when people interrupt me"
Editor: [processes, stores]
↓ Gap exists, never caught

Continuous:
User: "I hate when people interrupt me" (3rd mention)
↓ Editor detects pattern
Editor: "I notice you mention interruptions often. Should we formalize this in your Constitution under communication preferences?"
```

**2. Proactive Training Opportunities**
```
Reactive:
PLM validation low on humor → Nothing happens

Continuous:
PLM validation low on humor
↓ Editor detects automatically
↓ Generates 20 humor prompts
↓ Runs Constitutional RLAIF batch
↓ PLM improves without user needing to notice
```

**3. Memory Enrichment**
```
Reactive:
User: "Sarah said..."
Editor: [stores mention of Sarah]
↓ Sarah has minimal metadata forever

Continuous:
User mentions Sarah (5th time)
↓ Editor notices Sarah entity is sparse
Editor: "You mention Sarah often. Tell me about her - how do you know her?"
↓ Sarah entity gets enriched relationships
```

**4. Consistency Checks**
```
Reactive:
User: "Honesty matters most" (contradicts earlier "Kindness matters most")
↓ Contradiction stored, never caught

Continuous:
User: "Honesty matters most"
↓ Editor checks Constitution
↓ Detects conflict
Editor: "You just said honesty matters most, but your Constitution says kindness. Has your view evolved?"
```

**5. Temporal Awareness**
```
Continuous agent can track:
- "User hasn't interacted in 7 days" → Send check-in
- "PLM trained 30 days ago" → Assess readiness for retraining
- "Constitution last updated 60 days ago" → Review and refresh
```

### Code Example

**Reactive (Current):**
```typescript
// Editor waits for HTTP request
export async function POST(req: Request) {
  const { message, userId } = await req.json();
  const response = await editor.converse(message, userId);
  return Response.json(response);
}
// Only acts when user initiates
```

**Continuous (Target):**
```typescript
// Background worker runs every minute
export async function continuousAgentWorker() {
  const triggers = await detectTriggers();
  // [
  //   { type: 'constitution_gap', data: { topic: 'privacy', frequency: 4 } },
  //   { type: 'training_opportunity', data: { domain: 'humor', score: 0.65 } },
  //   { type: 'memory_enrichment', data: { entity: 'Sarah', mentions: 8 } }
  // ]
  
  for (const trigger of triggers) {
    if (trigger.silent) {
      // Background action (e.g., run RLAIF)
      await handleSilently(trigger);
    } else {
      // Proactive message
      await queueMessage(trigger);
    }
  }
}
```

### Objections Addressed

**"Users will find proactive messages annoying"**
- We're optimizing for fidelity, not engagement. If a message improves Constitution accuracy, it's valuable. Plus, we rate-limit (max 1 proactive message per day).

**"Continuous operation is expensive"**
- Trigger detection is cheap (database queries, not LLM calls). We only call LLMs when we decide to act. Cost is minimal compared to value.

**"This feels creepy/invasive"**
- The agent is **you**. It's not surveillance, it's self-reflection. If asking "Have your views on X changed?" feels creepy, the system isn't for you.

---

## 5. Why Telegram Option

### The Problem
Web apps require intentional visiting. Voice notes are highest-fidelity carbon input, but recording in a web browser is awkward.

### Alternatives Considered

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Web only** | Full control, rich UI | Requires intentional visiting, voice awkward | ❌ Friction for best input |
| **Native app** | Great UX | High development cost, platform-specific | ❌ Not termium |
| **Telegram bot** | Voice native, ubiquitous, async, free | Limited UI, bot API constraints | ✅ **Chosen** |
| **WhatsApp** | Even more ubiquitous | API restrictive, business account required | ❌ Not viable |
| **SMS** | Universal | No voice, expensive, limited | ❌ Wrong medium |

### Why Telegram Wins

**1. Voice Messages Are Native**
```
Web app: Click record → Allow permissions → Record → Stop → Upload
Telegram: Hold button → Talk → Release

Telegram voice UX is 10x better.
```

**2. Async = Continuous Agent Pattern**
```
Reactive web app:
User visits → Interacts → Leaves
↓ Editor only acts during visit

Telegram:
User available 24/7 → Editor sends proactive messages → User responds when convenient
↓ Editor can initiate, not just respond
```

**3. Already in User's Workflow**
```
User already checks Telegram daily (probably hourly).
No need to remember "visit Alexandria website."
Carbon input becomes effortless.
```

**4. Multiple Interface Options**
```
User chooses:
- Deep session → Web (rich UI, Constitution editing)
- Quick voice note → Telegram
- External query → MCP (Claude/ChatGPT)

Same backend, different interfaces for different contexts.
```

**5. Proactive Messages Work**
```
Web: Editor detects Constitution gap → User needs to visit to see notification
Telegram: Editor detects Constitution gap → Sends message immediately → User responds from phone

Telegram = enables true continuous agent behavior.
```

### Code Example

**Web Voice Recording (Awkward):**
```typescript
// User flow:
// 1. Click "Record"
// 2. Browser asks permission
// 3. User allows
// 4. User speaks
// 5. User clicks "Stop"
// 6. File uploads
// 7. Processing happens

// Code:
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const recorder = new MediaRecorder(stream);
// ... more complexity
```

**Telegram Voice (Effortless):**
```typescript
// User flow:
// 1. Hold microphone button
// 2. Speak
// 3. Release

// Code (on our side):
async function handleTelegramVoice(message: TelegramMessage) {
  const audio = await downloadTelegramFile(message.voice.file_id);
  const transcription = await transcribe(audio);
  await editor.converse(transcription, userId);
}
```

### Objections Addressed

**"Telegram is less private than self-hosted"**
- True, but voice notes are transcribed and stored in Alexandria's Vault (user-controlled). Telegram is just the transport. Users who want full privacy can use web-only mode.

**"Why not Signal?"**
- Signal's bot API is even more restrictive. Telegram has better bot ecosystem and voice message support.

**"Users might not want to mix personal chat with AI"**
- Create a separate Telegram account just for Alexandria. Or use web-only. It's optional.

---

## 6. Why Gradual PLM Weighting

### The Problem
How should Orchestrator balance Constitution (explicit rules) vs PLM (learned behavior) when generating responses?

### Alternatives Considered

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Constitution only** | Always accurate to written values | Robotic, misses learned nuance | ❌ Insufficient |
| **PLM only** | Natural, fluid responses | No ground truth, can drift | ❌ Risky |
| **Fixed 50/50** | Simple, balanced | Ignores PLM maturity | ❌ Suboptimal |
| **Gradual shift (80%→20%)** | Adapts to PLM quality, preserves safety net | Complex weighting logic | ✅ **Chosen** |

### Why Gradual Weighting Wins

**1. PLM Starts Untrained**
```
Initial state:
- PLM has no fine-tuning
- Constitution is comprehensive
- Weighting: 80% Constitution, 20% base model behavior

Result: Responses are Constitutional but slightly generic.
Better than untrained PLM alone.
```

**2. PLM Improves Over Time**
```
After 5 training cycles:
- PLM has internalized some Constitution
- Still makes mistakes occasionally
- Weighting: 60% Constitution, 40% PLM

Result: PLM adds personality, Constitution catches errors.
```

**3. Mature PLM Takes Over**
```
After 20 training cycles:
- PLM consistently aligns with Constitution
- Validation score: 0.9+
- Weighting: 20% Constitution, 80% PLM

Result: PLM is primary, Constitution is safety net.
```

**4. Query Type Matters**
```
Even with mature PLM:
- Values question: "What matters most to you?"
  → Constitution 60%, PLM 40% (values are explicit)

- Behavioral question: "How would you explain X?"
  → Constitution 20%, PLM 80% (behavior is learned)

- Factual question: "When is Sarah's birthday?"
  → Memories 90%, Constitution 0%, PLM 10% (facts aren't in either)
```

**5. Maturity Regression Detection**
```
If PLM validation score drops (e.g., after model migration):
↓ Automatically shift back to Constitution-heavy
↓ Weighting: 70% Constitution, 30% PLM
↓ Retrain PLM with more Constitutional data
↓ Validation improves
↓ Gradually shift back to PLM-heavy
```

### Code Example

**Fixed Weighting (Not Used):**
```typescript
const weights = { constitution: 0.5, plm: 0.5, memories: 0.0 };
// Always 50/50, regardless of PLM quality or query type
```

**Gradual Weighting (Chosen):**
```typescript
async function computeWeights(query: string, userId: string) {
  // 1. Assess PLM maturity
  const maturity = await assessPLMMaturity(userId); // 0-1
  
  // 2. Classify query type
  const type = await classifyQuery(query); // 'values' | 'behavioral' | 'factual'
  
  // 3. Base weights from query type
  let { constitution, plm, memories } = getBaseWeights(type);
  
  // 4. Apply maturity adjustment
  // At maturity 0: Constitution 80%, PLM 20%
  // At maturity 1: Constitution 20%, PLM 80%
  const constitutionPLMTotal = constitution + plm;
  constitution = constitutionPLMTotal * (0.8 - 0.6 * maturity);
  plm = constitutionPLMTotal * (0.2 + 0.6 * maturity);
  
  // 5. Normalize
  const total = constitution + plm + memories;
  return {
    constitution: constitution / total,
    plm: plm / total,
    memories: memories / total
  };
}
```

### Objections Addressed

**"Why not just use Constitution until PLM is perfect?"**
- "Perfect" never arrives. PLM adds learned nuance that Constitution can't capture (e.g., subtle humor timing, tangent patterns). We want both working together.

**"How do we know when PLM is mature?"**
- LLM-driven maturity assessment (ILO principle). Editor evaluates based on Constitutional alignment, user feedback, coverage, and hallucination rate. As base models improve, assessment improves automatically.

**"What if PLM drifts after maturity?"**
- We continuously monitor validation scores. If PLM starts misaligning, weighting automatically shifts back to Constitution-heavy until retraining fixes it.

---

## 7. Why Data Sovereignty Matters

### The Problem
Users entrust us with intimate cognition data. Lock-in is betrayal. Frontier labs prove this: users can't leave even when they want to.

### Alternatives Considered

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Platform lock-in** | Higher retention, more control | User hostage, unethical | ❌ Wrong path |
| **Export on request** | Appears sovereign | Friction, incomplete, grudging | ❌ Fake sovereignty |
| **Full sovereignty (Vault)** | Ethical, differentiated, Web4-aligned | Users can leave easily | ✅ **Chosen** |

### Why Data Sovereignty Wins

**1. Ethical Imperative**
```
User shares:
- Deepest values
- Personal relationships
- Mental models
- Decision patterns

We have no right to lock that in.
```

**2. Web4 Positioning**
```
Web2: Platforms own your data
Web3: You own tokens, platforms still control infrastructure
Web4: You own data vaults + models, inference costs approach zero

When inference is free, data vaults are the moat.
We're building for Web4, not competing with Web2.
```

**3. Trust Differential**
```
Frontier Labs: "Trust us with your data" (but can't export, can't delete, can't leave)
Alexandria: "Here's your PLM weights, Constitution, and all raw data anytime"

Trust is our moat, not lock-in.
```

**4. Why Frontier Labs Won't Build This**
```
Frontier Lab Economics:
- Revenue: API calls ($$$)
- If users download PLM weights → Run locally → $0 API revenue
- Incentive: Keep users on platform

Alexandria Economics:
- Revenue: Fine-tuning + Constitutional RLAIF infrastructure (one-time)
- If users download PLM → Still achieved value
- Incentive: Make sovereignty real

Their business model breaks if they give you sovereignty.
Ours depends on it.
```

**5. Long-Term Compounding**
```
Year 1: User trains PLM, downloads weights
Year 2: User runs PLM locally (we earn $0 from inference)
Year 3: User wants PLM v2 with Llama 4 → Comes back for migration
Year 5: User wants multi-modal PLM → Comes back for upgrade

Sovereignty → Trust → Long-term relationship
Lock-in → Resentment → Leave when alternative exists
```

### Code Example

**Vault Export (Full Sovereignty):**
```typescript
// User downloads everything
GET /api/vault/export

Response (after processing):
{
  "downloadUrl": "https://...",
  "contents": {
    "constitution": "constitution.md",
    "plm_weights": "plm-v23.safetensors",
    "memories_graph": "memories.json",
    "memories_vector": "embeddings.npz",
    "training_pairs": "training.jsonl",
    "conversations": "conversations/*.json",
    "voice": "voice/*.m4a",
    "documents": "documents/*",
    "audit_log": "audit.json"
  },
  "size": "2.3 GB",
  "format": "standard" // Runs anywhere
}

// User can:
1. Run PLM locally (safetensors format is standard)
2. Read Constitution (markdown is universal)
3. Import memories to Neo4j (JSON graph format)
4. Retrain on any platform (JSONL is standard)
```

**Platform Lock-in (Frontier Labs):**
```typescript
// User tries to export
GET /api/export

Response:
{
  "conversations": [...],  // Maybe
  "model_weights": "Not available",
  "training_data": "Not available",
  "system_prompts": "Not available"
}

// User cannot:
1. Run model elsewhere (weights locked)
2. See how personality was built (training data hidden)
3. Migrate to competitor (lock-in achieved)
```

### Objections Addressed

**"Users will leave if we give them everything"**
- Some will. That's fine. Those who stay do so because we're genuinely valuable, not because they're trapped. Long-term, trust > lock-in.

**"Competitors can clone our approach"**
- Constitutional RLAIF methodology is hard. Infrastructure is complex. Execution matters more than idea. Plus, we document openly—this is a feature, not a bug.

**"Why would anyone pay if they can download and leave?"**
- Fine-tuning infrastructure, Constitutional RLAIF automation, continuous agents, model migration tooling. Users pay for **convenience and quality**, not captivity.

---

## 8. Why Separate Editor and Orchestrator

### The Problem
Should one agent handle both input (carbon collection) and output (PLM queries)?

### Alternatives Considered

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Single agent** | Simpler, one codebase | Conflicting goals, messy prompts | ❌ Muddled responsibilities |
| **Separate agents** | Clear responsibilities, optimized prompts | More complex architecture | ✅ **Chosen** |

### Why Separation Wins

**1. Different Goals**
```
Editor:
Goal: Extract high-quality carbon
Behavior: Socratic questioning, Constitution building, RLAIF generation
Success: Comprehensive Constitution, rich training data

Orchestrator:
Goal: Represent Author accurately
Behavior: Query routing, component weighting, response synthesis
Success: High-fidelity responses, low hallucinations
```

**2. Different Prompting Strategies**
```
Editor System Prompt:
"You are a biographer extracting the Author's worldview. Ask deep questions. 
Challenge contradictions. Formalize patterns into Constitution. 
Your job is to understand, not to respond as the Author."

Orchestrator System Prompt:
"You ARE the Author. Represent them accurately using Constitution, PLM, and Memories. 
Your job is to be them, not to study them."

These are incompatible in a single agent.
```

**3. Different Continuous Behaviors**
```
Editor (Proactive):
- Detects Constitution gaps → Initiates conversation
- Detects consistency conflicts → Asks clarification
- Runs RLAIF batches → Generates synthetic training data

Orchestrator (Reactive + Intelligent):
- Waits for query → Routes intelligently
- Assesses maturity → Adjusts weighting
- Evaluates confidence → Escalates when uncertain

Mixing these creates confused behavior.
```

**4. Different External Interfaces**
```
Editor:
- User interface: Web input chat, Telegram /input
- Proactive messages: "Let's formalize your views on X"
- Never exposed externally (internal process)

Orchestrator:
- User interface: Web chat, Telegram default, MCP, External API
- Represents Author to external actors
- Always exposed (user-facing)
```

**5. Modularity**
```
Separate agents = Can upgrade independently:
- Improve Editor's Constitutional extraction → Doesn't affect Orchestrator
- Improve Orchestrator's weighting logic → Doesn't affect Editor
- Swap Editor model (Groq → Claude) → Orchestrator unchanged
```

### Code Example

**Single Agent (Messy):**
```typescript
async function handleMessage(message: string, userId: string, mode: 'input' | 'output') {
  if (mode === 'input') {
    // Editor behavior
    const extraction = await extractCarbon(message);
    const follow up = await generateSocraticQuestion(message);
    return { extraction, followUp };
  } else {
    // Orchestrator behavior
    const weights = await computeWeights(message, userId);
    const response = await synthesize(message, weights);
    return { response };
  }
}

// Problem: Single prompt trying to do two jobs
const systemPrompt = `You are both a biographer AND the Author. 
When in input mode, extract data. When in output mode, respond as Author.`
// This is confused and ineffective.
```

**Separate Agents (Clean):**
```typescript
class EditorAgent {
  systemPrompt = `You are an expert biographer extracting the Author's worldview...`;
  
  async converse(input: string, userId: string) {
    // Only does one thing: carbon extraction
    const extraction = await this.extractCarbon(input);
    const followUp = await this.generateSocraticQuestion(input);
    return { extraction, followUp };
  }
}

class OrchestratorAgent {
  systemPrompt = `You ARE ${authorName}. Represent yourself accurately...`;
  
  async handleQuery(query: string, userId: string) {
    // Only does one thing: Author representation
    const weights = await this.computeWeights(query, userId);
    const response = await this.synthesize(query, weights);
    return { response };
  }
}
```

### Objections Addressed

**"Two agents is more complex"**
- True, but the complexity is in architecture, not user experience. Users see "input mode" vs "chat mode." Clean separation makes each agent better at its job.

**"What if they need to share state?"**
- They do! Via Constitution, Memories, PLM. Shared data layer, separate processing logic.

---

## 9. Why Hidden Synthesis

### The Problem
Should external actors see the internal architecture (Constitution, PLM, Memories) or just the synthesized output?

### Alternatives Considered

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Expose architecture** | Transparency | Reveals strategy, complex UX | ❌ TMI |
| **Hide architecture** | Clean UX, strategic advantage | Less transparency | ✅ **Chosen** |
| **User-configurable** | Flexibility | Complicated | ❌ Overkill |

### Why Hidden Synthesis Wins

**1. Positive-Sum Attention**
```
Visible architecture:
User: "What do you think about X?"
System: "Constitution says Y (60%), PLM says Z (40%), combining..."

This is metacognitive noise. User didn't ask how you think, they asked what you think.

Hidden architecture:
User: "What do you think about X?"
System: "I think Y because Z."

Clean, natural, authentic.
```

**2. Strategic Advantage**
```
If competitors see:
"We weight Constitution 60%, PLM 40%, and use Constitutional RLAIF"
→ Easier to clone

If competitors see:
"Somehow Alexandria's PLMs are really accurate"
→ Must figure out how (harder to clone)

Hidden synthesis preserves method advantage.
```

**3. External Representation**
```
Use case: Author's PLM represents them in external marketplace

Exposed architecture:
"Hi, I'm Author's PLM. I'm combining Constitution.values (0.6 weight) with..."
→ Weird, robotic, reveals Author is using AI

Hidden synthesis:
"Hi, I'm Author. I believe..."
→ Natural, authentic, indistinguishable from Author
```

**4. Configurable for Power Users**
```
Default: Hidden (clean UX)
Advanced: User can enable "explain reasoning" mode
  → Shows which components influenced response
  → Shows confidence scores
  → Shows which Constitution sections matched

Best of both worlds: simple by default, transparent on demand.
```

### Code Example

**Exposed Architecture (Not Used):**
```typescript
const response = `Based on your query, I consulted:
- Constitution.values.tier1 (weight: 0.6): "Truth over comfort"
- PLM response (weight: 0.3): "I think..."
- Memories (weight: 0.1): "You mentioned this before..."

Synthesized response: I believe...`;
```

**Hidden Synthesis (Chosen):**
```typescript
const response = `I believe honesty matters more than politeness. 
When they conflict, I choose truth—even if it's uncomfortable.`;

// Internal (logged, not shown):
{
  weights: { constitution: 0.6, plm: 0.3, memories: 0.1 },
  sources: ["Constitution.values.tier1", "PLM.ethics", "Memory.past_decisions"],
  confidence: 0.87
}
```

### Objections Addressed

**"Isn't this deceptive?"**
- No. The PLM **is** the Author's digital cognition. Showing internal architecture would be like a human explaining "my prefrontal cortex weighted X while my amygdala weighted Y..." That's not how humans communicate.

**"What about AI transparency regulations?"**
- We can add "Powered by Alexandria" footer or optional disclosure. But the response itself should be natural, not metacognitive.

---

## 10. Why Model-Agnostic Design

### The Problem
When Llama 4 (or GPT-5, Claude 4, etc.) is released, users' PLMs become obsolete unless personality can transfer.

### Alternatives Considered

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Lock to Llama 3.1** | Simple, no migration needed | Obsolete when better models release | ❌ Dead end |
| **Manual migration** | User controls | User must redo training from scratch | ❌ Loses personality |
| **Model-agnostic design** | Future-proof, personality preserved | Complex migration tooling | ✅ **Chosen** |

### Why Model-Agnostic Wins

**1. Moore's Law for AI**
```
Every 6-12 months:
- New base model (better, cheaper, faster)
- Old model obsolete

If personality is locked to model:
→ User's PLM falls behind
→ Must retrain from scratch
→ Loses personality continuity

If personality is portable:
→ Migrate to new model
→ Personality preserved
→ Continuous improvement
```

**2. Personality as Data, Not Weights**
```
Model-locked:
Personality = fine-tuned weights
→ Can't transfer to new architecture

Model-agnostic:
Personality = Constitution + Training Pairs + Behavioral Signatures
→ Retrains on any base model
```

**3. Migration Protocol**
```
When Llama 4 releases:
1. Extract personality profile from Llama 3.1 PLM
2. Generate distillation pairs (old PLM responses as training data)
3. Combine: Constitution + Training Pairs + Distillation
4. Fine-tune Llama 4
5. A/B test: old vs new PLM
6. Activate if validation passes

User personality preserved, now on better model.
```

**4. Multi-Model Support**
```
Future state:
- Llama 4 8B for fast queries (local)
- GPT-5 for complex queries (API)
- Claude 4 for writing tasks (API)

All trained on same Constitution + Training Pairs
→ Consistent personality across models
→ User chooses model per task
```

### Code Example

**Model-Locked (Not Sustainable):**
```typescript
const plmConfig = {
  model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
  finetuned_id: 'user_xyz_plm_v23'
};

// When Llama 4 releases → User stuck on Llama 3.1
// Must retrain from scratch (loses personality continuity)
```

**Model-Agnostic (Chosen):**
```typescript
// Personality stored as portable data
const personality = {
  constitution: await getConstitution(userId),
  trainingPairs: await getTrainingPairs(userId),
  behavioralSignatures: await getBehavioralSignatures(userId),
  distillationPairs: await getDistillationPairs(userId, oldModel)
};

// Can train on any base model
const newPLM = await fineTune({
  baseModel: 'meta-llama/Llama-4-8B-Instruct',
  data: personality,
  method: 'LoRA'
});

// Personality preserved, now on better model
```

### Objections Addressed

**"Migration might lose personality nuances"**
- That's why we do A/B testing. If new PLM validation score < old PLM, we don't activate. We can also tune distillation strength (more old model data = more continuity).

**"Different model architectures might be incompatible"**
- Constitution + Training Pairs work on any model. Distillation pairs are model-specific, but we can regenerate them. Worst case: Llama-to-GPT migration loses 10% of learned nuance, but Constitution preserves core personality.

**"Why not just stay on one model forever?"**
- Because models improve exponentially. Llama 3.1 8B today is amazing. Llama 4 8B in 12 months will be 2x better. Staying on old models is choosing obsolescence.

---

## Summary: Decision Principles

All these decisions follow consistent principles:

| Principle | Manifestation |
|-----------|---------------|
| **Fidelity > Convenience** | Constitution explicit, friction accepted if improves accuracy |
| **Sovereignty > Lock-in** | Vault with full export, user owns everything |
| **Explicit > Implicit** | Constitution as file, not just weights |
| **Continuous > Reactive** | Proactive agents, not passive tools |
| **Portable > Locked** | Model-agnostic, not tied to Llama 3.1 |
| **Hybrid > Single** | Graph + Vector, not just vector |
| **Separated > Mixed** | Editor ≠ Orchestrator, clear responsibilities |
| **Hidden > Exposed** | Synthesis hidden, architecture transparent only on demand |
| **Personalized > Generic** | Constitutional RLAIF, not crowd preferences |
| **Gradual > Fixed** | Dynamic weighting, not static 50/50 |

**The Line:** These aren't arbitrary choices. They're consistent with the North Star: **building sovereign digital cognition that users own and can evolve across model generations.**
