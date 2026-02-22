import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrchestrator } from '@/lib/factory';

const PreviewSchema = z.object({
  userId: z.string().uuid(),
  query: z.string().min(1),
  privacyMode: z.enum(['private', 'personal', 'professional']).optional(),
  contactId: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = PreviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const orchestrator = getOrchestrator();
    const preview = await orchestrator.previewContext(
      [{ role: 'user', content: parsed.data.query }],
      parsed.data.userId,
      {
      privacyMode: parsed.data.privacyMode,
      contactId: parsed.data.contactId
      }
    );

    return NextResponse.json({ success: true, preview });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
