/**
 * Constitution Types — per ALEXANDRIA.md
 * 
 * 5 sections: Worldview, Values, Models, Identity, Shadows
 * 3 views: Canonical (full), Training (dense/weighted), Inference (compressed/modular)
 */

import { z } from 'zod';

// ============================================================================
// Section Schemas — the 5 ALEXANDRIA.md sections
// ============================================================================

export const WorldviewSchema = z.object({
  beliefs: z.array(z.string()).describe('What I believe about reality — how things work, what exists, what matters, cause and effect'),
  epistemology: z.array(z.string()).describe('How I know things — sources of truth, evidence evaluation'),
});

export const ValuesSchema = z.object({
  core: z.array(z.object({
    name: z.string(),
    description: z.string(),
    weight: z.number().min(0).max(1).optional(),
  })).describe('Non-negotiable core values — what I would sacrifice for'),
  preferences: z.array(z.object({
    name: z.string(),
    description: z.string(),
  })).describe('Strong preferences, aesthetic leanings, stylistic values'),
  repulsions: z.array(z.string()).describe('What I find repulsive or unacceptable'),
});

export const ModelsSchema = z.object({
  mentalModels: z.array(z.object({
    name: z.string(),
    domain: z.string(),
    description: z.string(),
  })).describe('Mental models, heuristics, reasoning patterns'),
  decisionPatterns: z.array(z.string()).describe('How I approach decisions — gut vs analysis, frameworks used'),
});

export const IdentitySchema = z.object({
  selfConcept: z.string().describe('Who I am — self-concept in the Author\'s own voice'),
  communicationStyle: z.string().describe('How I communicate — tone, vocabulary, rhythm, quirks'),
  roles: z.array(z.string()).describe('Roles and narratives — how I see myself in relation to others'),
  trustModel: z.string().optional().describe('How I build and extend trust'),
});

export const ShadowsSchema = z.object({
  contradictions: z.array(z.string()).describe('Contradictions between stated values and actual behaviour'),
  blindSpots: z.array(z.string()).describe('Known blind spots — what I miss or misjudge'),
  dissonance: z.array(z.string()).describe('Theory-reality gaps — where my self-model diverges from observed behaviour'),
});

// ============================================================================
// Full Constitution Sections
// ============================================================================

export const ConstitutionSectionsSchema = z.object({
  worldview: WorldviewSchema,
  values: ValuesSchema,
  models: ModelsSchema,
  identity: IdentitySchema,
  shadows: ShadowsSchema,
});

export type ConstitutionSections = z.infer<typeof ConstitutionSectionsSchema>;

export type SectionName = keyof ConstitutionSections;

export const SECTION_NAMES: SectionName[] = ['worldview', 'values', 'models', 'identity', 'shadows'];

// Training priority order per ALEXANDRIA.md: Values first, then Models, Identity, Worldview, Shadows
export const TRAINING_PRIORITY: SectionName[] = ['values', 'models', 'identity', 'worldview', 'shadows'];

// ============================================================================
// Constitution Interface
// ============================================================================

export interface Constitution {
  id: string;
  userId: string;
  version: number;
  content: string;       // Canonical view — full human-readable markdown
  sections: ConstitutionSections;  // Structured JSONB
  createdAt: string;
  changeSummary: string | null;
  previousVersionId: string | null;
}

// ============================================================================
// Constitution Views — per ALEXANDRIA.md
// ============================================================================

/**
 * Canonical — full, complete, human-readable. What the Author reads/edits.
 * This is `constitution.content` (markdown) + `constitution.sections` (structured).
 */

/**
 * Training view — dense, every nuance preserved, sections weighted by training priority.
 * Used by RLAIF evaluator to judge PLM outputs.
 */
export interface TrainingView {
  sections: Array<{
    name: SectionName;
    priority: number;  // 1 = highest (values), 5 = lowest (shadows)
    content: string;   // Dense text representation
  }>;
  fullText: string;    // Concatenated for context injection
}

/**
 * Inference view — compressed, modular by domain.
 * Orchestrator pulls relevant sections per query.
 */
export interface InferenceView {
  sections: Record<SectionName, string>;  // Compressed per-section summaries
  queryHints: Record<string, SectionName[]>;  // Query type → relevant sections
}

// ============================================================================
// Update Types
// ============================================================================

export type ConstitutionUpdateTrigger =
  | { type: 'new_value_expressed'; value: string; context: string }
  | { type: 'contradiction_detected'; statement: string; conflictsWith: string }
  | { type: 'mental_model_used'; model: string; effectiveness: number }
  | { type: 'shadow_identified'; observation: string; context: string }
  | { type: 'evolution_acknowledged'; domain: string; reason: string }
  | { type: 'user_direct_edit'; section: string; change: string };

