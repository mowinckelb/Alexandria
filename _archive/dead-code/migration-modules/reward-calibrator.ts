import { createGroq } from '@ai-sdk/groq';
import { createTogetherAI } from '@ai-sdk/togetherai';
import { generateText } from 'ai';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const togetherai = createTogetherAI({ apiKey: process.env.TOGETHER_API_KEY });

/**
 * Reward training data point
 */
export interface RewardDataPoint {
  prompt: string;
  response: string;
  reward: number;  // -1 to 1 normalized
}

/**
 * Calibrated reward data for the new model
 */
export interface CalibratedRewardData {
  prompt: string;
  response: string;          // New model's response
  predicted_reward: number;  // Predicted based on old reward model
  calibration_source: 'direct_transfer' | 'interpolated' | 'new_generation';
}

/**
 * Reward Calibrator: Adapts reward signals to new model's output distribution
 * 
 * Problem: Old reward model was trained on OLD model's output distribution.
 * When new model generates differently, the reward model might mis-score.
 * 
 * Solution:
 * 1. Generate responses from NEW model for known prompts
 * 2. Use preference patterns to predict rewards for new responses
 * 3. Create calibrated reward training data for new reward model
 */
export class RewardCalibrator {
  /**
   * Check if reward model recalibration is needed
   * Based on distribution shift detection
   */
  async assessCalibrationNeed(
    oldModelId: string,
    newModelId: string,
    samplePrompts: string[]
  ): Promise<{
    needed: boolean;
    distributionShift: number;  // 0-1, higher = more different
    reasoning: string;
  }> {
    // Sample responses from both models
    const comparisons: { old: string; new: string }[] = [];
    
    for (const prompt of samplePrompts.slice(0, 10)) {
      try {
        const [oldResponse, newResponse] = await Promise.all([
          this.generateResponse(oldModelId, prompt),
          this.generateResponse(newModelId, prompt)
        ]);
        
        if (oldResponse && newResponse) {
          comparisons.push({ old: oldResponse, new: newResponse });
        }
      } catch {
        // Skip failed comparisons
      }
    }

    if (comparisons.length < 3) {
      return {
        needed: true,
        distributionShift: 0.5,
        reasoning: 'Insufficient samples for comparison, assuming recalibration needed.'
      };
    }

    // Use LLM to assess distribution shift
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      messages: [
        {
          role: 'system',
          content: 'You analyze differences between AI model outputs to assess distribution shift.'
        },
        {
          role: 'user',
          content: `Compare these response pairs from OLD model vs NEW model:

${comparisons.map((c, i) => `
PAIR ${i + 1}:
OLD: "${c.old.slice(0, 300)}..."
NEW: "${c.new.slice(0, 300)}..."
`).join('\n')}

Assess:
1. How similar are the output distributions (style, length, vocabulary)?
2. Would a reward model trained on OLD outputs transfer well to NEW outputs?

Output JSON:
{
  "distributionShift": 0.0-1.0,
  "needed": true/false,
  "reasoning": "explanation"
}`
        }
      ]
    });

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON');
      return JSON.parse(jsonMatch[0]);
    } catch {
      return {
        needed: true,
        distributionShift: 0.3,
        reasoning: 'Could not assess, defaulting to recalibration.'
      };
    }
  }

  /**
   * Generate calibrated reward data for the new model
   * Uses preference patterns to predict rewards for new model's outputs
   */
  async generateCalibratedRewardData(
    newModelId: string,
    originalRewardData: RewardDataPoint[],
    preferencePatterns: { positivePatterns: string[]; negativePatterns: string[]; summary: string },
    onProgress?: (completed: number, total: number) => void
  ): Promise<CalibratedRewardData[]> {
    const calibratedData: CalibratedRewardData[] = [];
    
    // Get unique prompts from original reward data
    const uniquePrompts = [...new Set(originalRewardData.map(d => d.prompt))];
    
    for (let i = 0; i < uniquePrompts.length; i++) {
      const prompt = uniquePrompts[i];
      
      try {
        // Generate new model's response
        const newResponse = await this.generateResponse(newModelId, prompt);
        if (!newResponse) continue;
        
        // Predict reward using preference patterns
        const predictedReward = await this.predictReward(
          prompt,
          newResponse,
          preferencePatterns,
          originalRewardData.filter(d => d.prompt === prompt)
        );
        
        calibratedData.push({
          prompt,
          response: newResponse,
          predicted_reward: predictedReward,
          calibration_source: 'new_generation'
        });
      } catch {
        // Skip failed calibrations
      }
      
      if (onProgress) {
        onProgress(i + 1, uniquePrompts.length);
      }
    }
    
    // Also include direct transfers for high-confidence original data
    const highConfidenceOriginal = originalRewardData.filter(d => 
      Math.abs(d.reward) > 0.7  // Strong signal
    );
    
    for (const data of highConfidenceOriginal.slice(0, 50)) {
      calibratedData.push({
        prompt: data.prompt,
        response: data.response,
        predicted_reward: data.reward,
        calibration_source: 'direct_transfer'
      });
    }
    
    return calibratedData;
  }

  /**
   * Predict reward for a new response using preference patterns
   */
  private async predictReward(
    prompt: string,
    response: string,
    patterns: { positivePatterns: string[]; negativePatterns: string[]; summary: string },
    originalDataForPrompt: RewardDataPoint[]
  ): Promise<number> {
    // If we have original data for this exact prompt, use it as reference
    const avgOriginalReward = originalDataForPrompt.length > 0
      ? originalDataForPrompt.reduce((sum, d) => sum + d.reward, 0) / originalDataForPrompt.length
      : 0;

    const { text } = await generateText({
      model: groq('llama-3.1-8b-instant'),  // Fast model for scoring
      messages: [
        {
          role: 'system',
          content: `You predict reward scores based on learned preferences.

GOOD PATTERNS: ${patterns.positivePatterns.join('; ')}
BAD PATTERNS: ${patterns.negativePatterns.join('; ')}

Score responses from -1.0 (very bad) to +1.0 (very good).`
        },
        {
          role: 'user',
          content: `PROMPT: "${prompt}"
RESPONSE: "${response}"
${originalDataForPrompt.length > 0 ? `REFERENCE (similar prompts scored around ${avgOriginalReward.toFixed(2)})` : ''}

Output only a number between -1.0 and 1.0:`
        }
      ]
    });

    const score = parseFloat(text.trim());
    if (isNaN(score)) return 0;
    return Math.max(-1, Math.min(1, score));
  }

  /**
   * Generate a response from a model
   */
  private async generateResponse(modelId: string, prompt: string): Promise<string | null> {
    try {
      const { text } = await generateText({
        model: togetherai(modelId),
        messages: [
          { role: 'system', content: 'You are a digital ghost. Respond authentically.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      });
      return text;
    } catch {
      return null;
    }
  }

  /**
   * Export calibrated reward data as training format
   */
  exportAsTrainingData(calibratedData: CalibratedRewardData[]): string {
    return calibratedData
      .map(d => JSON.stringify({
        prompt: d.prompt,
        response: d.response,
        reward: d.predicted_reward
      }))
      .join('\n');
  }

  /**
   * Full calibration pipeline
   */
  async calibrate(
    oldModelId: string,
    newModelId: string,
    originalRewardData: RewardDataPoint[],
    preferencePatterns: { positivePatterns: string[]; negativePatterns: string[]; summary: string },
    onProgress?: (phase: string, completed: number, total: number) => void
  ): Promise<{
    calibratedData: CalibratedRewardData[];
    calibrationAssessment: { needed: boolean; distributionShift: number; reasoning: string };
  }> {
    // Phase 1: Assess if calibration is needed
    if (onProgress) onProgress('assessing_need', 0, 1);
    const samplePrompts = originalRewardData.slice(0, 20).map(d => d.prompt);
    const calibrationAssessment = await this.assessCalibrationNeed(
      oldModelId,
      newModelId,
      samplePrompts
    );
    if (onProgress) onProgress('assessing_need', 1, 1);

    // Phase 2: Generate calibrated data if needed
    let calibratedData: CalibratedRewardData[] = [];
    
    if (calibrationAssessment.needed) {
      calibratedData = await this.generateCalibratedRewardData(
        newModelId,
        originalRewardData,
        preferencePatterns,
        (completed, total) => {
          if (onProgress) onProgress('calibrating', completed, total);
        }
      );
    } else {
      // Direct transfer - just reformat original data
      calibratedData = originalRewardData.map(d => ({
        prompt: d.prompt,
        response: d.response,
        predicted_reward: d.reward,
        calibration_source: 'direct_transfer' as const
      }));
    }

    return { calibratedData, calibrationAssessment };
  }
}

