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

    // Dynamic interviewer - asks only when genuinely needed
    const { text: response } = await generateText({
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
Respond with [SAVE] followed by a comprehensive summary that captures:
- All objective facts (dates, names, events)
- All subjective truths (preferences, opinions, values, feelings)
- Context and significance

Be brief in questions (under 50 words). Be thorough in summaries.`
        },
        ...coreMessages
      ]
    });

    // Check if the model wants to save
    if (response.includes('[SAVE]')) {
      const summary = response.replace('[SAVE]', '').trim();
      
      try {
        // Extract facts, preferences, opinions, and values
        const extracted = await extractor.structure(summary);
        console.log('[Input Chat] Extracted:', extracted);
        
        // Convert all extracted info to Memory items (including subjective truths)
        const memoryItems = extractor.toMemoryItems(extracted);
        
        // Store each Memory item
        for (const item of memoryItems) {
          await indexer.ingest(item, userId, {
            entities: extracted.entities,
            importance: extracted.importance
          });
        }
        
        console.log(`[Input Chat] Stored ${memoryItems.length} Memory items (facts: ${extracted.facts.length}, preferences: ${extracted.preferences?.length || 0}, opinions: ${extracted.opinions?.length || 0}, values: ${extracted.values?.length || 0})`);
        
        // Generate training data for Soul
        await refiner.extractStyle(summary);
        
        const confirmMessage = `saved.`;
        
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

