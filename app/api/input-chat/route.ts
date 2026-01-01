// @CRITICAL: Carbon collection - Author ↔ Editor two-way conversation
// Uses UnifiedEditor as biographer to extract information
// Verify: conversation flows naturally, Editor asks probing questions, data saved

import { createClient } from '@supabase/supabase-js';
import { getEditor } from '@/lib/factory';
import type { Message } from '@/lib/modules/core/editor';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Conversation phases
type Phase = 
  | 'conversing'      // Normal: Editor ↔ Author back-and-forth
  | 'wrap_up'         // "anything else?" y/n
  | 'goodbye';        // Final farewell

interface ConversationState {
  phase: Phase;
  messagesProcessed: number;
}

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

    const currentState: ConversationState = state || { phase: 'conversing', messagesProcessed: 0 };
    const lastMessage = messages[messages.length - 1]?.content?.trim().toLowerCase();
    
    const encoder = new TextEncoder();
    const editor = getEditor();

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

    // Handle wrap_up phase
    if (currentState.phase === 'wrap_up') {
      if (lastMessage === 'y' || lastMessage === 'yes') {
        return sendResponse(
          "great! what else would you like to share?", 
          { phase: 'conversing', messagesProcessed: currentState.messagesProcessed }
        );
      } else {
        return sendResponse(
          "thanks for sharing! your Ghost is learning from everything you've told me. bye for now!", 
          { phase: 'goodbye', messagesProcessed: currentState.messagesProcessed }
        );
      }
    }

    // Phase: conversing - Two-way Editor ↔ Author conversation
    const coreMessages: Message[] = messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content
    }));

    // Get the Author's latest message
    const authorMessage = messages[messages.length - 1]?.content || '';
    
    // Check for exit signals
    const exitSignals = [
      'bye', 'goodbye', 'done', 'that\'s all', 'that\'s it', 'nothing else',
      'i\'m done', 'no more', 'gotta go', 'gtg', 'later'
    ];
    const isExitSignal = exitSignals.some(s => lastMessage?.includes(s));
    
    if (isExitSignal) {
      return sendResponse(
        "got it! anything else you'd like to share before I go?",
        { phase: 'wrap_up', messagesProcessed: currentState.messagesProcessed },
        true
      );
    }

    // Use UnifiedEditor for two-way conversation
    const editorResponse = await editor.converse(
      authorMessage,
      userId,
      coreMessages.slice(0, -1) // Pass history without the last message (which is the current input)
    );

    // Build response text
    let responseText = editorResponse.message;
    
    // If Editor has follow-up questions, append them conversationally
    if (editorResponse.followUpQuestions.length > 0) {
      const criticalQuestions = editorResponse.followUpQuestions.filter(q => q.priority === 'critical');
      const helpfulQuestions = editorResponse.followUpQuestions.filter(q => q.priority === 'helpful');
      
      // Prioritize critical questions, but don't overwhelm
      const questionsToAsk = criticalQuestions.length > 0 
        ? criticalQuestions.slice(0, 2)
        : helpfulQuestions.slice(0, 1);
      
      if (questionsToAsk.length > 0 && !responseText.includes('?')) {
        // Editor message didn't include a question, add one
        responseText += ' ' + questionsToAsk[0].question;
      }
    }

    // Log extraction stats
    const objCount = editorResponse.extraction.objective.length;
    const subjCount = editorResponse.extraction.subjective.length;
    const noteCount = editorResponse.notepadUpdates.observations.length + 
                      editorResponse.notepadUpdates.gaps.length + 
                      editorResponse.notepadUpdates.mentalModels.length;
    
    console.log(`[Input Chat] Processed: ${objCount} memories, ${subjCount} training pairs, ${noteCount} notes`);

    // Check training recommendation
    if (editorResponse.trainingRecommendation?.shouldTrain) {
      console.log(`[Input Chat] Training recommended: ${editorResponse.trainingRecommendation.reasoning}`);
    }

    // Send response
    const responseData = JSON.stringify({ 
      type: 'text-delta', 
      delta: responseText,
      state: { phase: 'conversing', messagesProcessed: currentState.messagesProcessed + 1 },
      lockYN: false,
      // Include extraction stats for UI if needed
      stats: {
        memoriesStored: objCount,
        trainingPairsCreated: subjCount,
        notesAdded: noteCount
      }
    });

    return new Response(`data: ${responseData}\n\n`, {
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
