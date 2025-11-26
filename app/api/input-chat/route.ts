import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { getIngestionTools } from '@/lib/factory';

// Setup Groq client
const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! });
const { refiner, extractor, indexer } = getIngestionTools();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages = [], userId } = body;

    // Validate
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Convert messages to core format
    const coreMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content
    }));

    // Simple interviewer that decides whether to ask questions or save
    const { text: response } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      messages: [
        {
          role: "system",
          content: `You help build a digital twin by gathering clear information. Be brief (under 50 words).

Analyze the conversation. If you need more detail, ask 1-3 numbered questions:
1. When?
2. Who/what details?
3. How did you feel?

If you have enough detail to understand the memory clearly, respond with:
[SAVE]
Then write a clear, detailed summary of what the user shared (include all facts, dates, people, emotions mentioned).

Always either ask questions OR save - never both.`
        },
        ...coreMessages
      ]
    });

    // Check if the model wants to save
    if (response.includes('[SAVE]')) {
      const summary = response.replace('[SAVE]', '').trim();
      
      try {
        // Extract and store facts
        const extracted = await extractor.structure(summary);
        console.log('[Input Chat] Extracted:', extracted);
        
        for (const fact of extracted.facts) {
          await indexer.ingest(fact, userId, {
            entities: extracted.entities,
            importance: extracted.importance
          });
        }
        
        // Generate training data
        await refiner.extractStyle(summary);
        
        const confirmMessage = `Thank you for sharing that with me — I've saved it. I'm here whenever you'd like to share more.`;
        
        return new Response(
          `data: ${JSON.stringify({ type: 'text-delta', delta: confirmMessage })}\n\n`,
          { headers: { 'Content-Type': 'text/event-stream' } }
        );
      } catch (error) {
        console.error('[Input Chat] Save error:', error);
        return new Response(
          `data: ${JSON.stringify({ type: 'text-delta', delta: 'error saving. try again.' })}\n\n`,
          { headers: { 'Content-Type': 'text/event-stream' } }
        );
      }
    }

    // Return the clarifying questions
    return new Response(
      `data: ${JSON.stringify({ type: 'text-delta', delta: response })}\n\n`,
      { headers: { 'Content-Type': 'text/event-stream' } }
    );

  } catch (error) {
    console.error('Input Chat API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

