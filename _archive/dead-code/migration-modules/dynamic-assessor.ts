import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Data state for migration assessment
 */
export interface MigrationDataState {
  trainingPairCount: number;
  feedbackCount: number;
  preferenceCount: number;
  rewardDataCount: number;
  avgTrainingQuality: number;
  feedbackDistribution: { positive: number; negative: number };
  hasExistingProfile: boolean;
  previousMigrations: number;
}

/**
 * Dynamic assessment result from Editor
 */
export interface DynamicAssessment {
  runDistillation: boolean;
  distillationMode: 'none' | 'preference_focused' | 'full';
  distillationCount: number;
  runRLAIF: boolean;
  rlaifTargetPairs: number;
  recalibrateReward: boolean;
  reasoning: string;
  confidence: number;
}

/**
 * Dynamic Assessor: Uses an Editor LLM to determine optimal migration strategy
 * 
 * Instead of hardcoded thresholds, we leverage the LLM's judgment to assess
 * the Author's data state and recommend the optimal approach.
 * 
 * Principle: Maximum leverage to Editors. They're getting smarter; use them.
 */
export class DynamicAssessor {
  /**
   * Let an Editor assess the optimal migration strategy
   * No hardcoded thresholds — pure LLM judgment
   */
  async assessMigrationStrategy(
    dataState: MigrationDataState,
    targetBaseModel: string
  ): Promise<DynamicAssessment> {
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      messages: [
        {
          role: 'system',
          content: `You are a migration strategy advisor for Alexandria, a cognitive immortalization platform.

Your job: Given an Author's data state, determine the optimal migration strategy to transfer their Ghost (digital twin) to a new base model with maximum personality fidelity.

CONTEXT:
- Distillation: Run prompts through old model to capture learned patterns. Valuable when RLHF has taught the model things not explicit in training data.
- RLAIF: Use AI to amplify sparse human feedback into more preference pairs. Valuable when feedback exists but is sparse.
- Reward Calibration: Adapt reward signals to new model's output distribution. Valuable when significant reward data exists.

PRINCIPLES:
- More feedback = more value from distillation (learned patterns to transfer)
- Sparse but existent feedback = RLAIF can amplify it
- No feedback = distillation has minimal value (just retrain on raw data)
- Quality matters: high-quality training data needs less augmentation

Be decisive. Give clear recommendations with reasoning.`
        },
        {
          role: 'user',
          content: `Assess this Author's data state and recommend migration strategy:

DATA STATE:
- Training pairs: ${dataState.trainingPairCount}
- Average training quality: ${(dataState.avgTrainingQuality * 100).toFixed(0)}%
- Feedback count: ${dataState.feedbackCount} (${dataState.feedbackDistribution.positive} positive, ${dataState.feedbackDistribution.negative} negative)
- Preference pairs (DPO): ${dataState.preferenceCount}
- Reward data points: ${dataState.rewardDataCount}
- Has existing personality profile: ${dataState.hasExistingProfile}
- Previous migrations completed: ${dataState.previousMigrations}

TARGET MODEL: ${targetBaseModel}

Recommend the optimal strategy. Output JSON:
{
  "runDistillation": true/false,
  "distillationMode": "none" | "preference_focused" | "full",
  "distillationCount": <number 0-3000>,
  "runRLAIF": true/false,
  "rlaifTargetPairs": <number>,
  "recalibrateReward": true/false,
  "reasoning": "<2-3 sentence explanation>",
  "confidence": <0.0-1.0>
}`
        }
      ]
    });

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      
      const result = JSON.parse(jsonMatch[0]);
      
      // Validate and normalize
      return {
        runDistillation: Boolean(result.runDistillation),
        distillationMode: this.normalizeDistillationMode(result.distillationMode),
        distillationCount: Math.min(3000, Math.max(0, Number(result.distillationCount) || 0)),
        runRLAIF: Boolean(result.runRLAIF),
        rlaifTargetPairs: Math.min(1000, Math.max(0, Number(result.rlaifTargetPairs) || 0)),
        recalibrateReward: Boolean(result.recalibrateReward),
        reasoning: String(result.reasoning || 'No reasoning provided'),
        confidence: Math.min(1, Math.max(0, Number(result.confidence) || 0.5))
      };
    } catch (error) {
      console.error('Failed to parse dynamic assessment:', error);
      // Fallback to conservative defaults
      return this.conservativeFallback(dataState);
    }
  }

  /**
   * Assess whether a specific action is worth running
   * For granular decisions during migration
   */
  async shouldRunAction(
    action: 'distillation' | 'rlaif' | 'reward_calibration',
    context: string
  ): Promise<{ should: boolean; reasoning: string }> {
    const { text } = await generateText({
      model: groq('llama-3.1-8b-instant'),  // Fast model for quick decisions
      messages: [
        {
          role: 'system',
          content: 'You make quick yes/no decisions about migration actions. Be decisive.'
        },
        {
          role: 'user',
          content: `Should we run ${action}?

Context: ${context}

Output JSON: { "should": true/false, "reasoning": "<one sentence>" }`
        }
      ]
    });

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { should: false, reasoning: 'Could not parse response' };
      
      const result = JSON.parse(jsonMatch[0]);
      return {
        should: Boolean(result.should),
        reasoning: String(result.reasoning || '')
      };
    } catch {
      return { should: false, reasoning: 'Parse error, defaulting to skip' };
    }
  }

  /**
   * Dynamically determine distillation prompt count based on data quality
   */
  async determineDistillationCount(
    feedbackCount: number,
    avgQuality: number,
    existingDistillationPairs: number
  ): Promise<number> {
    const { text } = await generateText({
      model: groq('llama-3.1-8b-instant'),
      messages: [
        {
          role: 'system',
          content: 'Determine optimal distillation count. Output only a number.'
        },
        {
          role: 'user',
          content: `Feedback: ${feedbackCount}, Quality: ${(avgQuality * 100).toFixed(0)}%, Existing distillation: ${existingDistillationPairs}. How many new distillation pairs? (0-3000)`
        }
      ]
    });

    const count = parseInt(text.trim(), 10);
    return isNaN(count) ? 1000 : Math.min(3000, Math.max(0, count));
  }

  private normalizeDistillationMode(mode: string): 'none' | 'preference_focused' | 'full' {
    const normalized = String(mode).toLowerCase().trim();
    if (normalized === 'none') return 'none';
    if (normalized.includes('preference') || normalized.includes('focused')) return 'preference_focused';
    if (normalized === 'full') return 'full';
    return 'none';
  }

  private conservativeFallback(dataState: MigrationDataState): DynamicAssessment {
    // Simple heuristic fallback if LLM fails
    const hasSignificantFeedback = dataState.feedbackCount > 50;
    const hasRewardData = dataState.rewardDataCount > 30;
    
    return {
      runDistillation: hasSignificantFeedback,
      distillationMode: hasSignificantFeedback ? 'preference_focused' : 'none',
      distillationCount: hasSignificantFeedback ? 1000 : 0,
      runRLAIF: dataState.feedbackCount > 20,
      rlaifTargetPairs: Math.min(dataState.feedbackCount * 3, 500),
      recalibrateReward: hasRewardData,
      reasoning: 'Fallback assessment due to LLM parse failure',
      confidence: 0.3
    };
  }
}

