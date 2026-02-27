import { NextResponse } from 'next/server';
import { getRLHFTools } from '@/lib/factory';

const { feedbackProcessor } = getRLHFTools();

/**
 * GET /api/rlhf?userId=xxx
 * Returns RLHF stats and training readiness
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const stats = await feedbackProcessor.getStats(userId);

    return NextResponse.json({
      ...stats,
      approaches: {
        dpo: {
          name: 'Direct Preference Optimization',
          description: 'Train directly on preference pairs without reward model',
          ready: stats.dpoReady,
          dataPoints: stats.preferencePairs,
          minimumRequired: 100,
          pros: ['Simpler pipeline', 'More stable training', 'Works well with limited data'],
          cons: ['Requires A/B pairs (same prompt, different responses)']
        },
        reward_model: {
          name: 'Reward Model + PPO',
          description: 'Train a reward model, then use it for RL optimization',
          ready: stats.rewardModelReady,
          dataPoints: stats.rewardDataPoints,
          minimumRequired: 500,
          pros: ['Reusable reward signal', 'Can generate more training signal'],
          cons: ['Complex pipeline', 'Reward hacking risks']
        },
        lora_enhancement: {
          name: 'LoRA Enhancement (Current Pipeline)',
          description: 'Add highly-rated responses to fine-tuning data',
          ready: stats.loraEnhancementReady,
          dataPoints: stats.positiveResponses,
          minimumRequired: 10,
          pros: ['Uses existing pipeline', 'Immediate integration', 'Simple'],
          cons: ['Limited signal (only positive examples)']
        }
      },
      recommendation: stats.recommendedApproach
    });

  } catch (error) {
    console.error('RLHF stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/rlhf
 * Actions: export_dpo, export_reward, inject_lora, generate_pairs
 */
export async function POST(req: Request) {
  try {
    const { action, userId, options = {} } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    switch (action) {
      case 'export_dpo': {
        // Export DPO training dataset
        const jsonl = await feedbackProcessor.exportDPODataset(userId);
        const pairs = jsonl.split('\n').filter(Boolean);
        
        return NextResponse.json({
          format: 'dpo_jsonl',
          pairCount: pairs.length,
          data: jsonl,
          usage: 'Upload to Fireworks AI with DPO training format'
        });
      }

      case 'export_reward': {
        // Export reward model training dataset
        const jsonl = await feedbackProcessor.exportRewardDataset(userId);
        const points = jsonl.split('\n').filter(Boolean);
        
        return NextResponse.json({
          format: 'reward_jsonl',
          pointCount: points.length,
          data: jsonl,
          usage: 'For training a reward model (custom pipeline)'
        });
      }

      case 'inject_lora': {
        // Inject highly-rated responses into training_pairs
        const minRating = options.minRating ?? 1;
        const count = await feedbackProcessor.injectEnhancedPairs(userId, minRating);
        
        return NextResponse.json({
          success: true,
          injectedPairs: count,
          message: `Added ${count} high-quality response(s) to training pipeline`
        });
      }

      case 'generate_pairs': {
        // Generate preference pairs from feedback
        const minMargin = options.minMargin ?? 2;
        const pairs = await feedbackProcessor.generatePreferencePairs(userId, minMargin);
        
        return NextResponse.json({
          success: true,
          pairsGenerated: pairs.length,
          pairs: pairs.slice(0, 10), // Preview first 10
          message: pairs.length > 10 ? `${pairs.length} pairs total (showing 10)` : undefined
        });
      }

      default:
        return NextResponse.json({ 
          error: 'Invalid action', 
          validActions: ['export_dpo', 'export_reward', 'inject_lora', 'generate_pairs'] 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('RLHF action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

