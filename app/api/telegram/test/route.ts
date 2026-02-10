/**
 * Telegram Test API
 * Simple test to verify bot can send messages
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');
  const message = searchParams.get('message') || 'Hello from Alexandria!';

  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not configured' }, { status: 500 });
  }

  if (!chatId) {
    return NextResponse.json({ 
      error: 'chatId required',
      usage: '/api/telegram/test?chatId=YOUR_CHAT_ID&message=Hello',
      hint: 'Get your chat ID by messaging @userinfobot on Telegram'
    }, { status: 400 });
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message
      })
    });

    const data = await response.json();
    
    return NextResponse.json({
      success: data.ok,
      result: data
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to send message',
      details: String(error)
    }, { status: 500 });
  }
}
