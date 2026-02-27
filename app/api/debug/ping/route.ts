import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPipelineTools } from '@/lib/factory';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

/**
 * GET /api/debug/ping
 * Health check: database, environment, and logic modules.
 */
export async function GET() {
    const status = {
        database: false,
        environment: false,
        logic: false,
        error: null as string | null
    };

    try {
        // 1. Check Database
        const { error: dbError } = await supabase.from('entries').select('id').limit(1);
        if (dbError) throw dbError;
        status.database = true;

        // 2. Check Environment
        const requiredVars = ['GROQ_API_KEY', 'FIREWORKS_API_KEY'];
        status.environment = requiredVars.every(v => !!process.env[v]);

        // 3. Check Logic (Refiner score test)
        const { refiner } = getPipelineTools();
        const score = (refiner as any).scoreQuality("This is a test string for quality scoring. It should be long enough.", "Test prompt");
        status.logic = score > 0;

        return NextResponse.json({
            success: status.database && status.environment && status.logic,
            ...status,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            ...status,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
