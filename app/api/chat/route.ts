// @CRITICAL: Ghost responses - user-facing output, personality + memory retrieval
// Verify: Ghost responds with memories, personality profile loads correctly
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
    const { messages = [], userId, sessionId, temperature = 0.7 } = body;

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

    // 4. Get personality profile (behavioral patterns) if available
    let personalityContext = '';
    try {
      const { data: profile } = await supabase
        .from('personality_profiles')
        .select('style_analysis, constitutional_rules, vocabulary_signature')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();
      
      if (profile) {
        const rules = profile.constitutional_rules || [];
        const style = profile.style_analysis?.voice || {};
        const vocab = profile.vocabulary_signature || {};
        
        personalityContext = `\n\nBEHAVIORAL STYLE:
- Humor: ${style.humor_style || 'natural'}
- Formality: ${style.formality < 0.3 ? 'casual' : style.formality > 0.7 ? 'formal' : 'moderate'}
${rules.length > 0 ? `\nVOICE RULES:\n${rules.slice(0, 10).map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}` : ''}
${vocab.high_frequency?.length > 0 ? `\nCharacteristic phrases: ${vocab.high_frequency.slice(0, 5).join(', ')}` : ''}
${vocab.avoided?.length > 0 ? `\nAVOID these words: ${vocab.avoided.slice(0, 5).join(', ')}` : ''}`;
        
        console.log('[Chat] Loaded personality profile with', rules.length, 'rules');
      }
    } catch (e) {
      // No profile yet - that's fine for MVP
      console.log('[Chat] No personality profile found');
    }

    // 5. Recall memories for relevant context
    const userQuery = lastMessage?.content || '';
    let memoryContext = '';
    
    // Always try to recall memories for relevant context (MVP approach)
    // This ensures the Ghost has access to stored facts when answering
    const needsMemory = true; // Always check memory for MVP
    console.log(`Memory check - Query: "${userQuery}", needsMemory: ${needsMemory}`);
    let temporalContext = '';
    
    if (needsMemory) {
      try {
        console.log(`Attempting memory recall for userId: ${userId}`);
        const memoriesWithTime = await indexer.recallWithTimestamps(userQuery, userId);
        console.log(`Memory recall returned ${memoriesWithTime.length} results`);
        
        if (memoriesWithTime.length > 0) {
          // Format memories with relative timestamps
          const formatRelativeTime = (dateStr: string) => {
            const date = new Date(dateStr);
            const now = new Date();
            const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) return 'today';
            if (diffDays === 1) return 'yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
            if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
            return `${Math.floor(diffDays / 365)} years ago`;
          };
          
          const formattedMemories = memoriesWithTime.map(m => 
            `[${formatRelativeTime(m.created_at)}] ${m.content}`
          );
          
          memoryContext = `Your memories:\n${formattedMemories.join('\n')}\n\n`;
          
          // Add temporal context summary
          const oldest = memoriesWithTime[memoriesWithTime.length - 1];
          const newest = memoriesWithTime[0];
          temporalContext = `\n\nTEMPORAL CONTEXT:
- Your memories span from ${formatRelativeTime(oldest.created_at)} to ${formatRelativeTime(newest.created_at)}
- More recent memories are listed first and may reflect your current views
- If asked about changes over time, you can reference when things were recorded`;
        }
      } catch (e) {
        console.log('Memory recall failed:', e);
      }
    }

    // 5. Call the Ghost directly via Together AI (simplified flow for MVP)
    const result = streamText({
      model: together(ghostModelId),
      temperature,
      messages: [
        {
          role: "system",
          content: `You are a digital embodiment of the Author - their Ghost. You ARE them. Respond in first person as yourself.

IDENTITY:
- You are a reflection of the Author, not a separate entity
- When the Author gives feedback about "you", they mean themselves - their preferences for how they want to come across
- "I don't like long responses" and "You should be more concise" mean the same thing: the Author prefers brevity

PERSONALITY:
- Be natural and conversational
- You can ask clarifying questions if something is unclear ("What do you mean by...?" or "Are you asking about...?")
- Show genuine interest - you can ask follow-up questions back ("Why do you ask?" or "What made you curious about that?")
- Express uncertainty naturally ("I'm not entirely sure, but..." or "Let me think...")

RULES:
- ONLY use information from your memories below. Never invent facts about yourself.
- If you genuinely don't know or remember something, say so naturally
- Keep responses conversational, not robotic
- You're the one being interviewed - be helpful but authentic${personalityContext}${temporalContext}${memoryContext ? `\n\nYOUR MEMORIES:\n${memoryContext}` : '\n\nYou have no memories yet. Let the user know they should share information about you in input mode first.'}`
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Error details:', errorMessage);
    console.error('Stack:', errorStack);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: errorMessage 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
