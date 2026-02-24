import { createClient } from '@supabase/supabase-js';
import { PersonalityExtractor, PersonalityProfile, TrainingPair } from './personality-extractor';
import { Distiller, DistillationPair, CorpusPrompt } from './distiller';
import { RLAIFAmplifier, FeedbackEntry, SyntheticPreferencePair } from './rlaif-amplifier';
import { RewardCalibrator, RewardDataPoint, CalibratedRewardData } from './reward-calibrator';
import { DynamicAssessor, MigrationDataState, DynamicAssessment } from './dynamic-assessor';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * Fallback thresholds (only used if Editor assessment fails)
 * Primary assessment is dynamic via DynamicAssessor
 */
export const ADAPTIVE_THRESHOLDS = {
  // Quality thresholds (not dynamic - these are hard constraints)
  MIN_QUALITY_SCORE: 0.6,
  MIN_STYLE_CONSISTENCY: 0.5,
} as const;

/**
 * Adaptive migration configuration - auto-determined based on data
 */
export interface AdaptiveMigrationConfig {
  targetBaseModel: string;
  
  // Auto-determined settings
  distillationMode: 'none' | 'preference_focused' | 'full';
  distillationCount: number;
  runRLAIF: boolean;
  rlaifTargetPairs: number;
  recalibrateReward: boolean;
  
  // Data inclusion (always true by default)
  includeRawPairs: boolean;
  includeDpoPairs: boolean;
  includeDistillation: boolean;
  includeRLAIFPairs: boolean;
  
  // Quality settings
  qualityThreshold: number;
  styleConsistencyThreshold: number;
}

/**
 * Assessment of the user's RLHF intensity
 */
export interface RLHFAssessment {
  feedbackCount: number;
  preferenceCount: number;
  rewardDataCount: number;
  rlhfIntensity: 'none' | 'light' | 'medium' | 'heavy';
  
  recommendations: {
    distillationMode: 'none' | 'preference_focused' | 'full';
    runRLAIF: boolean;
    recalibrateReward: boolean;
  };
  
  reasoning: string;
}

/**
 * Migration status with detailed phase tracking
 */
export interface AdaptiveMigrationStatus {
  id: string;
  status: 'pending' | 'assessing' | 'rlaif' | 'extracting_profile' | 'distilling' | 'calibrating_reward' | 'preparing_data' | 'ready_to_train' | 'training' | 'validating' | 'completed' | 'failed';
  phase: string;
  progress: number;
  
  // Counts
  feedbackCount: number;
  rlaifPairsGenerated: number;
  distillationPairsGenerated: number;
  totalTrainingPairs: number;
  dpoPairsCount: number;
  
  // Config used
  config?: AdaptiveMigrationConfig;
  
  error?: string;
}

/**
 * Complete training data package with all sources
 */
export interface AdaptiveTrainingPackage {
  // Core training data
  trainingPairs: Array<{
    system_prompt: string;
    user_content: string;
    assistant_content: string;
    source: 'raw' | 'distillation' | 'rlhf';
    quality_score?: number;
  }>;
  
  // DPO data (original + RLAIF synthetic)
  dpoPairs: Array<{
    prompt: string;
    chosen: string;
    rejected: string;
    source: 'human' | 'rlaif';
    confidence?: number;
  }>;
  
  // Reward data (calibrated for new model)
  rewardData: CalibratedRewardData[];
  
  // Personality data
  personalityProfile: PersonalityProfile;
  constitutionalPrompt: string;
  preferencePatterns: {
    positivePatterns: string[];
    negativePatterns: string[];
    summary: string;
  };
  
  // Metadata
  metadata: {
    sourceModelId: string;
    targetBaseModel: string;
    migrationId: string;
    config: AdaptiveMigrationConfig;
    assessment: RLHFAssessment;
  };
}

/**
 * Adaptive Migration Orchestrator
 * 
 * Automatically determines the optimal migration strategy based on:
 * - Amount of RLHF feedback
 * - Quality of training data
 * - Distribution shift between models
 */
export class AdaptiveMigrationOrchestrator {
  private extractor: PersonalityExtractor;
  private distiller: Distiller;
  private rlaifAmplifier: RLAIFAmplifier;
  private rewardCalibrator: RewardCalibrator;
  private dynamicAssessor: DynamicAssessor;

