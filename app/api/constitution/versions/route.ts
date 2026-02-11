/**
 * Constitution Versions API
 * GET: Get version history
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getConstitutionManager } from '@/lib/factory';

// ============================================================================
// GET: Get version history
// ============================================================================

// Use regex instead of .uuid() to accept test UUIDs like 00000000-0000-0000-0000-000000000001
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const GetQuerySchema = z.object({
  userId: z.string().regex(uuidPattern, 'Invalid UUID format'),
  limit: z.coerce.number().min(1).max(100).optional().default(20)
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params: Record<string, string> = {};
    const userId = searchParams.get('userId');
    const limit = searchParams.get('limit');
    if (userId) params.userId = userId;
    if (limit) params.limit = limit;

    const parsed = GetQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const manager = getConstitutionManager();
    const history = await manager.getVersionHistory(parsed.data.userId, parsed.data.limit);

    if (history.length === 0) {
      return NextResponse.json({
        versions: [],
        message: 'No constitution versions found for this user'
      });
    }

    return NextResponse.json({
      versions: history,
      totalVersions: history.length,
      activeVersion: history.find(v => v.isActive)?.version || null
    });

  } catch (error) {
    console.error('[API/constitution/versions] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get version history' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST: Restore a specific version
// ============================================================================

const RestoreBodySchema = z.object({
  userId: z.string().regex(uuidPattern, 'Invalid UUID format'),
  version: z.number().int().positive()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RestoreBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const manager = getConstitutionManager();
    const restored = await manager.restoreVersion(parsed.data.userId, parsed.data.version);

    if (!restored) {
      return NextResponse.json(
        { error: `Version ${parsed.data.version} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Restored version ${parsed.data.version} as new version ${restored.version}`,
      newVersion: restored.version,
      createdAt: restored.createdAt
    });

  } catch (error) {
    console.error('[API/constitution/versions] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to restore version' },
      { status: 500 }
    );
  }
}
