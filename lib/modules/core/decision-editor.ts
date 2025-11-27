import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Suggested defaults - provided as context, not as rules
 * Editor sees these but makes its own decision
 */
export const SUGGESTED_DEFAULTS = {
  // Quality scoring
  quality: {
    baseScore: 0.5,
    positiveRLHFBoost: 0.85,
    confirmedRLHFBoost: 0.95,
    minimumForTraining: 0.6,
    minimumForExport: 0.6,
  },
  
  // Memory retrieval
  memory: {
    matchThreshold: 0.3,
    maxResults: 5,
  },
  
  // Generation
  generation: {
    temperature: 0.7,
    maxTokens: 500,
  },
  
  // Training triggers
  training: {
    minimumPairs: 100,
    minimumFeedback: 50,
  },
  
  // Distillation
  distillation: {
    qualityThreshold: 0.6,
    styleConsistencyThreshold: 0.5,
    defaultCount: 1000,
  },
  
  // RLAIF
  rlaif: {
    amplificationMultiplier: 3,
    minimumFeedbackToRun: 20,
  }
} as const;

/**
 * Context for a decision request
 */
export interface DecisionContext {
  decisionType: string;
  suggestedValue: number | string | boolean;
  context: Record<string, unknown>;
  question: string;
}

/**
 * Batch of decisions to make
 */
export interface DecisionBatch {
  sessionContext: {
    userId: string;
    currentAction: string;
    dataState?: {
      trainingPairs?: number;
      feedbackCount?: number;
      avgQuality?: number;
    };
  };
  decisions: DecisionContext[];
}

/**
 * Decision result
 */
export interface DecisionResult {
  decisionType: string;
  value: number | string | boolean;
  reasoning: string;
  usedSuggested: boolean;
}

/**
 * Decision Editor: LLM-native decision making
 * 
 * All decisions that affect Ghost fidelity flow through here.
 * Suggested defaults provided as context, but Editor makes final call.
 * 
 * Principle: Maximum leverage to LLMs. Models improve → decisions improve.
 */
export class DecisionEditor {
  /**
   * Make a single decision
   */
  async decide(
    decisionType: string,
    suggestedValue: number | string | boolean,
    context: Record<string, unknown>,
    question: string
  ): Promise<DecisionResult> {
    const batch = await this.decideBatch({
      sessionContext: {
        userId: context.userId as string || 'unknown',
        currentAction: decisionType,
        dataState: context.dataState as DecisionBatch['sessionContext']['dataState']
      },
      decisions: [{
        decisionType,
        suggestedValue,
        context,
        question
      }]
    });
    
    return batch[0];
  }

