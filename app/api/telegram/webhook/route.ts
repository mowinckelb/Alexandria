/**
 * Telegram Webhook API
 * Receives updates from Telegram and routes to appropriate handler
 */

import { NextRequest, NextResponse } from 'next/server';
import { TelegramUpdate } from '@/lib/interfaces/telegram/client';
import { getEditor } from '@/lib/factory';

const TELEGRAM_API = 'https://api.telegram.org/bot';

async function sendTelegramMessage(chatId: number, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  
  try {
    const response = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });
    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error('[Telegram] Send failed:', error);
    return false;
  }
}

// ============================================================================
// POST: Receive Telegram webhook updates
// ============================================================================

export async function POST(request: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  try {
    const update: TelegramUpdate = await request.json();
    console.log('[Webhook] Update:', update.update_id);

    if (!update.message) {
      return NextResponse.json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const text = update.message.text;
    const hasVoice = !!update.message.voice;
    
    console.log(`[Webhook] Chat ${chatId}: ${text || (hasVoice ? 'voice note' : 'other')}`);

    // Handle /start command
    if (text === '/start') {
      await sendTelegramMessage(chatId, 
        `🏛️ Welcome to Alexandria!\n\n` +
        `I'm your personal AI that learns who you are.\n\n` +
        `• Send me text or voice notes about yourself\n` +
        `• Tell me your thoughts, opinions, stories\n` +
        `• I'll learn to think and respond like you\n\n` +
        `Try sending me a message now!`
      );
      return NextResponse.json({ ok: true });
    }

    // Handle /status command
    if (text === '/status') {
      await sendTelegramMessage(chatId, `📊 Status: Bot is running!\n\nMore stats coming soon.`);
      return NextResponse.json({ ok: true });
    }

    // Handle regular text messages - send to Editor
    if (text) {
      try {
        // Use a hardcoded test user ID for now (we'll fix user mapping later)
        const testUserId = '00000000-0000-0000-0000-000000000001';
        
        const editor = getEditor();
        console.log('[Webhook] Calling editor.converse...');
        
        const response = await editor.converse(text, testUserId, []);
        console.log('[Webhook] Editor responded:', response.message?.substring(0, 50));
        
        await sendTelegramMessage(chatId, response.message || 'I heard you, but I need to think about that.');
      } catch (editorError) {
        console.error('[Webhook] Editor error:', editorError);
        await sendTelegramMessage(chatId, `I had trouble processing that. Error: ${String(editorError).substring(0, 100)}`);
      }
      return NextResponse.json({ ok: true });
    }

    // Handle voice notes
    if (hasVoice) {
      await sendTelegramMessage(chatId, '🎤 Voice note received! Transcription coming soon.');
      return NextResponse.json({ ok: true });
    }

    // Unknown message type
    await sendTelegramMessage(chatId, 'I can process text and voice messages. Try sending one of those!');
    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json({ ok: true });
  }
}

// ============================================================================
// GET: Webhook info (for debugging)
// ============================================================================

export async function GET() {
  const { getTelegramClient } = await import('@/lib/interfaces/telegram/client');
  const client = getTelegramClient();

  const [botInfo, webhookInfo] = await Promise.all([
    client.getMe(),
    client.getWebhookInfo()
  ]);

  return NextResponse.json({
    bot: botInfo,
    webhook: webhookInfo,
    configured: !!process.env.TELEGRAM_BOT_TOKEN
  });
}
