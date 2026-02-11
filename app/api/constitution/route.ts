/**
 * Constitution API
 * GET: Retrieve current Constitution (markdown or JSON)
 * PATCH: Update specific section
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getConstitutionManager } from '@/lib/factory';

// ============================================================================
// GET: Get current Constitution
// ============================================================================

// Use regex instead of .uuid() to accept test UUIDs like 00000000-0000-0000-0000-000000000001
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const GetQuerySchema = z.object({
  userId: z.string().regex(uuidPattern, 'Invalid UUID format'),
  format: z.enum(['json', 'markdown']).optional().default('json')
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = {
      userId: searchParams.get('userId'),
      format: searchParams.get('format') || 'json'
    };

    const parsed = GetQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const manager = getConstitutionManager();
    const constitution = await manager.getConstitution(parsed.data.userId);

    if (!constitution) {
      return NextResponse.json(
        { error: 'No constitution found for this user' },
        { status: 404 }
      );
    }

    if (parsed.data.format === 'markdown') {
      return new NextResponse(constitution.content, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `inline; filename="constitution-v${constitution.version}.md"`
        }
      });
    }

    return NextResponse.json({
      id: constitution.id,
      version: constitution.version,
      sections: constitution.sections,
      createdAt: constitution.createdAt,
      changeSummary: constitution.changeSummary
    });

  } catch (error) {
    console.error('[API/constitution] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get constitution' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH: Update specific section
// ============================================================================

const PatchBodySchema = z.object({
  userId: z.string().regex(uuidPattern, 'Invalid UUID format'),
  section: z.enum([
    'coreIdentity',
    'worldview',
    'values',
    'mentalModels',
    'heuristics',
    'communicationPatterns',
    'domainExpertise',
    'boundaries',
    'evolutionNotes'
  ]),
  operation: z.enum(['add', 'update', 'remove']),
  data: z.unknown(),
  changeSummary: z.string().min(1).max(500)
});

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = PatchBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const manager = getConstitutionManager();
    const updated = await manager.updateSection(parsed.data.userId, {
      section: parsed.data.section,
      operation: parsed.data.operation,
      data: parsed.data.data,
      changeSummary: parsed.data.changeSummary
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update constitution. Does one exist for this user?' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      version: updated.version,
      changeSummary: updated.changeSummary,
      createdAt: updated.createdAt
    });

  } catch (error) {
    console.error('[API/constitution] PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update constitution' },
      { status: 500 }
    );
  }
}
