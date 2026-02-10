/**
 * Telegram Setup API
 * Configure webhook URL for production
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTelegramClient } from '@/lib/interfaces/telegram/client';

// ============================================================================
// POST: Set webhook URL
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const { webhookUrl } = await request.json();

    if (!webhookUrl) {
      // Auto-detect from request
      const host = request.headers.get('host');
      const protocol = host?.includes('localhost') ? 'http' : 'https';
      const autoUrl = `${protocol}://${host}/api/telegram/webhook`;
      
      return NextResponse.json({
        error: 'webhookUrl required',
        suggestion: autoUrl,
        example: { webhookUrl: autoUrl }
      }, { status: 400 });
    }

    const client = getTelegramClient();
    const success = await client.setWebhook(webhookUrl);

    if (success) {
      return NextResponse.json({
        success: true,
        webhookUrl,
        message: 'Webhook configured! Your bot is now active.'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to set webhook. Check your bot token.'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[Telegram Setup] Error:', error);
    return NextResponse.json({
      error: 'Setup failed'
    }, { status: 500 });
  }
}

// ============================================================================
// DELETE: Remove webhook (for local development)
// ============================================================================

export async function DELETE() {
  try {
    const client = getTelegramClient();
    const success = await client.deleteWebhook();

    return NextResponse.json({
      success,
      message: success 
        ? 'Webhook removed. Use polling for local development.'
        : 'Failed to remove webhook.'
    });

  } catch (error) {
    console.error('[Telegram Setup] Delete error:', error);
    return NextResponse.json({
      error: 'Failed to remove webhook'
    }, { status: 500 });
  }
}
