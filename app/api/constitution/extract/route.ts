/**
 * Constitution Extract API
 * POST: Bootstrap Constitution from existing data
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getConstitutionManager } from '@/lib/factory';

// ============================================================================
// POST: Extract Constitution from existing data
// ============================================================================

const ExtractBodySchema = z.object({
  userId: z.string().uuid(),
  sourceData: z.enum(['training_pairs', 'personality_profiles', 'both']).optional().default('both'),
  includeEditorNotes: z.boolean().optional().default(true)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ExtractBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const manager = getConstitutionManager();

    // Check if constitution already exists
    const existing = await manager.getConstitution(parsed.data.userId);
    if (existing) {
      return NextResponse.json(
        { 
          error: 'Constitution already exists for this user',
          existingVersion: existing.version,
          hint: 'Use PATCH /api/constitution to update, or delete existing first'
        },
        { status: 409 }
      );
    }

    // Perform extraction
    console.log(`[API/constitution/extract] Starting extraction for user ${parsed.data.userId}`);
    
    const result = await manager.extractConstitution(parsed.data.userId, {
      sourceData: parsed.data.sourceData,
      includeEditorNotes: parsed.data.includeEditorNotes
    });

    console.log(`[API/constitution/extract] Extraction complete. Coverage: ${(result.coverage * 100).toFixed(1)}%`);

    return NextResponse.json({
      success: true,
      constitution: {
        id: result.constitution.id,
        version: result.constitution.version,
        createdAt: result.constitution.createdAt
      },
      coverage: result.coverage,
      coveragePercent: `${(result.coverage * 100).toFixed(1)}%`,
      sectionsExtracted: result.sectionsExtracted,
      sectionsMissing: result.sectionsMissing,
      message: result.coverage >= 0.8 
        ? 'Good coverage! Constitution is ready for use.'
        : 'Some sections are missing. Continue conversations to fill gaps.'
    });

  } catch (error) {
    console.error('[API/constitution/extract] Error:', error);
    return NextResponse.json(
      { error: 'Failed to extract constitution' },
      { status: 500 }
    );
  }
}
