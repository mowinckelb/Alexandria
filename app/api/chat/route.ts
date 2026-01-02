// @CRITICAL: PLM responses - Users query the PLM
// Uses Orchestrator to handle PLM + Memories + Constitution
// Verify: PLM responds authentically with memories, personality loads correctly

import { createClient } from '@supabase/supabase-js';
import { getOrchestrator } from '@/lib/factory';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages = [], userId, sessionId, temperature = 0.7 } = body;

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Save User Message to History
    const lastMessage = messages[messages.length - 1];
    if (sessionId && lastMessage?.content) {
      await supabase.from('chat_messages').insert({ 
        session_id: sessionId, 
        role: 'user', 
        content: lastMessage.content as string
      });
    }

    // Convert messages to core format
    const coreMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content
    }));

    // Use Orchestrator to handle the query
    const orchestrator = getOrchestrator();
    const { stream, context } = await orchestrator.handleQuery(
      coreMessages,
      userId,
      { sessionId, temperature }
    );

    console.log(`[Chat] Using model: ${context.plmModelId}, memories: ${context.memories.length}`);

    return stream.toUIMessageStreamResponse();
    
  } catch (error) {
    console.error('Chat API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', errorMessage);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: errorMessage 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
