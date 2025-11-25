import { createOpenAI } from '@ai-sdk/openai';
import { createTogetherAI } from '@ai-sdk/togetherai';
import { streamText, convertToCoreMessages, generateText, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { SupabaseIndexer } from '@/lib/modules/objective/indexer';

// 1. Setup Clients
const groq = createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: process.env.GROQ_API_KEY! });
const together = createTogetherAI({ apiKey: process.env.TOGETHER_API_KEY! });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const indexer = new SupabaseIndexer();

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

    // 3. Get Ghost ID
    const { data: twin } = await supabase.from('twins').select('model_id').eq('user_id', userId).single();
    const ghostModelId = twin?.model_id || 'meta-llama/Meta-Llama-3.1-8B-Instruct-Reference';

    // Convert messages to core format
    const coreMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content
    }));

    // 4. The Orchestrator (Llama 3.3 70B)
    const result = streamText({
      model: groq('llama-3.3-70b-versatile'), 
      messages: coreMessages,
    system: `You are the Orchestrator. 
             If facts are needed, use 'recall_memory'.
             ALWAYS use 'consult_ghost' to answer.`,
    stopWhen: stepCountIs(3), // CRITICAL: Allows tool use -> return -> final answer
    tools: {
      recall_memory: tool({
        description: "Search facts.",
        inputSchema: z.object({ query: z.string() }),
        execute: async ({ query }) => {
          const results = await indexer.recall(query, userId);
          return results.join('\n');
        },
      }),
      consult_ghost: tool({
        description: "Ask the Ghost to speak.",
        inputSchema: z.object({ 
          context: z.string().optional(), 
          prompt: z.string() 
        }),
        execute: async ({ context, prompt }) => {
           // Call Together AI (Subjective Model)
           const { text } = await generateText({
             model: together(ghostModelId), 
             messages: [
               {
                 role: "system",
                 content: `You are the Digital Ghost. Speak in your fine-tuned voice. Context: ${context || "None"}`
               },
               {
                 role: "user",
                 content: prompt
               }
             ]
           });
           
           // Save Ghost Response to History
           if (sessionId) {
             await supabase.from('chat_messages').insert({ 
               session_id: sessionId, 
               role: 'assistant', 
               content: text as string
             });
           }
           return text;
        }
      })
    }
  });

    return result.toUIMessageStreamResponse(); // CRITICAL: Enables frontend tool visualization
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
