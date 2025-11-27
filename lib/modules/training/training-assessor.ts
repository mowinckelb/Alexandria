import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Training data state for assessment
 */
export interface TrainingDataState {
  trainingPairCount: number;
  availablePairCount: number;  // Not yet used in training
  avgQualityScore: number;
  lastTrainedAt: string | null;
  lastTrainedPairCount: number;
  currentModelId: string | null;
  feedbackSinceLastTrain: number;
  positiveFeedbackRate: number;
}

/**
 * Training decision from Editor
 */
export interface TrainingDecision {
  shouldTrain: boolean;
  trainFromBase: boolean;  // true = fresh start, false = continue from previous
  reasoning: string;
  confidence: number;
  recommendedMinQuality: number;
}

/**
 * Training Assessor: Editor that decides when and how to fine-tune
 * 
 * Replaces manual "tune" button with autonomous Editor decision.
 * Follows Editor Autonomy principle - Editors decide, Authors validate.
 */
export class TrainingAssessor {
  /**
   * Assess whether training should happen now
   * Editor evaluates data state and makes the call
   */
  async assessTrainingNeed(dataState: TrainingDataState): Promise<TrainingDecision> {
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      messages: [
        {
          role: 'system',
          content: `You are a training strategist for Alexandria, a cognitive immortalization platform.

Your job: Decide whether to trigger fine-tuning based on the Author's data state.

CONTEXT:
- Fine-tuning creates/updates the Ghost (digital twin)
- Training from BASE = fresh start, clean slate
- Training CONTINUED = build on previous weights, preserve learned patterns
- More data = better Ghost, but diminishing returns
- Quality matters more than quantity
- Feedback indicates if current Ghost needs improvement

DECISION FACTORS:
- Significant new data since last training?
- Quality of available data?
- Negative feedback suggesting Ghost needs retraining?
- Time since last training?
- Enough data to justify training cost?

Be decisive. Training has cost, so don't recommend it frivolously.`
        },
        {
          role: 'user',
          content: `Assess this Author's training state:

CURRENT STATE:
- Total training pairs: ${dataState.trainingPairCount}
- Available (unused) pairs: ${dataState.availablePairCount}
- Average quality score: ${(dataState.avgQualityScore * 100).toFixed(0)}%
- Last trained: ${dataState.lastTrainedAt || 'never'}
- Pairs used in last training: ${dataState.lastTrainedPairCount}
- Current model: ${dataState.currentModelId || 'base (no custom model yet)'}
- Feedback since last train: ${dataState.feedbackSinceLastTrain}
- Positive feedback rate: ${(dataState.positiveFeedbackRate * 100).toFixed(0)}%

Should we train? If yes, from base or continued?

Output JSON:
{
  "shouldTrain": true/false,
  "trainFromBase": true/false,
  "reasoning": "<2-3 sentences>",
  "confidence": 0.0-1.0,
  "recommendedMinQuality": 0.0-1.0
}`
        }
      ]
    });

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      
      const result = JSON.parse(jsonMatch[0]);
      
      return {
        shouldTrain: Boolean(result.shouldTrain),
        trainFromBase: Boolean(result.trainFromBase),
        reasoning: String(result.reasoning || 'No reasoning provided'),
        confidence: Math.min(1, Math.max(0, Number(result.confidence) || 0.5)),
        recommendedMinQuality: Math.min(1, Math.max(0, Number(result.recommendedMinQuality) || 0.6))
      };
    } catch (error) {
      console.error('Failed to parse training assessment:', error);
      return this.conservativeFallback(dataState);
    }
  }

  /**
   * Quick check if training is obviously needed or not
   * For frequent polling without full assessment
   */
  async quickCheck(
    availablePairs: number,
    lastTrainedPairs: number,
    feedbackSinceLastTrain: number
  ): Promise<{ likely: boolean; reason: string }> {
    // Simple heuristics for quick check
    const newPairRatio = lastTrainedPairs > 0 
      ? availablePairs / lastTrainedPairs 
      : availablePairs / 100;
    
    if (availablePairs < 50) {
      return { likely: false, reason: 'Insufficient new data' };
    }
    
    if (newPairRatio > 0.5) {
      return { likely: true, reason: 'Significant new data available' };
    }
    
    if (feedbackSinceLastTrain > 20) {
      return { likely: true, reason: 'Substantial feedback received' };
    }
    
    return { likely: false, reason: 'No urgent training need detected' };
  }

  /**
   * Conservative fallback if LLM assessment fails
   */
  private conservativeFallback(dataState: TrainingDataState): TrainingDecision {
    const shouldTrain = dataState.availablePairCount >= 100 && 
      (dataState.lastTrainedAt === null || dataState.availablePairCount > dataState.lastTrainedPairCount * 0.3);
    
    const trainFromBase = dataState.currentModelId === null || 
      (dataState.positiveFeedbackRate < 0.5 && dataState.feedbackSinceLastTrain > 10);

    return {
      shouldTrain,
      trainFromBase,
      reasoning: 'Fallback assessment due to LLM parse failure',
      confidence: 0.3,
      recommendedMinQuality: 0.6
    };
  }
}

