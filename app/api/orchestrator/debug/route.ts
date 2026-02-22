import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrchestrator } from '@/lib/factory';

const QuerySchema = z.object({
  userId: z.string().uuid(),
  query: z.string().min(1),
  privacyMode: z.enum(['private', 'personal', 'professional']).optional(),
  audience: z.enum(['author', 'external']).optional()
});

export async function GET(request: NextRequest) {
  try {
    const parsed = QuerySchema.safeParse({
      userId: request.nextUrl.searchParams.get('userId'),
      query: request.nextUrl.searchParams.get('query'),
      privacyMode: request.nextUrl.searchParams.get('privacyMode') || undefined,
      audience: request.nextUrl.searchParams.get('audience') || undefined
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.issues }, { status: 400 });
    }

    const orchestrator = getOrchestrator();
    const { context, systemPrompt } = await orchestrator.previewContext(
      [{ role: 'user', content: parsed.data.query }],
      parsed.data.userId,
      {
        privacyMode: parsed.data.privacyMode,
        audience: parsed.data.audience
      }
    );

    return NextResponse.json({
      model: context.plmModelId,
      privacyMode: context.privacyMode,
      queryProfile: context.queryProfile,
      weights: context.weights,
      memoryCount: context.memories.length,
      constitutionLoaded: !!context.constitutionDoc,
      promptPreview: systemPrompt.slice(0, 2000)
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