  /**
   * Make multiple decisions in one call (more efficient)
   */
  async decideBatch(batch: DecisionBatch): Promise<DecisionResult[]> {
    const decisionsText = batch.decisions.map((d, i) => 
      `${i + 1}. ${d.decisionType}
   Question: ${d.question}
   Suggested: ${JSON.stringify(d.suggestedValue)}
   Context: ${JSON.stringify(d.context)}`
    ).join('\n\n');

    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      messages: [
        {
          role: 'system',
          content: `You are the Decision Editor for Alexandria, a cognitive immortalization platform.

Your role: Make decisions that MAXIMIZE GHOST FIDELITY.

For each decision:
1. Consider the suggested value (a sensible default)
2. Consider the context provided
3. Decide whether to use the suggested value or override it
4. Explain your reasoning briefly

You may:
- Use the suggested value if it's appropriate for the context
- Increase or decrease numeric values based on context
- Override completely if the situation warrants

SESSION CONTEXT:
User: ${batch.sessionContext.userId}
Action: ${batch.sessionContext.currentAction}
Data State: ${JSON.stringify(batch.sessionContext.dataState || {})}

Respond with JSON array:
[
  {
    "decisionType": "...",
    "value": <your decision>,
    "reasoning": "<brief explanation>",
    "usedSuggested": true/false
  },
  ...
]`
        },
        {
          role: 'user',
          content: `Make these decisions:\n\n${decisionsText}`
        }
      ]
    });

    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('No JSON array found in decision response:', text);
        return this.fallbackToSuggested(batch.decisions);
      }
      
      const results = JSON.parse(jsonMatch[0]) as DecisionResult[];
      
      // Validate we got all decisions
      if (results.length !== batch.decisions.length) {
        console.warn('Decision count mismatch, using partial results with fallbacks');
        return this.mergeWithFallbacks(results, batch.decisions);
      }
      
      return results;
    } catch (error) {
      console.error('Failed to parse decision response:', error);
      return this.fallbackToSuggested(batch.decisions);
    }
  }

  /**
   * Quick decisions for common scenarios
   * These use the batch API efficiently
   */
  async decideQualityScore(
    context: { isRegeneration: boolean; feedbackValue: number; existingPairs: number }
  ): Promise<number> {
    const suggested = context.isRegeneration 
      ? SUGGESTED_DEFAULTS.quality.confirmedRLHFBoost 
      : SUGGESTED_DEFAULTS.quality.positiveRLHFBoost;
    
    const result = await this.decide(
      'quality_score',
      suggested,
      context,
      'What quality score should this RLHF-positive response get for training?'
    );
    
    return typeof result.value === 'number' ? result.value : suggested;
  }

  async decideMemoryThreshold(
    context: { queryType: string; memoryCount: number }
  ): Promise<number> {
    const result = await this.decide(
      'memory_threshold',
      SUGGESTED_DEFAULTS.memory.matchThreshold,
      context,
      'What similarity threshold should we use for memory retrieval?'
    );
    
    return typeof result.value === 'number' ? result.value : SUGGESTED_DEFAULTS.memory.matchThreshold;
  }

  async decideTemperature(
    context: { queryType: string; requiresCreativity: boolean; isRegeneration: boolean }
  ): Promise<number> {
    const suggested = context.isRegeneration ? 0.9 : SUGGESTED_DEFAULTS.generation.temperature;
    
    const result = await this.decide(
      'temperature',
      suggested,
      context,
      'What temperature should we use for this generation?'
    );
    
    return typeof result.value === 'number' ? result.value : suggested;
  }

  async decideTrainingThreshold(
    context: { currentPairs: number; feedbackCount: number; avgQuality: number; lastTrainedPairs: number }
  ): Promise<{ minimumQuality: number; minimumPairs: number }> {
    const results = await this.decideBatch({
      sessionContext: {
        userId: 'system',
        currentAction: 'training_threshold',
        dataState: {
          trainingPairs: context.currentPairs,
          feedbackCount: context.feedbackCount,
          avgQuality: context.avgQuality
        }
      },
      decisions: [
        {
          decisionType: 'minimum_quality_for_training',
          suggestedValue: SUGGESTED_DEFAULTS.quality.minimumForTraining,
          context,
          question: 'What minimum quality score should pairs have to be included in training?'
        },
        {
          decisionType: 'minimum_pairs_for_training',
          suggestedValue: SUGGESTED_DEFAULTS.training.minimumPairs,
          context,
          question: 'How many pairs minimum before we should trigger training?'
        }
      ]
    });

    return {
      minimumQuality: typeof results[0].value === 'number' ? results[0].value : SUGGESTED_DEFAULTS.quality.minimumForTraining,
      minimumPairs: typeof results[1].value === 'number' ? results[1].value : SUGGESTED_DEFAULTS.training.minimumPairs
    };
  }

  /**
   * Fallback to suggested values if LLM fails
   */
  private fallbackToSuggested(decisions: DecisionContext[]): DecisionResult[] {
    return decisions.map(d => ({
      decisionType: d.decisionType,
      value: d.suggestedValue,
      reasoning: 'Fallback to suggested value due to LLM parse failure',
      usedSuggested: true
    }));
  }

  /**
   * Merge partial results with fallbacks
   */
  private mergeWithFallbacks(
    results: DecisionResult[],
    decisions: DecisionContext[]
  ): DecisionResult[] {
    return decisions.map((d, i) => {
      if (results[i]) return results[i];
      return {
        decisionType: d.decisionType,
        value: d.suggestedValue,
        reasoning: 'Fallback - no result returned for this decision',
        usedSuggested: true
      };
    });
  }
}

// Singleton for efficiency
let decisionEditor: DecisionEditor | null = null;

export function getDecisionEditor(): DecisionEditor {
  if (!decisionEditor) {
    decisionEditor = new DecisionEditor();
  }
  return decisionEditor;
}

