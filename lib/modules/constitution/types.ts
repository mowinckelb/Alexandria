/**
 * Constitution Types
 * Defines the structure of an explicit Constitution document
 * that serves as ground truth for Constitutional RLAIF.
 */

import { z } from 'zod';

// ============================================================================
// Value Types
// ============================================================================

export const ValueSchema = z.object({
  name: z.string(),
  description: z.string(),
  examples: z.array(z.string()).optional()
});

export type Value = z.infer<typeof ValueSchema>;

export const ValuesHierarchySchema = z.object({
  tier1: z.array(ValueSchema).describe('Non-negotiable values that override everything'),
  tier2: z.array(ValueSchema).describe('Strong preferences, can be traded off'),
  tier3: z.array(ValueSchema).describe('Stylistic preferences, not moral imperatives')
});

export type ValuesHierarchy = z.infer<typeof ValuesHierarchySchema>;

// ============================================================================
// Mental Model Types
// ============================================================================

export const MentalModelSchema = z.object({
  domain: z.string(),
  name: z.string(),
  whenToApply: z.string(),
  howItWorks: z.string(),
  example: z.string().optional(),
  limitations: z.string().optional()
});

export type MentalModel = z.infer<typeof MentalModelSchema>;

// ============================================================================
// Decision Heuristic Types
// ============================================================================

export const DecisionHeuristicSchema = z.object({
  situationType: z.string(),
  name: z.string(),
  rule: z.string(),
  reasoning: z.string().optional(),
  overrideConditions: z.string().optional()
});

export type DecisionHeuristic = z.infer<typeof DecisionHeuristicSchema>;

// ============================================================================
// Communication Style Types
// ============================================================================

export const CommunicationStyleSchema = z.object({
  writingStyle: z.object({
    sentenceStructure: z.string().optional(),
    vocabulary: z.array(z.string()).optional(),
    avoidedWords: z.array(z.string()).optional(),
    punctuationQuirks: z.string().optional(),
    paragraphRhythm: z.string().optional()
  }).optional(),
  speakingStyle: z.object({
    verbalTics: z.array(z.string()).optional(),
    pace: z.string().optional(),
    tangentFrequency: z.string().optional(),
    analogyUsage: z.string().optional()
  }).optional(),
  characteristicPhrases: z.array(z.string()).optional()
});

export type CommunicationStyle = z.infer<typeof CommunicationStyleSchema>;

// ============================================================================
// Domain Expertise Types
// ============================================================================

export const DomainExpertiseSchema = z.object({
  domain: z.string(),
  depth: z.enum(['beginner', 'intermediate', 'expert', 'world-class']),
  subdomains: z.array(z.string()).optional(),
  opinions: z.array(z.string()).optional(),
  gaps: z.array(z.string()).optional()
});

export type DomainExpertise = z.infer<typeof DomainExpertiseSchema>;

// ============================================================================
// Evolution Note Types
// ============================================================================

export const EvolutionNoteSchema = z.object({
  date: z.string(),
  section: z.string(),
  whatChanged: z.string(),
  why: z.string(),
  oldState: z.string().optional(),
  newState: z.string().optional()
});

export type EvolutionNote = z.infer<typeof EvolutionNoteSchema>;

// ============================================================================
// Worldview Types
// ============================================================================

export const WorldviewSchema = z.object({
  epistemology: z.array(z.string()).describe('How I know things - sources of truth, evidence evaluation'),
  ontology: z.array(z.string()).describe('What exists - key concepts, categorization of reality')
});

export type Worldview = z.infer<typeof WorldviewSchema>;

// ============================================================================
// Full Constitution Schema
// ============================================================================

export const ConstitutionSectionsSchema = z.object({
  coreIdentity: z.string().describe('Brief self-description in Author voice'),
  worldview: WorldviewSchema,
  values: ValuesHierarchySchema,
  mentalModels: z.array(MentalModelSchema),
  heuristics: z.array(DecisionHeuristicSchema),
  communicationPatterns: CommunicationStyleSchema,
  domainExpertise: z.array(DomainExpertiseSchema),
  boundaries: z.array(z.string()).describe('Things I will never do or say'),
  evolutionNotes: z.array(EvolutionNoteSchema)
});

export type ConstitutionSections = z.infer<typeof ConstitutionSectionsSchema>;

export interface Constitution {
  id: string;
  userId: string;
  version: number;
  content: string;  // Full markdown
  sections: ConstitutionSections;
  createdAt: string;
  changeSummary: string | null;
  previousVersionId: string | null;
}

// ============================================================================
// Update Trigger Types
// ============================================================================

export type ConstitutionUpdateTrigger = 
  | { type: 'new_value_expressed'; value: string; context: string }
  | { type: 'contradiction_detected'; statement: string; conflictsWith: string }
  | { type: 'mental_model_used'; model: string; effectiveness: number }
  | { type: 'boundary_crossed'; boundary: string; context: string }
  | { type: 'evolution_acknowledged'; domain: string; reason: string }
  | { type: 'user_direct_edit'; section: string; change: string };

// ============================================================================
// API Types
// ============================================================================

export interface ConstitutionUpdateRequest {
  section: keyof ConstitutionSections;
  operation: 'add' | 'update' | 'remove';
  data: unknown;
  changeSummary: string;
}

export interface ConstitutionExtractionResult {
  constitution: Constitution;
  coverage: number;  // 0-1, percentage of sections filled
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
// Default Empty Constitution
// ============================================================================

export function createEmptyConstitutionSections(): ConstitutionSections {
  return {
    coreIdentity: '',
    worldview: {
      epistemology: [],
      ontology: []
    },
    values: {
      tier1: [],
      tier2: [],
      tier3: []
    },
    mentalModels: [],
    heuristics: [],
    communicationPatterns: {},
    domainExpertise: [],
    boundaries: [],
    evolutionNotes: []
  };
}

// ============================================================================
// Markdown Template
// ============================================================================

export const CONSTITUTION_TEMPLATE = `# Constitution

## Core Identity

{coreIdentity}

## Worldview

### Epistemology (How I Know Things)

{epistemology}

### Ontology (What Exists)

{ontology}

## Values (Hierarchical)

### Tier 1 (Non-Negotiable)

{tier1Values}

### Tier 2 (Strong Preferences)

{tier2Values}

### Tier 3 (Stylistic)

{tier3Values}

## Mental Models

{mentalModels}

## Decision Heuristics

{heuristics}

## Communication Patterns

### Writing Style

{writingStyle}

### Speaking Style

{speakingStyle}

## Domain Expertise

{domainExpertise}

## Boundaries (What I Don't Do)

{boundaries}

## Evolution Notes

{evolutionNotes}

---

_This Constitution is living. Last updated: {lastUpdated}_
`;
