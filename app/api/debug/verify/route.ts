import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

interface VerificationResult {
    phase: string;
    success: boolean;
    before: number;
    after: number;
    delta: number;
    message: string;
}

/**
 * POST /api/debug/verify
 * Phase-level verification for agentic workflows.
 * 
 * Body: { userId: string, phase: 'ingestion' | 'rlhf' | 'training' | 'all' }
 * 
 * Returns verification status for each phase based on database state changes.
 */
export async function POST(req: Request) {
    try {
        const { userId, phase = 'all', baseline } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400 });
        }

        const results: VerificationResult[] = [];

        // Get current counts
        const [entries, memories, pairs, feedback, preferences] = await Promise.all([
            supabase.from('entries').select('*', { count: 'exact', head: true }).eq('user_id', userId),
            supabase.from('memory_fragments').select('*', { count: 'exact', head: true }).eq('user_id', userId),
            supabase.from('training_pairs').select('*', { count: 'exact', head: true }).eq('user_id', userId),
            supabase.from('feedback_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId),
            supabase.from('preference_pairs').select('*', { count: 'exact', head: true }).eq('user_id', userId)
        ]);

        const current = {
            entries: entries.count || 0,
            memories: memories.count || 0,
            pairs: pairs.count || 0,
            feedback: feedback.count || 0,
            preferences: preferences.count || 0
        };

        // If baseline provided, calculate deltas
        if (baseline) {
            if (phase === 'ingestion' || phase === 'all') {
                const entryDelta = current.entries - (baseline.entries || 0);
                const memoryDelta = current.memories - (baseline.memories || 0);
                const pairDelta = current.pairs - (baseline.pairs || 0);

                results.push({
                    phase: 'ingestion.entries',
                    success: entryDelta > 0,
                    before: baseline.entries || 0,
                    after: current.entries,
                    delta: entryDelta,
                    message: entryDelta > 0 ? 'Raw carbon stored' : 'No entries saved'
                });

                results.push({
                    phase: 'ingestion.memories',
                    success: memoryDelta > 0,
                    before: baseline.memories || 0,
                    after: current.memories,
                    delta: memoryDelta,
                    message: memoryDelta > 0 ? 'Memory fragments indexed' : 'No memories stored'
                });

                results.push({
                    phase: 'ingestion.training',
                    success: pairDelta > 0,
                    before: baseline.pairs || 0,
                    after: current.pairs,
                    delta: pairDelta,
                    message: pairDelta > 0 ? 'Training pairs generated' : 'No training pairs'
                });
            }

            if (phase === 'rlhf' || phase === 'all') {
                const feedbackDelta = current.feedback - (baseline.feedback || 0);
                const prefDelta = current.preferences - (baseline.preferences || 0);

                results.push({
                    phase: 'rlhf.feedback',
                    success: feedbackDelta >= 0, // 0 is ok for rlhf
                    before: baseline.feedback || 0,
                    after: current.feedback,
                    delta: feedbackDelta,
                    message: feedbackDelta > 0 ? 'Feedback collected' : 'No new feedback'
                });

                results.push({
                    phase: 'rlhf.preferences',
                    success: prefDelta >= 0,
                    before: baseline.preferences || 0,
                    after: current.preferences,
                    delta: prefDelta,
                    message: prefDelta > 0 ? 'Preference pairs created' : 'No new preferences'
                });
            }
        }

        return NextResponse.json({
            success: results.every(r => r.success),
            current,
            baseline: baseline || null,
            results,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

/**
 * GET /api/debug/verify?userId=xxx
 * Get current baseline for verification.
 */
export async function GET(req: Request) {
    const userId = new URL(req.url).searchParams.get('userId');
    if (!userId) {
        return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const [entries, memories, pairs, feedback, preferences] = await Promise.all([
        supabase.from('entries').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('memory_fragments').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('training_pairs').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('feedback_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('preference_pairs').select('*', { count: 'exact', head: true }).eq('user_id', userId)
    ]);

    return NextResponse.json({
        baseline: {
            entries: entries.count || 0,
            memories: memories.count || 0,
            pairs: pairs.count || 0,
            feedback: feedback.count || 0,
            preferences: preferences.count || 0
        },
        timestamp: new Date().toISOString()
    });
}
