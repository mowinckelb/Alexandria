import { createClient } from '@supabase/supabase-js';
import { PersonalityExtractor, PersonalityProfile, TrainingPair } from './personality-extractor';
import { Distiller, DistillationPair, CorpusPrompt } from './distiller';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * Migration configuration
 */
export interface MigrationConfig {
  targetBaseModel: string;        // e.g., "meta-llama/Llama-4-8B-Instruct"
  distillationCount: number;      // How many synthetic pairs to generate
  qualityThreshold: number;       // Min quality for training data (0-1)
  includeRawPairs: boolean;       // Include original training pairs
  includeDpoPairs: boolean;       // Include preference pairs
  includeDistillation: boolean;   // Include distilled pairs from old model
}

/**
 * Migration status for tracking progress
 */
export interface MigrationStatus {
  id: string;
  status: 'pending' | 'extracting_profile' | 'distilling' | 'preparing_data' | 'ready_to_train' | 'training' | 'validating' | 'completed' | 'failed';
  phase: string;
  progress: number;
  distillation_pair_count: number;
  training_pair_count: number;
  dpo_pair_count: number;
  error?: string;
}

/**
 * Training data package ready for export
 */
export interface TrainingDataPackage {
  trainingPairs: Array<{
    system_prompt: string;
    user_content: string;
    assistant_content: string;
    source: 'raw' | 'distillation' | 'rlhf';
  }>;
  dpoPairs: Array<{
    prompt: string;
    chosen: string;
    rejected: string;
  }>;
  personalityProfile: PersonalityProfile;
  constitutionalPrompt: string;
  metadata: {
    sourceModelId: string;
    targetBaseModel: string;
    totalPairs: number;
    migrationId: string;
  };
}

/**
 * The Migration Orchestrator coordinates the entire model-to-model transfer
 * It ensures personality continuity across base model upgrades
 */
export class MigrationOrchestrator {
  private extractor: PersonalityExtractor;
  private distiller: Distiller;

  constructor() {
    this.extractor = new PersonalityExtractor();
    this.distiller = new Distiller();
  }

  /**
   * Check if a user is ready for migration
   */
  async checkReadiness(userId: string): Promise<{
    ready: boolean;
    stats: {
      training_pairs: number;
      feedback_logs: number;
      preference_pairs: number;
      distillation_pairs: number;
      has_personality_profile: boolean;
      has_active_migration: boolean;
    };
    recommendations: string[];
  }> {
    const { data } = await supabase.rpc('get_migration_readiness', { p_user_id: userId });
    const stats = data || {
      training_pairs: 0,
      feedback_logs: 0,
      preference_pairs: 0,
      distillation_pairs: 0,
      has_personality_profile: false,
      active_migrations: 0
    };

    const recommendations: string[] = [];
    let ready = true;

    if (stats.training_pairs < 50) {
      recommendations.push(`Need at least 50 training pairs (have ${stats.training_pairs}). Ingest more content.`);
      ready = false;
    }
    if (stats.training_pairs < 200) {
      recommendations.push(`For best results, aim for 200+ training pairs (have ${stats.training_pairs}).`);
    }
    if (stats.preference_pairs < 10) {
      recommendations.push(`DPO pairs improve transfer quality. Collect more feedback with regenerations.`);
    }
    if (stats.active_migrations > 0) {
      recommendations.push('A migration is already in progress. Wait for it to complete.');
      ready = false;
    }

    return {
      ready,
      stats: {
        training_pairs: stats.training_pairs,
        feedback_logs: stats.feedback_logs,
        preference_pairs: stats.preference_pairs,
        distillation_pairs: stats.distillation_pairs,
        has_personality_profile: stats.has_personality_profile,
        has_active_migration: stats.active_migrations > 0
      },
      recommendations
    };
  }

