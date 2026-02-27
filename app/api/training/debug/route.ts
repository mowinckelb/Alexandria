import { NextResponse } from 'next/server';
import { getTrainingTools } from '@/lib/factory';

/**
 * GET /api/training/debug
 * Debug endpoint to check Fireworks AI dataset status
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('fileId');

  const { tuner } = getTrainingTools();

  // List all files
  const files = await tuner.listFiles();
  
  // Get specific file info if provided
  let fileInfo = null;
  if (fileId) {
    fileInfo = await tuner.getFileInfo(fileId);
  }

  return NextResponse.json({
    files: files || [],
    fileInfo,
    message: files ? `Found ${files.length} files` : 'Failed to list files'
  });
}

