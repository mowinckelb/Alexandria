import { createClient } from '@supabase/supabase-js';
import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export interface EditorNote {
  id?: string;
  user_id: string;
  type: 'question' | 'observation' | 'mental_model' | 'gap';
  content: string;
  context?: string;
  topic?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'asked' | 'resolved' | 'dismissed';
}

export interface PendingQuestion {
  id: string;
  content: string;
  context: string | null;
  topic: string | null;
  priority: string;
}

export class EditorNotes {
  /**
   * Analyze text and generate notes (questions, observations, gaps, mental models)
   */
  async analyzeAndGenerateNotes(
    text: string, 
    userId: string, 
    sourceEntryId?: string
  ): Promise<EditorNote[]> {
    const { text: response } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      messages: [
        {
          role: 'system',
          content: `You are an Editor building a high-fidelity digital twin (Ghost) of an Author.

Analyze the text and generate notes to improve your understanding. Return ONLY valid JSON array.

Note types:
- "question": Something unclear that needs clarification from Author
- "gap": Missing information that would help build a complete picture
- "observation": Pattern or insight about Author's personality/style
- "mental_model": Theory about how Author thinks/behaves

Priority:
- "high": Critical for accurate Ghost (core identity, major life events, strong opinions)
- "medium": Would improve fidelity (preferences, relationships, habits)
- "low": Nice to have (minor details, trivia)

Return JSON array:
[
  {
    "type": "question",
    "content": "What happened during 'the incident' you mentioned?",
    "context": "Author said 'after the incident, everything changed'",
    "topic": "life_events",
    "priority": "high"
  },
  {
    "type": "gap",
    "content": "No information about family relationships",
    "topic": "family",
    "priority": "medium"
  },
  {
    "type": "observation",
    "content": "Author uses humor to deflect from emotional topics",
    "context": "Multiple instances of jokes when discussing difficulties",
    "topic": "communication_style",
    "priority": "medium"
  }
]

Rules:
- Only generate notes that would genuinely help build a better Ghost
- Questions should be specific and answerable
- Don't ask about things clearly stated in the text
- Observations should be based on evidence in the text
- Return empty array [] if text is straightforward with no gaps
- Return ONLY the JSON array, no other text`
        },
        {
          role: 'user',
          content: text.substring(0, 8000)
        }
      ]
    });

    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.log('[EditorNotes] No notes generated');
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const notes: EditorNote[] = parsed.map((n: Record<string, unknown>) => ({
        user_id: userId,
        type: n.type as EditorNote['type'],
        content: n.content as string,
        context: n.context as string | undefined,
        topic: n.topic as string | undefined,
        priority: (n.priority as EditorNote['priority']) || 'medium',
        status: 'pending' as const
      }));

      // Store notes in database
      if (notes.length > 0) {
        const { error } = await supabase.from('editor_notes').insert(
          notes.map(n => ({
            ...n,
            source_entry_id: sourceEntryId
          }))
        );

        if (error) {
          console.error('[EditorNotes] Failed to store notes:', error);
        } else {
          console.log(`[EditorNotes] Stored ${notes.length} notes`);
        }
      }

      return notes;
    } catch (e) {
      console.error('[EditorNotes] Failed to parse notes:', e, response);
      return [];
    }
  }

  /**
   * Get pending questions for a user, ordered by priority
   */
  async getPendingQuestions(userId: string, limit = 5): Promise<PendingQuestion[]> {
    const { data, error } = await supabase.rpc('get_pending_questions', {
      p_user_id: userId,
      p_limit: limit
    });

    if (error) {
      console.error('[EditorNotes] Failed to get pending questions:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get stats about editor notes for a user
   */
  async getStats(userId: string): Promise<{
    totalNotes: number;
    pendingQuestions: number;
    pendingGaps: number;
    observations: number;
    mentalModels: number;
  }> {
    const { data, error } = await supabase.rpc('get_editor_notes_stats', {
      p_user_id: userId
    });

    if (error || !data || data.length === 0) {
      return {
        totalNotes: 0,
        pendingQuestions: 0,
        pendingGaps: 0,
        observations: 0,
        mentalModels: 0
      };
    }

    const stats = data[0];
    return {
      totalNotes: Number(stats.total_notes) || 0,
      pendingQuestions: Number(stats.pending_questions) || 0,
      pendingGaps: Number(stats.pending_gaps) || 0,
      observations: Number(stats.observations) || 0,
      mentalModels: Number(stats.mental_models) || 0
    };
  }

  /**
   * Mark a question as asked
   */
  async markAsked(noteId: string): Promise<void> {
    await supabase
      .from('editor_notes')
      .update({ 
        status: 'asked',
        asked_at: new Date().toISOString()
      })
      .eq('id', noteId);
  }

  /**
   * Resolve a question with an answer
   */
  async resolve(noteId: string, resolution: string): Promise<void> {
    await supabase
      .from('editor_notes')
      .update({ 
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolution
      })
      .eq('id', noteId);
  }

  /**
   * Dismiss a question (user declined to answer)
   */
  async dismiss(noteId: string): Promise<void> {
    await supabase
      .from('editor_notes')
      .update({ status: 'dismissed' })
      .eq('id', noteId);
  }

  /**
   * Get the next question to ask, grouped by topic
   * Returns null if no pending questions
   */
  async getNextQuestion(userId: string): Promise<PendingQuestion | null> {
    const questions = await this.getPendingQuestions(userId, 1);
    return questions[0] || null;
  }

  /**
   * Check if there are pending questions on different topics
   */
  async hasMoreTopics(userId: string, currentTopic: string | null): Promise<boolean> {
    const { data } = await supabase
      .from('editor_notes')
      .select('topic')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .eq('type', 'question')
      .neq('topic', currentTopic || '')
      .limit(1);

    return (data?.length || 0) > 0;
  }
}
