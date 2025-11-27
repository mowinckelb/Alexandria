import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * RLHF Feedback Processor
 * 
 * Converts user feedback into training-ready formats for:
 * 1. DPO (Direct Preference Optimization) - preferred/rejected pairs
 * 2. Reward Model Training - prompt/response/reward triplets
 * 3. LoRA Fine-tuning - enhanced training pairs from high-quality responses
 * 
 * RLHF APPROACHES COMPARISON:
 * 
 * 1. DPO (Direct Preference Optimization)
 *    - Simpler: No separate reward model needed
 *    - Data: Needs preference pairs (chosen vs rejected for same prompt)
 *    - Together AI: Supported via standard fine-tuning with DPO dataset format
 *    - Minimum data: ~100 preference pairs
 *    - Best for: When you have clear A/B comparisons
 * 
 * 2. Reward Model + PPO (Traditional RLHF)
 *    - Complex: Train reward model, then RL optimization
 *    - Data: Needs scalar rewards for prompt/response pairs
 *    - Together AI: Would require custom training pipeline
 *    - Minimum data: ~500+ reward examples
 *    - Best for: When you want a reusable reward signal
 * 
 * 3. RLAIF (AI Feedback)
 *    - Use strong model to generate preference judgments
 *    - Data: Generate synthetic preferences from user feedback patterns
 *    - Scales better than human-only feedback
 *    - Best for: Amplifying limited human feedback
 * 
 * 4. Enhanced LoRA (Current approach + feedback)
 *    - Boost quality_score for highly-rated responses
 *    - Add high-rated Ghost responses as new training pairs
 *    - Simplest integration with existing pipeline
 *    - Best for: Incremental improvement with existing infrastructure
 */

interface FeedbackRow {
  id: string;
  user_id: string;
  feedback: number;  // Binary: -1 (bad) or +1 (good)
  comment?: string;
  prompt: string;
  response: string;
  model_id?: string;
  created_at: string;
}

interface PreferencePair {
  prompt: string;
  chosen: string;    // Preferred response
  rejected: string;  // Less preferred response
  margin: number;    // Rating difference (confidence)
}

interface RewardData {
  prompt: string;
  response: string;
  reward: number;  // Normalized -1 to 1
}

interface TrainingPairEnhancement {
  system_prompt: string;
  user_content: string;
  assistant_content: string;
  quality_score: number;
  source: 'rlhf_positive';
}

