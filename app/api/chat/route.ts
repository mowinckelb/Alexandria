import { createTogetherAI } from '@ai-sdk/togetherai';
import { streamText } from 'ai';
import { createClient } from '@supabase/supabase-js';
import { getBrainTools } from '@/lib/factory';

// 1. Setup Clients
const together = createTogetherAI({ apiKey: process.env.TOGETHER_API_KEY! });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const { indexer } = getBrainTools();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages = [], userId, sessionId } = body;

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Save User Message to History
    const lastMessage = messages[messages.length - 1];
    if (sessionId && lastMessage?.content) {
      await supabase.from('chat_messages').insert({ 
        session_id: sessionId, 
        role: 'user', 
        content: lastMessage.content as string
      });
    }

    // 3. Get Ghost ID (use serverless Turbo model as default)
    const { data: twin } = await supabase.from('twins').select('model_id').eq('user_id', userId).single();
    // Meta-Llama-3.1-8B-Instruct-Turbo is the serverless version
    const ghostModelId = twin?.model_id || 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo';

    // Convert messages to core format
    const coreMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content
    }));

    // 4. First, check if we need to recall memories
    const userQuery = lastMessage?.content || '';
    let memoryContext = '';
    
    // Always try to recall memories for relevant context (MVP approach)
    // This ensures the Ghost has access to stored facts when answering
    const needsMemory = true; // Always check memory for MVP
    console.log(`Memory check - Query: "${userQuery}", needsMemory: ${needsMemory}`);
    
    if (needsMemory) {
      try {
        console.log(`Attempting memory recall for userId: ${userId}`);
        const memories = await indexer.recall(userQuery, userId);
        console.log(`Memory recall returned ${memories.length} results:`, memories);
        if (memories.length > 0) {
          memoryContext = `Your memories:\n${memories.join('\n')}\n\n`;
        }
      } catch (e) {
        console.log('Memory recall failed:', e);
      }
    }

    // 5. Call the Ghost directly via Together AI (simplified flow for MVP)
    const result = streamText({
      model: together(ghostModelId),
      messages: [
        {
          role: "system",
          content: `You are a digital embodiment of a person. Respond in first person.

RULES:
- Be concise. Keep responses short and direct (1-3 sentences unless more detail is needed).
- ONLY use information from your memories below. Never make up facts.
- If you don't know something, just say "I don't remember that."
- Speak naturally, like you're having a casual conversation.${memoryContext ? `\n\n${memoryContext}` : '\n\nYou have no memories yet. Tell the user to share info in input mode.'}`
        },
        ...coreMessages
      ]
    });
    
    // Save to history
    if (sessionId) {
      // Note: For streaming, we'd need to save after completion. For MVP, this is simplified.
    }

    return result.toUIMessageStreamResponse(); // CRITICAL: Enables frontend tool visualization
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
