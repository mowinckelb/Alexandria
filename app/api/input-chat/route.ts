import { createGroq } from '@ai-sdk/groq';
import { streamText } from 'ai';
import { createClient } from '@supabase/supabase-js';
import { getIngestionTools, getEditorTools } from '@/lib/factory';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
const { refiner, extractor, indexer } = getIngestionTools();
const { editorNotes } = getEditorTools();

// Conversation phases
type Phase = 
  | 'collecting'      // Normal: collecting carbon, asking follow-ups
  | 'wrap_up'         // "anything else?" y/n
  | 'offer_questions' // "can I ask you questions?" y/n
  | 'asking'          // Editor asking questions from notes
  | 'topic_continue'  // "can I ask about another topic?" y/n
  | 'goodbye';        // Final farewell

interface ConversationState {
  phase: Phase;
  currentQuestionId?: string;
  currentTopic?: string;
  questionsAsked?: number;  // Track how many questions asked this session
}

const MAX_QUESTIONS_PER_SESSION = 2;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages = [], userId, state } = body as {
      messages: Array<{ role: string; content: string }>;
      userId: string;
      state?: ConversationState;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const currentState: ConversationState = state || { phase: 'collecting' };
    const lastMessage = messages[messages.length - 1]?.content?.trim().toLowerCase();
    
    const encoder = new TextEncoder();

    // Helper to send response with state
    const sendResponse = (text: string, newState: ConversationState, lockYN = false) => {
      const data = JSON.stringify({ 
        type: 'text-delta', 
        delta: text,
        state: newState,
        lockYN
      });
      return new Response(`data: ${data}\n\n`, {
        headers: { 'Content-Type': 'text/event-stream' }
      });
    };

    // Handle y/n responses based on current phase
    if (currentState.phase === 'wrap_up') {
      if (lastMessage === 'y' || lastMessage === 'yes') {
        return sendResponse("ok, what else would you like to share?", { phase: 'collecting' });
      } else {
        // Check if we have pending questions
        const nextQuestion = await editorNotes.getNextQuestion(userId);
        if (nextQuestion) {
          return sendResponse(
            "no worries! before you go, can I ask you something?",
            { phase: 'offer_questions' },
            true
          );
        } else {
          return sendResponse("no worries, thanks for sharing! bye for now!", { phase: 'goodbye' });
        }
      }
    }

    if (currentState.phase === 'offer_questions') {
      if (lastMessage === 'y' || lastMessage === 'yes') {
        const question = await editorNotes.getNextQuestion(userId);
        if (question) {
          await editorNotes.markAsked(question.id);
          return sendResponse(
            question.content,
            { phase: 'asking', currentQuestionId: question.id, currentTopic: question.topic || undefined, questionsAsked: 1 }
          );
        } else {
          return sendResponse("actually, I don't have any questions right now. bye for now!", { phase: 'goodbye' });
        }
      } else {
        return sendResponse("no problem! bye for now!", { phase: 'goodbye' });
      }
    }

    if (currentState.phase === 'topic_continue') {
      const questionsAsked = currentState.questionsAsked || 0;
      
      // Check if we've hit the limit
      if (questionsAsked >= MAX_QUESTIONS_PER_SESSION) {
        return sendResponse("that's all for now! bye for now!", { phase: 'goodbye' });
      }
      
      if (lastMessage === 'y' || lastMessage === 'yes') {
        const question = await editorNotes.getNextQuestion(userId);
        if (question) {
          await editorNotes.markAsked(question.id);
          return sendResponse(
            question.content,
            { phase: 'asking', currentQuestionId: question.id, currentTopic: question.topic || undefined, questionsAsked: questionsAsked + 1 }
          );
        } else {
          return sendResponse("that's all my questions! thanks so much. bye for now!", { phase: 'goodbye' });
        }
      } else {
        return sendResponse("got it! thanks for answering. bye for now!", { phase: 'goodbye' });
      }
    }

    if (currentState.phase === 'asking') {
      const questionsAsked = currentState.questionsAsked || 1;
      
      // User answered a question - resolve it and check for more
      if (currentState.currentQuestionId) {
        await editorNotes.resolve(currentState.currentQuestionId, lastMessage || '');
      }

      // Process the answer as carbon
      const answerContext = messages.slice(-2).map(m => `${m.role}: ${m.content}`).join('\n');
      try {
        const extracted = await extractor.structure(answerContext);
        const memoryItems = extractor.toMemoryItems(extracted);
        for (const item of memoryItems) {
          await indexer.ingest(item, userId, {
            entities: extracted.entities,
            importance: extracted.importance
          });
        }
      } catch (e) {
        console.error('[Input Chat] Failed to process answer:', e);
      }

      // Check if we've hit the question limit
      if (questionsAsked >= MAX_QUESTIONS_PER_SESSION) {
        return sendResponse("thanks! that's all for now. bye for now!", { phase: 'goodbye' });
      }

      // Check if there are more questions
      const hasMore = await editorNotes.hasMoreTopics(userId, currentState.currentTopic || null);
      if (hasMore) {
        return sendResponse(
          "thanks! one more question?",
          { phase: 'topic_continue', currentTopic: currentState.currentTopic, questionsAsked },
          true
        );
      } else {
        const nextQ = await editorNotes.getNextQuestion(userId);
        if (nextQ && nextQ.topic === currentState.currentTopic) {
          await editorNotes.markAsked(nextQ.id);
          return sendResponse(
            nextQ.content,
            { phase: 'asking', currentQuestionId: nextQ.id, currentTopic: nextQ.topic || undefined, questionsAsked: questionsAsked + 1 }
          );
        } else if (nextQ) {
          return sendResponse(
            "thanks! one more question?",
            { phase: 'topic_continue', currentTopic: currentState.currentTopic, questionsAsked },
            true
          );
        } else {
          return sendResponse("that's all my questions! bye for now!", { phase: 'goodbye' });
        }
      }
    }

    // Phase: collecting - Normal carbon collection flow
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
- If the Carbon is RICH and CLEAR → respond with DONE
- If the Carbon is SPARSE or AMBIGUOUS → ask ONLY the questions needed to clarify
- If Author indicates they're done ("that's it", "nothing else", etc.) → respond with DONE

WHEN ASKING:
- Ask only what you genuinely need
- Could be 1 question, could be 5 - whatever maximizes fidelity
- Be specific about what's unclear
- Never ask generic questions just to fill space

WHEN DONE COLLECTING:
Respond ONLY with the single word: DONE
Do not include anything else - just "DONE". The system will handle the next steps.

Be brief in questions (under 50 words).`
        },
        ...coreMessages
      ]
    });

    let fullText = '';
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            fullText += chunk;
          }
          
          const isDone = fullText.trim().toUpperCase().startsWith('DONE') || 
                         fullText.trim().toUpperCase().startsWith('SAVE');
          
          if (isDone) {
            // Process and save the conversation
            const conversationContext = coreMessages
              .map(m => `${m.role}: ${m.content}`)
              .join('\n');
            
            try {
              // Store entry
              const { data: entry } = await supabase.from('entries').insert({
                user_id: userId,
                content: conversationContext,
                source: 'input-chat'
              }).select('id').single();

              // Extract and store
              const extracted = await extractor.structure(conversationContext);
              const memoryItems = extractor.toMemoryItems(extracted);
              
              for (const item of memoryItems) {
                await indexer.ingest(item, userId, {
                  entities: extracted.entities,
                  importance: extracted.importance
                });
              }
              
              // Generate training pairs
              const trainingPairs = await refiner.extractStyle(conversationContext);
              for (const pair of trainingPairs) {
                await supabase.from('training_pairs').insert({
                  user_id: userId,
                  system_prompt: pair.system_prompt,
                  user_content: pair.user_content,
                  assistant_content: pair.assistant_content,
                  quality_score: pair.quality_score
                });
              }

              // Generate editor notes for future questions
              await editorNotes.analyzeAndGenerateNotes(
                conversationContext, 
                userId, 
                entry?.id
              );
              
              console.log(`[Input Chat] Processed: ${memoryItems.length} memories, ${trainingPairs.length} pairs`);
            } catch (error) {
              console.error('[Input Chat] Save error:', error);
            }

            // Ask if there's more to share
            const responseData = JSON.stringify({ 
              type: 'text-delta', 
              delta: "got it! anything else you'd like to share?",
              state: { phase: 'wrap_up' },
              lockYN: true
            });
            controller.enqueue(encoder.encode(`data: ${responseData}\n\n`));
          } else {
            // Send clarifying questions
            const responseData = JSON.stringify({ 
              type: 'text-delta', 
              delta: fullText,
              state: { phase: 'collecting' },
              lockYN: false
            });
            controller.enqueue(encoder.encode(`data: ${responseData}\n\n`));
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