export interface ConstitutionUpdateRequest {
  section: SectionName;
  operation: 'add' | 'update' | 'remove';
  data: unknown;
  changeSummary: string;
}

export interface ConstitutionExtractionResult {
  constitution: Constitution;
  coverage: number;
  sectionsExtracted: string[];
  sectionsMissing: string[];
}

export interface ConstitutionVersionSummary {
  id: string;
  version: number;
  changeSummary: string | null;
  createdAt: string;
  isActive: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

export function createEmptyConstitutionSections(): ConstitutionSections {
  return {
    worldview: { beliefs: [], epistemology: [] },
    values: { core: [], preferences: [], repulsions: [] },
    models: { mentalModels: [], decisionPatterns: [] },
    identity: { selfConcept: '', communicationStyle: '', roles: [] },
    shadows: { contradictions: [], blindSpots: [], dissonance: [] },
  };
}

/**
 * Derive Training view from canonical constitution.
 * Dense, preserves all nuance, weighted by training priority.
 */
export function deriveTrainingView(sections: ConstitutionSections): TrainingView {
  const sectionTexts = TRAINING_PRIORITY.map((name, idx) => {
    const content = sectionToTrainingText(name, sections[name]);
    return { name, priority: idx + 1, content };
  });

  return {
    sections: sectionTexts,
    fullText: sectionTexts.map(s => `[${s.name.toUpperCase()} — priority ${s.priority}]\n${s.content}`).join('\n\n'),
  };
}

/**
 * Derive Inference view from canonical constitution.
 * Compressed summaries, modular for per-query retrieval.
 */
export function deriveInferenceView(sections: ConstitutionSections): InferenceView {
  return {
    sections: {
      worldview: sectionToCompressedText('worldview', sections.worldview),
      values: sectionToCompressedText('values', sections.values),
      models: sectionToCompressedText('models', sections.models),
      identity: sectionToCompressedText('identity', sections.identity),
      shadows: sectionToCompressedText('shadows', sections.shadows),
    },
    queryHints: {
      values_question: ['values', 'worldview'],
      factual_question: ['worldview', 'models'],
      reasoning_question: ['models', 'worldview'],
      style_question: ['identity', 'values'],
      novel_situation: ['values', 'models', 'shadows'],
      personal_question: ['identity', 'values', 'shadows'],
    },
  };
}

function sectionToTrainingText(name: SectionName, section: unknown): string {
  const s = section as Record<string, unknown>;
  const lines: string[] = [];

  for (const [key, val] of Object.entries(s)) {
    if (Array.isArray(val)) {
      if (val.length === 0) continue;
      if (typeof val[0] === 'string') {
        lines.push(`${key}: ${val.join('; ')}`);
      } else {
        lines.push(`${key}:`);
        for (const item of val) {
          if (typeof item === 'object' && item !== null) {
            const parts = Object.entries(item).map(([k, v]) => `${k}: ${v}`).join(', ');
            lines.push(`  - ${parts}`);
          }
        }
      }
    } else if (typeof val === 'string' && val) {
      lines.push(`${key}: ${val}`);
    }
  }

  return lines.join('\n') || '(empty)';
}

function sectionToCompressedText(name: SectionName, section: unknown): string {
  const s = section as Record<string, unknown>;
  const parts: string[] = [];

  for (const [key, val] of Object.entries(s)) {
    if (Array.isArray(val) && val.length > 0) {
      if (typeof val[0] === 'string') {
        parts.push(val.join('. '));
      } else {
        const names = val.map((v: Record<string, unknown>) => v.name || v.description || JSON.stringify(v)).slice(0, 5);
        parts.push(names.join('; '));
      }
    } else if (typeof val === 'string' && val) {
      parts.push(val);
    }
  }

  return parts.join(' | ') || '(empty)';
}

// ============================================================================
// Markdown Template — the canonical view format
// ============================================================================

export const CONSTITUTION_TEMPLATE = `# Constitution

## Worldview
What I believe about reality. How I think things work.

{worldview_beliefs}

### Epistemology
How I know things. Sources of truth. Evidence evaluation.

{worldview_epistemology}

## Values
What matters and in what order. Non-negotiable core values, strong preferences, lines I draw.

### Core Values
{values_core}

### Preferences
{values_preferences}

### Repulsions
{values_repulsions}

## Models
How I think and decide. Mental models, heuristics, reasoning patterns.

### Mental Models
{models_mental}

### Decision Patterns
{models_decisions}

## Identity
Who I am. How I present. How I relate.

{identity_self}

### Communication Style
{identity_style}

### Roles
{identity_roles}

## Shadows
Where I am wrong. Contradictions, blind spots, dissonance.

### Contradictions
{shadows_contradictions}

### Blind Spots
{shadows_blindspots}

### Theory-Reality Dissonance
{shadows_dissonance}

---

_This Constitution is living. Last updated: {lastUpdated}_
`;
