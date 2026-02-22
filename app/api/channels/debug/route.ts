import { NextResponse } from 'next/server';
import { getSupportedChannels } from '@/lib/channels';

export async function GET() {
  try {
    const channels = getSupportedChannels();
    return NextResponse.json({
      channels,
      count: channels.length,
      note: 'Channel adapter scaffold for iMessage bridge rollout.'
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
