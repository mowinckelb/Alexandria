import { NextResponse } from 'next/server';
import { 
  AdaptiveMigrationOrchestrator, 
  ADAPTIVE_THRESHOLDS,
  AdaptiveMigrationConfig 
} from '@/lib/modules/migration/adaptive-orchestrator';

const orchestrator = new AdaptiveMigrationOrchestrator();

/**
 * GET /api/migration?userId=xxx
 * Check migration readiness and get RLHF assessment with auto-recommended config
 * 
 * GET /api/migration?migrationId=xxx
 * Get status of a specific migration
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');
  const migrationId = url.searchParams.get('migrationId');

  try {
    // Get specific migration status
    if (migrationId) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
      );

      const { data: migration } = await supabase
        .from('model_migrations')
        .select('*')
        .eq('id', migrationId)
        .single();

      if (!migration) {
        return NextResponse.json({ error: 'Migration not found' }, { status: 404 });
      }

      return NextResponse.json({
        id: migration.id,
        status: migration.status,
        phase: migration.phase,
        config: migration.config,
        source_model_id: migration.source_model_id,
        target_base_model: migration.target_base_model,
        training_pair_count: migration.training_pair_count,
        distillation_pair_count: migration.distillation_pair_count,
        dpo_pair_count: migration.dpo_pair_count,
        created_at: migration.created_at,
        started_at: migration.started_at,
        completed_at: migration.completed_at
      });
    }

    // Get readiness assessment for user
    if (!userId) {
      return NextResponse.json({ error: 'userId or migrationId required' }, { status: 400 });
    }

    // Get RLHF assessment with auto-recommendations (dynamic, Editor-determined)
    const assessment = await orchestrator.assessRLHFIntensity(userId);
    const suggestedConfig = await orchestrator.generateAdaptiveConfig(
      'meta-llama/Meta-Llama-3.1-8B-Instruct-Reference',  // Default, user can override
      userId
    );

    // Get training pair count for readiness
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { count: trainingPairs } = await supabase
      .from('training_pairs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: activeMigrations } = await supabase
      .from('model_migrations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('status', 'in', '("completed","failed")');

    const minPairs = 50;
    const ready = (trainingPairs || 0) >= minPairs && (activeMigrations || 0) === 0;

    return NextResponse.json({
      ready,
      training_pairs: trainingPairs || 0,
      min_required: minPairs,
      has_active_migration: (activeMigrations || 0) > 0,
      
      // RLHF Assessment
      rlhf_assessment: {
        feedback_count: assessment.feedbackCount,
        preference_count: assessment.preferenceCount,
        reward_data_count: assessment.rewardDataCount,
        intensity: assessment.rlhfIntensity,
        reasoning: assessment.reasoning
      },
      
      // Auto-recommended config
      recommended_config: {
        distillation_mode: suggestedConfig.distillationMode,
        distillation_count: suggestedConfig.distillationCount,
        run_rlaif: suggestedConfig.runRLAIF,
        rlaif_target_pairs: suggestedConfig.rlaifTargetPairs,
        recalibrate_reward: suggestedConfig.recalibrateReward
      },
      
      // Thresholds for reference
      thresholds: ADAPTIVE_THRESHOLDS
    });

  } catch (error) {
    console.error('Migration GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/migration
 * Start an adaptive migration or run specific phases
 * 
 * Body: { 
 *   action: 'initiate' | 'run_full' | 'run_rlaif' | 'extract_profile' | 'export_jsonl',
 *   userId: string,
 *   targetBaseModel?: string,  // Required for initiate
 *   migrationId?: string,      // Required for phases after initiate
 *   configOverrides?: Partial<AdaptiveMigrationConfig>  // Optional overrides
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, userId, targetBaseModel, migrationId, configOverrides } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    switch (action) {
      case 'initiate': {
        // Start a new adaptive migration
        const model = targetBaseModel || 'meta-llama/Meta-Llama-3.1-8B-Instruct-Reference';
        
        const result = await orchestrator.initiateAdaptiveMigration(userId, model);
        
        // Apply any config overrides
        if (configOverrides) {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
          );

          const mergedConfig = { ...result.config, ...configOverrides };
          await supabase
            .from('model_migrations')
            .update({ config: mergedConfig })
            .eq('id', result.migrationId);
        }

        return NextResponse.json({
          success: true,
          migration_id: result.migrationId,
          
          // Assessment results
          rlhf_assessment: {
            intensity: result.assessment.rlhfIntensity,
            feedback_count: result.assessment.feedbackCount,
            preference_count: result.assessment.preferenceCount,
            reasoning: result.assessment.reasoning
          },
          
          // Auto-determined config
          config: {
            distillation_mode: result.config.distillationMode,
            distillation_count: result.config.distillationCount,
            run_rlaif: result.config.runRLAIF,
            rlaif_target_pairs: result.config.rlaifTargetPairs,
            recalibrate_reward: result.config.recalibrateReward
          },
          
          message: `Migration initiated with ${result.config.distillationMode} distillation. ` +
            `RLAIF: ${result.config.runRLAIF ? 'enabled' : 'disabled'}. ` +
            `Run 'run_full' to execute the migration.`
        });
      }

      case 'run_full': {
        // Run the full adaptive migration pipeline
        if (!migrationId) {
          return NextResponse.json({ error: 'migrationId required' }, { status: 400 });
        }

        const trainingPackage = await orchestrator.runFullMigration(userId, migrationId);

        return NextResponse.json({
          success: true,
          migration_id: migrationId,
          
          summary: {
            training_pairs: trainingPackage.trainingPairs.length,
            raw_pairs: trainingPackage.trainingPairs.filter(p => p.source === 'raw').length,
            distillation_pairs: trainingPackage.trainingPairs.filter(p => p.source === 'distillation').length,
            dpo_pairs_total: trainingPackage.dpoPairs.length,
            dpo_pairs_human: trainingPackage.dpoPairs.filter(p => p.source === 'human').length,
            dpo_pairs_rlaif: trainingPackage.dpoPairs.filter(p => p.source === 'rlaif').length,
            reward_data_points: trainingPackage.rewardData.length,
            personality_confidence: trainingPackage.personalityProfile.confidence_score
          },
          
          assessment: trainingPackage.metadata.assessment,
          config_used: trainingPackage.metadata.config,
          
          message: 'Migration data prepared. Run export_jsonl to get training files.'
        });
      }

      case 'run_rlaif': {
        // Run only RLAIF amplification
        if (!migrationId) {
          return NextResponse.json({ error: 'migrationId required' }, { status: 400 });
        }

        const result = await orchestrator.runRLAIFAmplification(userId, migrationId);

        return NextResponse.json({
          success: true,
          migration_id: migrationId,
          synthetic_pairs_generated: result.syntheticPairs.length,
          preference_patterns: result.preferencePatterns,
          message: 'RLAIF amplification complete. Synthetic preference pairs added.'
        });
      }

      case 'export_jsonl': {
        // Export training data as JSONL files
        if (!migrationId) {
          return NextResponse.json({ error: 'migrationId required' }, { status: 400 });
        }

        const trainingPackage = await orchestrator.runFullMigration(userId, migrationId);
        
        const trainingJSONL = orchestrator.exportAsJSONL(trainingPackage);
        const dpoJSONL = orchestrator.exportDPOAsJSONL(trainingPackage);
        const rewardJSONL = orchestrator.exportRewardAsJSONL(trainingPackage);

        return NextResponse.json({
          success: true,
          migration_id: migrationId,
          
          // Training data
          training_jsonl: trainingJSONL,
          training_pair_count: trainingPackage.trainingPairs.length,
          
          // DPO data
          dpo_jsonl: dpoJSONL,
          dpo_pair_count: trainingPackage.dpoPairs.length,
          
          // Reward data
          reward_jsonl: rewardJSONL,
          reward_data_count: trainingPackage.rewardData.length,
          
          // Constitutional prompt (for system message)
          constitutional_prompt: trainingPackage.constitutionalPrompt,
          
          // Preference patterns (for reference)
          preference_patterns: trainingPackage.preferencePatterns,
          
          metadata: {
            source_model: trainingPackage.metadata.sourceModelId,
            target_model: trainingPackage.metadata.targetBaseModel,
            config: trainingPackage.metadata.config
          }
        });
      }

      case 'assess': {
        // Just run assessment without initiating migration (dynamic, Editor-determined)
        const assessment = await orchestrator.assessRLHFIntensity(userId, targetBaseModel);
        const suggestedConfig = await orchestrator.generateAdaptiveConfig(
          targetBaseModel || 'meta-llama/Meta-Llama-3.1-8B-Instruct-Reference',
          userId
        );

        return NextResponse.json({
          success: true,
          assessment,
          suggested_config: suggestedConfig
        });
      }

      default:
        return NextResponse.json(
          { 
            error: `Unknown action: ${action}`,
            valid_actions: ['initiate', 'run_full', 'run_rlaif', 'export_jsonl', 'assess']
          },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Migration POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/migration
 * Update migration status (after external training completes)
 * 
 * Body: {
 *   migrationId: string,
 *   status: 'training' | 'validating' | 'completed' | 'failed',
 *   targetExportId?: string,
 *   validationMetrics?: object
 * }
 */
export async function PATCH(req: Request) {
  try {
    const { migrationId, status, targetExportId, validationMetrics } = await req.json();

    if (!migrationId) {
      return NextResponse.json({ error: 'migrationId required' }, { status: 400 });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const updates: Record<string, unknown> = { status };
    
    if (targetExportId) {
      updates.target_export_id = targetExportId;
    }
    
    if (validationMetrics) {
      updates.validation_metrics = validationMetrics;
    }

    // Update phase based on status
    if (status === 'training') {
      updates.phase = 'fine_tuning';
    } else if (status === 'validating') {
      updates.training_completed_at = new Date().toISOString();
      updates.phase = 'a_b_testing';
    } else if (status === 'completed') {
      updates.validation_completed_at = new Date().toISOString();
      updates.completed_at = new Date().toISOString();
      updates.phase = 'graduated';
    } else if (status === 'failed') {
      updates.phase = 'error';
    }

    const { error } = await supabase
      .from('model_migrations')
      .update(updates)
      .eq('id', migrationId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      migration_id: migrationId,
      status,
      phase: updates.phase
    });

  } catch (error) {
    console.error('Migration PATCH error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