  /**
   * Start a new migration (creates migration record, doesn't execute)
   */
  async initiateMigration(
    userId: string,
    config: MigrationConfig
  ): Promise<{ migrationId: string; status: MigrationStatus }> {
    // Get current active model
    const { data: activeModel } = await supabase.rpc('get_active_model', { p_user_id: userId });
    const sourceModelId = activeModel || 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo';

    // Get source export (most recent completed training)
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
        target_base_model: config.targetBaseModel,
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
      status: {
        id: migration.id,
        status: 'pending',
        phase: 'initialized',
        progress: 0,
        distillation_pair_count: 0,
        training_pair_count: 0,
        dpo_pair_count: 0
      }
    };
  }

  /**
   * Extract and save personality profile
   */
  async extractPersonalityProfile(userId: string): Promise<PersonalityProfile> {
    // Fetch training pairs
    const { data: pairs } = await supabase
      .from('training_pairs')
      .select('user_content, assistant_content, quality_score')
      .eq('user_id', userId)
      .order('quality_score', { ascending: false });

    if (!pairs || pairs.length < 10) {
      throw new Error('Insufficient training data for personality extraction');
    }

    // Fetch feedback for contrast
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

    // Extract profile
    const profile = await this.extractor.extractProfile(
      pairs as TrainingPair[],
      {
        positive: positiveFeedback?.map(f => f.response).filter(Boolean) as string[] || [],
        negative: negativeFeedback?.map(f => f.response).filter(Boolean) as string[] || []
      }
    );

    // Save to database
    const { error } = await supabase
      .from('personality_profiles')
      .insert({
        user_id: userId,
        style_analysis: profile.style_analysis,
        constitutional_rules: profile.constitutional_rules,
        vocabulary_signature: profile.vocabulary_signature,
        topic_dispositions: profile.topic_dispositions,
        source_pair_count: profile.source_pair_count,
        source_feedback_count: (positiveFeedback?.length || 0) + (negativeFeedback?.length || 0),
        confidence_score: profile.confidence_score
      });

    if (error) {
      console.error('Failed to save personality profile:', error);
    }

    return profile;
  }

  /**
   * Run the distillation phase: generate synthetic data from old model
   */
  async runDistillation(
    userId: string,
    migrationId: string,
    onProgress?: (status: MigrationStatus) => void
  ): Promise<DistillationPair[]> {
    // Update status
    await this.updateMigrationStatus(migrationId, 'distilling', 'fetching_prompts');

    // Get migration config
    const { data: migration } = await supabase
      .from('model_migrations')
      .select('source_model_id, config')
      .eq('id', migrationId)
      .single();

    if (!migration) {
      throw new Error('Migration not found');
    }

    const config = migration.config as MigrationConfig;
    const sourceModelId = migration.source_model_id;

    // Get personality profile
    const { data: profileData } = await supabase.rpc('get_personality_profile', { p_user_id: userId });
    const profile = profileData as PersonalityProfile | null;

    // Fetch base prompts from corpus
    const { data: corpusPrompts } = await supabase
      .from('prompt_corpus')
      .select('prompt, category, subcategory, difficulty')
      .limit(200);

    // Generate additional prompts if needed
    const basePrompts = (corpusPrompts || []) as CorpusPrompt[];
    let allPrompts = basePrompts;

    if (profile && config.distillationCount > basePrompts.length) {
      await this.updateMigrationStatus(migrationId, 'distilling', 'generating_prompts');
      allPrompts = await this.distiller.generateDiversePrompts(
        profile,
        basePrompts,
        config.distillationCount
      );
    }

    // Run distillation
    await this.updateMigrationStatus(migrationId, 'distilling', 'generating_responses');
    
    const pairs = await this.distiller.distill(
      sourceModelId,
      allPrompts.slice(0, config.distillationCount),
      profile || undefined,
      (completed, total) => {
        if (onProgress) {
          onProgress({
            id: migrationId,
            status: 'distilling',
            phase: 'generating_responses',
            progress: completed / total,
            distillation_pair_count: completed,
            training_pair_count: 0,
            dpo_pair_count: 0
          });
        }
      }
    );

    // Filter by quality
    const qualityPairs = this.distiller.filterByQuality(pairs, config.qualityThreshold);

    // Save to database
    await this.updateMigrationStatus(migrationId, 'distilling', 'saving_pairs');
    
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

    // Update migration record
    await supabase
      .from('model_migrations')
      .update({
        distillation_pair_count: qualityPairs.length,
        distillation_completed_at: new Date().toISOString()
      })
      .eq('id', migrationId);

    return qualityPairs;
  }

  /**
   * Prepare the complete training data package for the new model
   */
  async prepareTrainingData(
    userId: string,
    migrationId: string
  ): Promise<TrainingDataPackage> {
    await this.updateMigrationStatus(migrationId, 'preparing_data', 'gathering_data');

    // Get migration config
    const { data: migration } = await supabase
      .from('model_migrations')
      .select('*')
      .eq('id', migrationId)
      .single();

    if (!migration) {
      throw new Error('Migration not found');
    }

    const config = migration.config as MigrationConfig;
    const trainingPairs: TrainingDataPackage['trainingPairs'] = [];

    // Include raw training pairs if configured
    if (config.includeRawPairs) {
      const { data: rawPairs } = await supabase
        .from('training_pairs')
        .select('system_prompt, user_content, assistant_content')
        .eq('user_id', userId)
        .gte('quality_score', config.qualityThreshold);

      for (const pair of rawPairs || []) {
        trainingPairs.push({
          system_prompt: pair.system_prompt,
          user_content: pair.user_content,
          assistant_content: pair.assistant_content,
          source: 'raw'
        });
      }
    }

    // Include distillation pairs if configured
    if (config.includeDistillation) {
      const { data: distillPairs } = await supabase
        .from('distillation_pairs')
        .select('prompt, response')
        .eq('user_id', userId)
        .is('used_in_migration', null)
        .gte('quality_score', config.qualityThreshold);

      for (const pair of distillPairs || []) {
        trainingPairs.push({
          system_prompt: 'You are a digital ghost.',
          user_content: pair.prompt,
          assistant_content: pair.response,
          source: 'distillation'
        });
      }

      // Mark as used
      if (distillPairs && distillPairs.length > 0) {
        const pairIds = distillPairs.map((p: { prompt: string }) => p.prompt); // We need IDs, this is simplified
        // In real implementation, we'd track IDs and use mark_distillation_used RPC
      }
    }

    // Get DPO pairs
    let dpoPairs: TrainingDataPackage['dpoPairs'] = [];
    if (config.includeDpoPairs) {
      const { data: prefPairs } = await supabase
        .from('preference_pairs')
        .select('prompt, chosen_response, rejected_response')
        .eq('user_id', userId)
        .is('export_id', null);

      dpoPairs = (prefPairs || []).map(p => ({
        prompt: p.prompt,
        chosen: p.chosen_response,
        rejected: p.rejected_response
      }));
    }

    // Get personality profile
    const { data: profileData } = await supabase.rpc('get_personality_profile', { p_user_id: userId });
    const profile = profileData as PersonalityProfile;

    // Generate constitutional prompt
    const constitutionalPrompt = this.extractor.generateConstitutionalPrompt(profile);

    // Update migration stats
    await supabase
      .from('model_migrations')
      .update({
        training_pair_count: trainingPairs.filter(p => p.source === 'raw').length,
        distillation_pair_count: trainingPairs.filter(p => p.source === 'distillation').length,
        dpo_pair_count: dpoPairs.length,
        status: 'ready_to_train',
        phase: 'data_prepared'
      })
      .eq('id', migrationId);

    return {
      trainingPairs,
      dpoPairs,
      personalityProfile: profile,
      constitutionalPrompt,
      metadata: {
        sourceModelId: migration.source_model_id,
        targetBaseModel: config.targetBaseModel,
        totalPairs: trainingPairs.length,
        migrationId
      }
    };
  }

  /**
   * Export training data as JSONL for Together AI fine-tuning
   */
  exportAsJSONL(data: TrainingDataPackage, includeConstitution: boolean = true): string {
    const lines: string[] = [];
    const systemPrompt = includeConstitution 
      ? `You are a digital ghost.\n\n${data.constitutionalPrompt}`
      : 'You are a digital ghost.';

    for (const pair of data.trainingPairs) {
      const entry = {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: pair.user_content },
          { role: 'assistant', content: pair.assistant_content }
        ]
      };
      lines.push(JSON.stringify(entry));
    }

    return lines.join('\n');
  }

  /**
   * Export DPO pairs as JSONL for preference training
   */
  exportDPOAsJSONL(data: TrainingDataPackage): string {
    const lines: string[] = [];

    for (const pair of data.dpoPairs) {
      const entry = {
        prompt: pair.prompt,
        chosen: pair.chosen,
        rejected: pair.rejected
      };
      lines.push(JSON.stringify(entry));
    }

    return lines.join('\n');
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(migrationId: string): Promise<MigrationStatus | null> {
    const { data } = await supabase
      .from('model_migrations')
      .select('*')
      .eq('id', migrationId)
      .single();

    if (!data) return null;

    return {
      id: data.id,
      status: data.status,
      phase: data.phase,
      progress: this.calculateProgress(data),
      distillation_pair_count: data.distillation_pair_count || 0,
      training_pair_count: data.training_pair_count || 0,
      dpo_pair_count: data.dpo_pair_count || 0
    };
  }

  /**
   * Update migration status
   */
  private async updateMigrationStatus(
    migrationId: string,
    status: MigrationStatus['status'],
    phase: string
  ): Promise<void> {
    const updates: Record<string, unknown> = { status, phase };
    
    if (status === 'distilling' && phase === 'fetching_prompts') {
      updates.started_at = new Date().toISOString();
    }

    await supabase
      .from('model_migrations')
      .update(updates)
      .eq('id', migrationId);
  }

  /**
   * Calculate overall progress percentage
   */
  private calculateProgress(migration: Record<string, unknown>): number {
    const statusWeights: Record<string, number> = {
      'pending': 0,
      'extracting_profile': 0.1,
      'distilling': 0.4,
      'preparing_data': 0.6,
      'ready_to_train': 0.7,
      'training': 0.85,
      'validating': 0.95,
      'completed': 1,
      'failed': 0
    };

    return statusWeights[migration.status as string] || 0;
  }
}

