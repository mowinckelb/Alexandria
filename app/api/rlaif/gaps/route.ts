import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ConstitutionManager } from '@/lib/modules/constitution/manager';

const QuerySchema = z.object({
  userId: z.string().uuid()
});

export async function GET(request: NextRequest) {
  try {
    const parsed = QuerySchema.safeParse({
      userId: request.nextUrl.searchParams.get('userId')
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.issues }, { status: 400 });
    }

    const refresh = request.nextUrl.searchParams.get('refresh');
    const shouldRefresh = refresh === '1' || refresh === 'true';

    const manager = new ConstitutionManager();
    const summary = await manager.getGapSummary(parsed.data.userId, {
      recompute: shouldRefresh
    });

    return NextResponse.json({
      items: summary,
      count: summary.length,
      highestPriority: summary.find((i) => i.priority === 'high')?.section || null
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