export class FeedbackProcessor {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }

  /**
   * Generate DPO preference pairs from feedback data.
   * Finds responses to the same prompt with different ratings.
   */
  async generatePreferencePairs(userId: string, minMargin = 2): Promise<PreferencePair[]> {
    // Call the database function
    const { data: count, error: funcError } = await this.supabase
      .rpc('generate_preference_pairs', { p_user_id: userId, min_margin: minMargin });

    if (funcError) {
      console.error('Failed to generate preference pairs:', funcError);
    }

    // Fetch the generated pairs
    const { data: pairs, error } = await this.supabase
      .from('preference_pairs')
      .select('prompt, chosen_response, rejected_response, margin')
      .eq('user_id', userId)
      .is('export_id', null)
      .order('margin', { ascending: false });

    if (error) throw error;

    return (pairs || []).map(p => ({
      prompt: p.prompt,
      chosen: p.chosen_response,
      rejected: p.rejected_response,
      margin: p.margin
    }));
  }

  /**
   * Export DPO training data in JSONL format.
   * Format: {"prompt": "...", "chosen": "...", "rejected": "..."}
   */
  async exportDPODataset(userId: string): Promise<string> {
    const pairs = await this.generatePreferencePairs(userId);
    
    return pairs.map(pair => JSON.stringify({
      prompt: pair.prompt,
      chosen: pair.chosen,
      rejected: pair.rejected
    })).join('\n');
  }

  /**
   * Generate reward model training data from feedback.
   * Binary feedback (-1/+1) normalized to -0.5/+0.5 rewards.
   */
  async generateRewardData(userId: string): Promise<RewardData[]> {
    // Call the database function
    await this.supabase.rpc('generate_reward_data', { p_user_id: userId });

    // Fetch the data
    const { data, error } = await this.supabase
      .from('reward_training_data')
      .select('prompt, response, reward')
      .eq('user_id', userId)
      .is('export_id', null);

    if (error) throw error;
    return data || [];
  }

  /**
   * Export reward model training data in JSONL format.
   * Format: {"prompt": "...", "response": "...", "reward": 0.5}
   */
  async exportRewardDataset(userId: string): Promise<string> {
    const data = await this.generateRewardData(userId);
    
    return data.map(d => JSON.stringify(d)).join('\n');
  }

  /**
   * Convert highly-rated Ghost responses into LoRA training pairs.
   * This enhances the existing fine-tuning pipeline with RLHF signal.
   */
  async generateEnhancedTrainingPairs(
    userId: string, 
    minRating = 1
  ): Promise<TrainingPairEnhancement[]> {
    const { data: feedback, error } = await this.supabase
      .from('feedback_logs')
      .select('prompt, response, feedback, comment')
      .eq('user_id', userId)
      .gte('feedback', minRating)
      .not('prompt', 'is', null)
      .not('response', 'is', null);

    if (error) throw error;

    return (feedback || []).map(f => ({
      system_prompt: 'You are a digital ghost.',
      user_content: f.prompt,
      assistant_content: f.response,
      // Binary: +1 (good) → high quality score
      quality_score: 0.85,
      source: 'rlhf_positive' as const
    }));
  }

  /**
   * Insert enhanced training pairs into the training_pairs table.
   * These will be included in the next fine-tuning run.
   */
  async injectEnhancedPairs(userId: string, minRating = 1): Promise<number> {
    const pairs = await this.generateEnhancedTrainingPairs(userId, minRating);
    
    if (pairs.length === 0) return 0;

    const rows = pairs.map(p => ({
      user_id: userId,
      system_prompt: p.system_prompt,
      user_content: p.user_content,
      assistant_content: p.assistant_content,
      quality_score: p.quality_score,
      source_entry_id: null  // From RLHF, not entry
    }));

    const { data, error } = await this.supabase
      .from('training_pairs')
      .insert(rows)
      .select('id');

    if (error) throw error;
    return data?.length || 0;
  }

  /**
   * Get feedback statistics and training readiness.
   */
  async getStats(userId: string) {
    const { data: feedback } = await this.supabase
      .from('feedback_logs')
      .select('feedback')
      .eq('user_id', userId);

    const { count: pairCount } = await this.supabase
      .from('preference_pairs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('export_id', null);

    const { count: rewardCount } = await this.supabase
      .from('reward_training_data')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('export_id', null);

    const distribution = { bad: 0, good: 0 };
    let positiveCount = 0;
    
    (feedback || []).forEach(f => {
      if (f.feedback === 1) {
        distribution.good++;
        positiveCount++;
      } else if (f.feedback === -1) {
        distribution.bad++;
      }
    });

    return {
      totalFeedback: feedback?.length || 0,
      distribution,
      positiveResponses: positiveCount,
      preferencePairs: pairCount || 0,
      rewardDataPoints: rewardCount || 0,
      // Training readiness thresholds
      dpoReady: (pairCount || 0) >= 100,
      rewardModelReady: (rewardCount || 0) >= 500,
      loraEnhancementReady: positiveCount >= 10,
      // Recommended approach based on data
      recommendedApproach: this.recommendApproach(pairCount || 0, rewardCount || 0, positiveCount)
    };
  }

  private recommendApproach(pairs: number, rewards: number, positive: number): string {
    if (pairs >= 100) return 'dpo';
    if (positive >= 10) return 'lora_enhancement';
    if (rewards >= 500) return 'reward_model';
    return 'collect_more_feedback';
  }
}

// Factory export
export function createFeedbackProcessor(): FeedbackProcessor {
  return new FeedbackProcessor();
}

