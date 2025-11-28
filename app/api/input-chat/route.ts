import { createGroq } from '@ai-sdk/groq';
import { streamText } from 'ai';
import { getIngestionTools } from '@/lib/factory';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! });
const { refiner, extractor, indexer } = getIngestionTools();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages = [], userId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const coreMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content
    }));

    const result = streamText({
      model: groq('llama-3.3-70b-versatile'),
      messages: [
        {
          role: "system",
          content: `You are building a digital twin (Ghost) of this Author. Your goal: MAXIMUM FIDELITY.

ASSESS the Carbon (input) provided. Ask yourself:
- Do I have specific facts (dates, names, places)?
- Do I understand the context and significance?
- Are there explicit preferences, opinions, or values stated?
- Is anything ambiguous that could affect Ghost accuracy?

DECISION:
- If the Carbon is RICH and CLEAR → save immediately, don't waste Author's time
- If the Carbon is SPARSE or AMBIGUOUS → ask ONLY the questions needed to clarify
- If Author indicates they're done ("that's it", "nothing else", etc.) → save what you have

WHEN ASKING:
- Ask only what you genuinely need
- Could be 1 question, could be 5 - whatever maximizes fidelity
- Be specific about what's unclear
- Never ask generic questions just to fill space

WHEN SAVING:
Respond ONLY with the single word: SAVE
Do not include anything else - just "SAVE". The system will handle confirmation.

Be brief in questions (under 50 words).`
        },
        ...coreMessages
      ]
    });

    // Create SSE stream in the format frontend expects
    const encoder = new TextEncoder();
    let fullText = '';
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Collect full response first to check for SAVE
          for await (const chunk of result.textStream) {
            fullText += chunk;
          }
          
          // Check if it's a SAVE response (be generous with matching)
          const isSave = fullText.trim().toUpperCase().startsWith('SAVE') || fullText.includes('[SAVE]');
          
          if (isSave) {
            // Send warm closing message instead of "SAVE"
            const saveMsg = JSON.stringify({ type: 'text-delta', delta: "Got it, I've saved everything. Thanks for sharing." });
            controller.enqueue(encoder.encode(`data: ${saveMsg}\n\n`));
            
            // Process the save in background
            try {
              const conversationContext = coreMessages
                .map(m => `${m.role}: ${m.content}`)
                .join('\n');
              
              const extracted = await extractor.structure(conversationContext);
              console.log('[Input Chat] Extracted:', extracted);
              
              const memoryItems = extractor.toMemoryItems(extracted);
              
              for (const item of memoryItems) {
                await indexer.ingest(item, userId, {
                  entities: extracted.entities,
                  importance: extracted.importance
                });
              }
              
              console.log(`[Input Chat] Stored ${memoryItems.length} Memory items`);
              
              const lastUserMessage = coreMessages.filter(m => m.role === 'user').pop();
              if (lastUserMessage?.content) {
                await refiner.extractStyle(lastUserMessage.content);
              }
            } catch (error) {
              console.error('[Input Chat] Save error:', error);
            }
          } else {
            // Not a save - send the response (clarifying questions)
            const responseMsg = JSON.stringify({ type: 'text-delta', delta: fullText });
            controller.enqueue(encoder.encode(`data: ${responseMsg}\n\n`));
          }
          
          controller.close();
        } catch (error) {
          console.error('[Input Chat] Stream error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream' }
    });

  } catch (error) {
    console.error('Input Chat API Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