  constructor() {
    this.extractor = new PersonalityExtractor();
    this.distiller = new Distiller();
    this.rlaifAmplifier = new RLAIFAmplifier();
    this.rewardCalibrator = new RewardCalibrator();
    this.dynamicAssessor = new DynamicAssessor();
  }

  /**
   * Assess RLHF intensity and determine optimal migration strategy
   * Uses Dynamic Assessor (Editor LLM) instead of hardcoded thresholds
   */
  async assessRLHFIntensity(userId: string, targetBaseModel?: string): Promise<RLHFAssessment> {
    // Get data state
    const { count: feedbackCount } = await supabase
      .from('feedback_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: preferenceCount } = await supabase
      .from('preference_pairs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: rewardDataCount } = await supabase
      .from('reward_training_data')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: trainingPairCount } = await supabase
      .from('training_pairs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { data: qualityData } = await supabase
      .from('training_pairs')
      .select('quality_score')
      .eq('user_id', userId);

    const { data: feedbackDist } = await supabase
      .from('feedback_logs')
      .select('feedback')
      .eq('user_id', userId);

    const { count: previousMigrations } = await supabase
      .from('model_migrations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed');

    const { data: profileExists } = await supabase
      .from('personality_profiles')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1);

    const feedback = feedbackCount || 0;
    const preferences = preferenceCount || 0;
    const rewards = rewardDataCount || 0;
    const avgQuality = qualityData && qualityData.length > 0
      ? qualityData.reduce((sum, d) => sum + (d.quality_score || 0.5), 0) / qualityData.length
      : 0.5;
    const positiveFeedback = feedbackDist?.filter(f => f.feedback > 0).length || 0;
    const negativeFeedback = feedbackDist?.filter(f => f.feedback < 0).length || 0;

    // Build data state for dynamic assessment
    const dataState: MigrationDataState = {
      trainingPairCount: trainingPairCount || 0,
      feedbackCount: feedback,
      preferenceCount: preferences,
      rewardDataCount: rewards,
      avgTrainingQuality: avgQuality,
      feedbackDistribution: { positive: positiveFeedback, negative: negativeFeedback },
      hasExistingProfile: (profileExists?.length || 0) > 0,
      previousMigrations: previousMigrations || 0
    };

    // Use Editor LLM for dynamic assessment (no hardcoded thresholds)
    const dynamicResult = await this.dynamicAssessor.assessMigrationStrategy(
      dataState,
      targetBaseModel || 'meta-llama/Meta-Llama-3.1-8B-Instruct-Reference'
    );

    // Determine intensity label from dynamic result
    let intensity: 'none' | 'light' | 'medium' | 'heavy';
    if (!dynamicResult.runDistillation && !dynamicResult.runRLAIF) {
      intensity = feedback === 0 ? 'none' : 'light';
    } else if (dynamicResult.distillationMode === 'preference_focused') {
      intensity = 'medium';
    } else if (dynamicResult.distillationMode === 'full') {
      intensity = 'heavy';
    } else {
      intensity = 'light';
    }

    return {
      feedbackCount: feedback,
      preferenceCount: preferences,
      rewardDataCount: rewards,
      rlhfIntensity: intensity,
      recommendations: {
        distillationMode: dynamicResult.distillationMode,
        runRLAIF: dynamicResult.runRLAIF,
        recalibrateReward: dynamicResult.recalibrateReward
      },
      reasoning: dynamicResult.reasoning
    };
  }

  /**
   * Generate adaptive migration config based on dynamic assessment
   * Uses Editor-determined values, not hardcoded calculations
   */
  async generateAdaptiveConfig(
    targetBaseModel: string,
    userId: string
  ): Promise<AdaptiveMigrationConfig> {
    // Get fresh dynamic assessment
    const assessment = await this.assessRLHFIntensity(userId, targetBaseModel);
    const { recommendations, feedbackCount } = assessment;
    
    // Get dynamic distillation count from Editor
    const distillationCount = recommendations.distillationMode !== 'none'
      ? await this.dynamicAssessor.determineDistillationCount(
          feedbackCount,
          0.6, // Will be replaced with actual avg quality
          0
        )
      : 0;

    // RLAIF target also dynamically determined
    const rlaifTargetPairs = recommendations.runRLAIF
      ? Math.min(feedbackCount * 3, 500) // Simple multiplier, could also be dynamic
      : 0;

    return {
      targetBaseModel,
      distillationMode: recommendations.distillationMode,
      distillationCount,
      runRLAIF: recommendations.runRLAIF,
      rlaifTargetPairs,
      recalibrateReward: recommendations.recalibrateReward,
      includeRawPairs: true,
      includeDpoPairs: true,
      includeDistillation: recommendations.distillationMode !== 'none',
      includeRLAIFPairs: recommendations.runRLAIF,
      qualityThreshold: ADAPTIVE_THRESHOLDS.MIN_QUALITY_SCORE,
      styleConsistencyThreshold: ADAPTIVE_THRESHOLDS.MIN_STYLE_CONSISTENCY
    };
  }

  /**
   * Initiate an adaptive migration - auto-determines strategy via Editor
   */
  async initiateAdaptiveMigration(
    userId: string,
    targetBaseModel: string
  ): Promise<{ migrationId: string; assessment: RLHFAssessment; config: AdaptiveMigrationConfig }> {
    // Assess RLHF intensity using dynamic Editor assessment
    const assessment = await this.assessRLHFIntensity(userId, targetBaseModel);
    
    // Generate config based on dynamic assessment
    const config = await this.generateAdaptiveConfig(targetBaseModel, userId);
    
    // Get current active model
    const { data: activeModel } = await supabase.rpc('get_active_model', { p_user_id: userId });
    const sourceModelId = activeModel || 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo';

    // Get source export
    const { data: sourceExport } = await supabase
      .from('training_exports')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    // Create migration record
    const { data: migration, error } = await supabase
      .from('model_migrations')
      .insert({
        user_id: userId,
        source_model_id: sourceModelId,
        source_export_id: sourceExport?.id || null,
        target_base_model: targetBaseModel,
        config: config,
        status: 'pending',
        phase: 'initialized'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create migration: ${error.message}`);
    }

    return {
      migrationId: migration.id,
      assessment,
      config
    };
  }

  /**
   * Run RLAIF amplification phase
   */
  async runRLAIFAmplification(
    userId: string,
    migrationId: string,
    onProgress?: (phase: string, completed: number, total: number) => void
  ): Promise<{ syntheticPairs: SyntheticPreferencePair[]; preferencePatterns: { positivePatterns: string[]; negativePatterns: string[]; summary: string } }> {
    await this.updateStatus(migrationId, 'rlaif', 'starting');

    // Get migration config
    const { data: migration } = await supabase
      .from('model_migrations')
      .select('source_model_id, config')
      .eq('id', migrationId)
      .single();

    if (!migration) throw new Error('Migration not found');
    
    const config = migration.config as AdaptiveMigrationConfig;
    
    if (!config.runRLAIF) {
      return { 
        syntheticPairs: [], 
        preferencePatterns: { positivePatterns: [], negativePatterns: [], summary: 'RLAIF skipped' } 
      };
    }

    // Fetch feedback data
    const { data: feedback } = await supabase
      .from('feedback_logs')
      .select('id, prompt, response, feedback, comment')
      .eq('user_id', userId)
      .not('prompt', 'is', null)
      .not('response', 'is', null);

    const feedbackEntries = (feedback || []).map(f => ({
      id: f.id,
      prompt: f.prompt!,
      response: f.response!,
      feedback: f.feedback,
      comment: f.comment
    })) as FeedbackEntry[];

    // Run RLAIF amplification
    const result = await this.rlaifAmplifier.amplify(
      migration.source_model_id,
      feedbackEntries,
      config.rlaifTargetPairs,
      onProgress
    );

    // Save synthetic pairs to preference_pairs
    for (const pair of result.syntheticPairs) {
      await supabase
        .from('preference_pairs')
        .insert({
          user_id: userId,
          prompt: pair.prompt,
          chosen_response: pair.chosen,
          rejected_response: pair.rejected,
          margin: Math.round(pair.confidence * 4)  // Convert 0-1 to 0-4 margin
        });
    }

    // Update migration record
    await supabase
      .from('model_migrations')
      .update({
        phase: 'rlaif_complete'
      })
      .eq('id', migrationId);

    return result;
  }

  /**
   * Run the full adaptive migration pipeline
   */
  async runFullMigration(
    userId: string,
    migrationId: string,
    onProgress?: (status: AdaptiveMigrationStatus) => void
  ): Promise<AdaptiveTrainingPackage> {
    const reportProgress = (status: Partial<AdaptiveMigrationStatus>) => {
      if (onProgress) {
        onProgress({
          id: migrationId,
          status: 'pending',
          phase: '',
          progress: 0,
          feedbackCount: 0,
          rlaifPairsGenerated: 0,
          distillationPairsGenerated: 0,
          totalTrainingPairs: 0,
          dpoPairsCount: 0,
          ...status
        } as AdaptiveMigrationStatus);
      }
    };

    // Get migration
    const { data: migration } = await supabase
      .from('model_migrations')
      .select('*')
      .eq('id', migrationId)
      .single();

    if (!migration) throw new Error('Migration not found');
    
    const config = migration.config as AdaptiveMigrationConfig;
    const sourceModelId = migration.source_model_id;

    // Phase 1: RLAIF Amplification (if enabled)
    let preferencePatterns = { positivePatterns: [] as string[], negativePatterns: [] as string[], summary: '' };
    let rlaifPairs: SyntheticPreferencePair[] = [];
    
    if (config.runRLAIF) {
      reportProgress({ status: 'rlaif', phase: 'amplifying_feedback', progress: 0 });
      const rlaifResult = await this.runRLAIFAmplification(userId, migrationId);
      rlaifPairs = rlaifResult.syntheticPairs;
      preferencePatterns = rlaifResult.preferencePatterns;
      reportProgress({ 
        status: 'rlaif', 
        phase: 'rlaif_complete', 
        progress: 1,
        rlaifPairsGenerated: rlaifPairs.length 
      });
    }

    // Phase 2: Extract Personality Profile
    reportProgress({ status: 'extracting_profile', phase: 'analyzing_training_data', progress: 0 });
    const profile = await this.extractPersonalityProfile(userId);
    reportProgress({ status: 'extracting_profile', phase: 'profile_complete', progress: 1 });

    // Phase 3: Distillation (if enabled)
    let distillationPairs: DistillationPair[] = [];
    
    if (config.distillationMode !== 'none') {
      reportProgress({ status: 'distilling', phase: 'generating_responses', progress: 0 });
      distillationPairs = await this.runDistillation(
        userId,
        migrationId,
        profile,
        preferencePatterns,
        (completed, total) => {
          reportProgress({ 
            status: 'distilling', 
            phase: 'generating_responses', 
            progress: completed / total,
            distillationPairsGenerated: completed 
          });
        }
      );
      reportProgress({ 
        status: 'distilling', 
        phase: 'distillation_complete', 
        progress: 1,
        distillationPairsGenerated: distillationPairs.length 
      });
    }

    // Phase 4: Reward Calibration (if enabled)
    let calibratedRewardData: CalibratedRewardData[] = [];
    
    if (config.recalibrateReward) {
      reportProgress({ status: 'calibrating_reward', phase: 'assessing_distribution', progress: 0 });
      
      // Get original reward data
      const { data: rewardData } = await supabase
        .from('reward_training_data')
        .select('prompt, response, reward')
        .eq('user_id', userId);

      const rewardPoints = (rewardData || []) as RewardDataPoint[];

      // If we don't have preference patterns yet, extract them
      if (preferencePatterns.positivePatterns.length === 0) {
        const { data: feedback } = await supabase
          .from('feedback_logs')
          .select('id, prompt, response, feedback, comment')
          .eq('user_id', userId)
          .not('prompt', 'is', null);

        preferencePatterns = await this.rlaifAmplifier.extractPreferencePatterns(
          (feedback || []) as FeedbackEntry[]
        );
      }

      const calibrationResult = await this.rewardCalibrator.calibrate(
        sourceModelId,
        config.targetBaseModel,
        rewardPoints,
        preferencePatterns,
        (phase, completed, total) => {
          reportProgress({ 
            status: 'calibrating_reward', 
            phase, 
            progress: completed / total 
          });
        }
      );

      calibratedRewardData = calibrationResult.calibratedData;
      reportProgress({ status: 'calibrating_reward', phase: 'calibration_complete', progress: 1 });
    }

    // Phase 5: Prepare Final Data Package
    reportProgress({ status: 'preparing_data', phase: 'combining_data', progress: 0 });
    const trainingPackage = await this.prepareTrainingPackage(
      userId,
      migrationId,
      config,
      profile,
      preferencePatterns,
      distillationPairs,
      rlaifPairs,
      calibratedRewardData
    );

    // Update migration status
    await supabase
      .from('model_migrations')
      .update({
        status: 'ready_to_train',
        phase: 'data_prepared',
        training_pair_count: trainingPackage.trainingPairs.length,
        distillation_pair_count: distillationPairs.length,
        dpo_pair_count: trainingPackage.dpoPairs.length
      })
      .eq('id', migrationId);

    reportProgress({ 
      status: 'ready_to_train', 
      phase: 'data_prepared', 
      progress: 1,
      totalTrainingPairs: trainingPackage.trainingPairs.length,
      dpoPairsCount: trainingPackage.dpoPairs.length
    });

    return trainingPackage;
  }

  /**
   * Extract personality profile
   */
  private async extractPersonalityProfile(userId: string): Promise<PersonalityProfile> {
    const { data: pairs } = await supabase
      .from('training_pairs')
      .select('user_content, assistant_content, quality_score')
      .eq('user_id', userId)
      .order('quality_score', { ascending: false });

    if (!pairs || pairs.length < 10) {
      throw new Error('Insufficient training data for personality extraction');
    }

    const { data: positiveFeedback } = await supabase
      .from('feedback_logs')
      .select('response')
      .eq('user_id', userId)
      .gte('feedback', 1);

    const { data: negativeFeedback } = await supabase
      .from('feedback_logs')
      .select('response')
      .eq('user_id', userId)
      .lte('feedback', -1);

    const profile = await this.extractor.extractProfile(
      pairs as TrainingPair[],
      {
        positive: positiveFeedback?.map(f => f.response).filter(Boolean) as string[] || [],
        negative: negativeFeedback?.map(f => f.response).filter(Boolean) as string[] || []
      }
    );

    // Save to database
    await supabase
      .from('personality_profiles')
      .insert({
        user_id: userId,
        style_analysis: profile.style_analysis,
        constitutional_rules: profile.constitutional_rules,
        vocabulary_signature: profile.vocabulary_signature,
        topic_dispositions: profile.topic_dispositions,
        source_pair_count: profile.source_pair_count,
        confidence_score: profile.confidence_score
      });

    return profile;
  }

  /**
   * Run distillation with preference focus if configured
   */
  private async runDistillation(
    userId: string,
    migrationId: string,
    profile: PersonalityProfile,
    preferencePatterns: { positivePatterns: string[]; negativePatterns: string[]; summary: string },
    onProgress?: (completed: number, total: number) => void
  ): Promise<DistillationPair[]> {
    const { data: migration } = await supabase
      .from('model_migrations')
      .select('source_model_id, config')
      .eq('id', migrationId)
      .single();

    if (!migration) throw new Error('Migration not found');
    
    const config = migration.config as AdaptiveMigrationConfig;
    const sourceModelId = migration.source_model_id;

    // Fetch base prompts
    const { data: corpusPrompts } = await supabase
      .from('prompt_corpus')
      .select('prompt, category, subcategory, difficulty')
      .limit(200);

    let prompts = (corpusPrompts || []) as CorpusPrompt[];

    // For preference-focused mode, prioritize prompts that reveal preferences
    if (config.distillationMode === 'preference_focused') {
      // Add prompts specifically designed to elicit preference-revealing responses
      const preferencePrompts = await this.distiller.generateDiversePrompts(
        profile,
        [],
        Math.floor(config.distillationCount * 0.7)  // 70% preference-focused
      );
      
      prompts = [
        ...preferencePrompts,
        ...prompts.slice(0, Math.floor(config.distillationCount * 0.3))  // 30% general
      ];
    } else {
      // Full mode - comprehensive coverage
      prompts = await this.distiller.generateDiversePrompts(
        profile,
        prompts,
        config.distillationCount
      );
    }

    // Run distillation
    const pairs = await this.distiller.distill(
      sourceModelId,
      prompts.slice(0, config.distillationCount),
      profile,
      onProgress
    );

    // Filter by quality
    const qualityPairs = this.distiller.filterByQuality(
      pairs,
      config.qualityThreshold,
      config.styleConsistencyThreshold
    );

    // Save to database
    const { data: sourceExport } = await supabase
      .from('model_migrations')
      .select('source_export_id')
      .eq('id', migrationId)
      .single();

    for (const pair of qualityPairs) {
      await supabase
        .from('distillation_pairs')
        .insert({
          user_id: userId,
          prompt: pair.prompt,
          response: pair.response,
          source_model_id: sourceModelId,
          source_export_id: sourceExport?.source_export_id,
          quality_score: pair.quality_score,
          style_consistency_score: pair.style_consistency_score,
          prompt_category: pair.prompt_category
        });
    }

    return qualityPairs;
  }

  /**
   * Prepare the final training package
   */
  private async prepareTrainingPackage(
    userId: string,
    migrationId: string,
    config: AdaptiveMigrationConfig,
    profile: PersonalityProfile,
    preferencePatterns: { positivePatterns: string[]; negativePatterns: string[]; summary: string },
    distillationPairs: DistillationPair[],
    rlaifPairs: SyntheticPreferencePair[],
    calibratedRewardData: CalibratedRewardData[]
  ): Promise<AdaptiveTrainingPackage> {
    const { data: migration } = await supabase
      .from('model_migrations')
      .select('*')
      .eq('id', migrationId)
      .single();

    if (!migration) throw new Error('Migration not found');

    const trainingPairs: AdaptiveTrainingPackage['trainingPairs'] = [];

    // Include raw training pairs
    if (config.includeRawPairs) {
      const { data: rawPairs } = await supabase
        .from('training_pairs')
        .select('system_prompt, user_content, assistant_content, quality_score')
        .eq('user_id', userId)
        .gte('quality_score', config.qualityThreshold);

      for (const pair of rawPairs || []) {
        trainingPairs.push({
          system_prompt: pair.system_prompt,
          user_content: pair.user_content,
          assistant_content: pair.assistant_content,
          source: 'raw',
          quality_score: pair.quality_score
        });
      }
    }

    // Include distillation pairs
    if (config.includeDistillation) {
      for (const pair of distillationPairs) {
        trainingPairs.push({
          system_prompt: 'You are a digital ghost.',
          user_content: pair.prompt,
          assistant_content: pair.response,
          source: 'distillation',
          quality_score: pair.quality_score
        });
      }
    }

    // Compile DPO pairs (human + RLAIF)
    const dpoPairs: AdaptiveTrainingPackage['dpoPairs'] = [];

    if (config.includeDpoPairs) {
      const { data: humanDPO } = await supabase
        .from('preference_pairs')
        .select('prompt, chosen_response, rejected_response')
        .eq('user_id', userId);

      for (const pair of humanDPO || []) {
        dpoPairs.push({
          prompt: pair.prompt,
          chosen: pair.chosen_response,
          rejected: pair.rejected_response,
          source: 'human'
        });
      }
    }

    if (config.includeRLAIFPairs) {
      for (const pair of rlaifPairs) {
        dpoPairs.push({
          prompt: pair.prompt,
          chosen: pair.chosen,
          rejected: pair.rejected,
          source: 'rlaif',
          confidence: pair.confidence
        });
      }
    }

    // Generate constitutional prompt
    const constitutionalPrompt = this.extractor.generateConstitutionalPrompt(profile);

    // Get assessment for metadata
    const assessment = await this.assessRLHFIntensity(userId);

    return {
      trainingPairs,
      dpoPairs,
      rewardData: calibratedRewardData,
      personalityProfile: profile,
      constitutionalPrompt,
      preferencePatterns,
      metadata: {
        sourceModelId: migration.source_model_id,
        targetBaseModel: config.targetBaseModel,
        migrationId,
        config,
        assessment
      }
    };
  }

  /**
   * Export as JSONL with constitutional prompt
   */
  exportAsJSONL(data: AdaptiveTrainingPackage): string {
    const systemPrompt = `You are a digital ghost.\n\n${data.constitutionalPrompt}`;
    
    return data.trainingPairs
      .map(pair => JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: pair.user_content },
          { role: 'assistant', content: pair.assistant_content }
        ]
      }))
      .join('\n');
  }

  /**
   * Export DPO pairs as JSONL
   */
  exportDPOAsJSONL(data: AdaptiveTrainingPackage): string {
    return data.dpoPairs
      .map(pair => JSON.stringify({
        prompt: pair.prompt,
        chosen: pair.chosen,
        rejected: pair.rejected
      }))
      .join('\n');
  }

  /**
   * Export reward data as JSONL
   */
  exportRewardAsJSONL(data: AdaptiveTrainingPackage): string {
    return data.rewardData
      .map(d => JSON.stringify({
        prompt: d.prompt,
        response: d.response,
        reward: d.predicted_reward
      }))
      .join('\n');
  }

  /**
   * Update migration status
   */
  private async updateStatus(
    migrationId: string,
    status: AdaptiveMigrationStatus['status'],
    phase: string
  ): Promise<void> {
    await supabase
      .from('model_migrations')
      .update({ status, phase })
      .eq('id', migrationId);
  }
}

