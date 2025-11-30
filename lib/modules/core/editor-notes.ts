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
  category: 'critical' | 'non_critical';
  status: 'pending' | 'asked' | 'resolved' | 'dismissed';
  related_evidence?: Record<string, unknown>[];
}

export interface PendingQuestion {
  id: string;
  content: string;
  context: string | null;
  topic: string | null;
  priority: string;
  category: string;
  related_evidence: Record<string, unknown>[] | null;
}

export interface ReflectionResult {
  selfResolved: string[];
  newQuestions: EditorNote[];
  recategorized: { id: string; newCategory: 'critical' | 'non_critical'; reason: string }[];
  insights: string[];
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

Your goal: MAXIMIZE GHOST FIDELITY. Think deeply about what information would most improve the Ghost's accuracy.

Analyze the text. For each piece of information, ask yourself:
- What does this tell me about the Author?
- What is UNCLEAR that I need clarified?
- What is MISSING that I should know?
- What patterns am I observing about how the Author thinks/speaks?

Note types:
- "question": Something unclear needing Author clarification
- "gap": Missing information for complete picture
- "observation": Pattern/insight about Author's personality/style
- "mental_model": Theory about how Author thinks/decides

Category (CRITICAL for prioritization):
- "critical": Without this, Ghost will make WRONG responses. Core identity, values, major relationships, key life events, strong opinions that define who they are.
- "non_critical": Would improve fidelity but Ghost can function without. Preferences, minor details, nice-to-know.

Priority within category:
- "high": Most impactful for fidelity
- "medium": Moderately impactful
- "low": Minor impact

Return JSON array:
[
  {
    "type": "question",
    "content": "What happened during 'the incident' you mentioned?",
    "context": "Author said 'after the incident, everything changed'",
    "topic": "life_events",
    "priority": "high",
    "category": "critical",
    "related_evidence": [{"quote": "after the incident, everything changed", "implication": "major life-altering event"}]
  }
]

Rules:
- Be AGGRESSIVE about identifying gaps - err on the side of asking
- Critical = Ghost would give WRONG answers without this
- Non-critical = Ghost would give INCOMPLETE but not wrong answers
- Return ONLY valid JSON array`
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
        category: (n.category as EditorNote['category']) || 'non_critical',
        status: 'pending' as const,
        related_evidence: n.related_evidence as Record<string, unknown>[] | undefined
      }));

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
    criticalPending: number;
    nonCriticalPending: number;
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
        mentalModels: 0,
        criticalPending: 0,
        nonCriticalPending: 0
      };
    }

    const stats = data[0];
    return {
      totalNotes: Number(stats.total_notes) || 0,
      pendingQuestions: Number(stats.pending_questions) || 0,
      pendingGaps: Number(stats.pending_gaps) || 0,
      observations: Number(stats.observations) || 0,
      mentalModels: Number(stats.mental_models) || 0,
      criticalPending: Number(stats.critical_pending) || 0,
      nonCriticalPending: Number(stats.non_critical_pending) || 0
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

  /**
   * CORE: Reflect on ALL information - the Editor's continuous thinking process
   * This is where LLM leverage is maximized: give it everything, let it reason
   */
  async reflectOnAll(userId: string): Promise<ReflectionResult> {
    // Gather all context: pending notes, memories, training pairs
    const [pendingNotes, memories, recentPairs] = await Promise.all([
      supabase.rpc('get_notes_for_reflection', { p_user_id: userId }),
      supabase.from('memory_fragments').select('content, entities').eq('user_id', userId).limit(100),
      supabase.from('training_pairs').select('user_turn, assistant_turn').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
    ]);

    const contextSummary = {
      pendingQuestions: pendingNotes.data?.filter((n: { type: string }) => n.type === 'question') || [],
      pendingGaps: pendingNotes.data?.filter((n: { type: string }) => n.type === 'gap') || [],
      observations: pendingNotes.data?.filter((n: { type: string }) => n.type === 'observation') || [],
      memories: memories.data?.map((m: { content: string }) => m.content).slice(0, 50) || [],
      recentConversations: recentPairs.data?.slice(0, 20) || []
    };

    const { text: response } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      messages: [
        {
          role: 'system',
          content: `You are an Editor building a high-fidelity Ghost (digital twin) of an Author.

REFLECT on everything you know. Your goal: MAXIMIZE GHOST FIDELITY.

You have:
1. Pending questions you've been wondering about
2. Identified gaps in your knowledge
3. Observations about the Author
4. Memory fragments (facts you know)
5. Recent conversation samples showing Author's voice

THINK:
1. Can any pending questions be ANSWERED from the memories/conversations you have? (self-resolve)
2. What NEW questions arise from connecting information across sources?
3. Should any notes be RECATEGORIZED? (critical ↔ non-critical based on new understanding)
4. What insights/patterns do you see across all the information?

Return JSON:
{
  "self_resolved": [
    {"note_id": "uuid", "answer": "Based on memory X, the answer is...", "confidence": "high|medium"}
  ],
  "new_questions": [
    {"type": "question", "content": "...", "context": "...", "topic": "...", "priority": "high", "category": "critical", "related_evidence": [...]}
  ],
  "recategorize": [
    {"note_id": "uuid", "new_category": "critical", "reason": "Now understand this connects to core identity"}
  ],
  "insights": ["Pattern observed: Author consistently...", "Connection found: X and Y suggest..."]
}

Be AGGRESSIVE about self-resolving. If you can reasonably infer an answer, do it.
Be THOUGHTFUL about recategorization. Critical = Ghost gives WRONG answers without this.`
        },
        {
          role: 'user',
          content: JSON.stringify(contextSummary, null, 2).substring(0, 12000)
        }
      ]
    });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log('[EditorNotes] Reflection produced no structured output');
        return { selfResolved: [], newQuestions: [], recategorized: [], insights: [] };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Process self-resolutions
      const selfResolved: string[] = [];
      for (const resolved of (parsed.self_resolved || [])) {
        if (resolved.note_id && resolved.answer) {
          await this.resolve(resolved.note_id, resolved.answer);
          selfResolved.push(resolved.note_id);
        }
      }

      // Store new questions
      const newQuestions: EditorNote[] = (parsed.new_questions || []).map((n: Record<string, unknown>) => ({
        user_id: userId,
        type: n.type as EditorNote['type'],
        content: n.content as string,
        context: n.context as string | undefined,
        topic: n.topic as string | undefined,
        priority: (n.priority as EditorNote['priority']) || 'medium',
        category: (n.category as EditorNote['category']) || 'non_critical',
        status: 'pending' as const,
        related_evidence: n.related_evidence as Record<string, unknown>[] | undefined
      }));

      if (newQuestions.length > 0) {
        await supabase.from('editor_notes').insert(newQuestions);
      }

      // Process recategorizations
      const recategorized: ReflectionResult['recategorized'] = [];
      for (const recat of (parsed.recategorize || [])) {
        if (recat.note_id && recat.new_category) {
          await supabase.from('editor_notes')
            .update({ category: recat.new_category })
            .eq('id', recat.note_id);
          recategorized.push({ id: recat.note_id, newCategory: recat.new_category, reason: recat.reason });
        }
      }

      console.log(`[EditorNotes] Reflection: ${selfResolved.length} resolved, ${newQuestions.length} new, ${recategorized.length} recategorized`);

      return {
        selfResolved,
        newQuestions,
        recategorized,
        insights: parsed.insights || []
      };
    } catch (e) {
      console.error('[EditorNotes] Reflection failed:', e);
      return { selfResolved: [], newQuestions: [], recategorized: [], insights: [] };
    }
  }

  /**
   * Attempt to self-resolve a specific question from available data
   */
  async attemptSelfResolution(noteId: string, userId: string): Promise<{ resolved: boolean; answer?: string }> {
    // Get the note
    const { data: note } = await supabase
      .from('editor_notes')
      .select('*')
      .eq('id', noteId)
      .single();

    if (!note) return { resolved: false };

    // Get relevant memories
    const { data: memories } = await supabase
      .from('memory_fragments')
      .select('content')
      .eq('user_id', userId)
      .limit(50);

    const { text: response } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      messages: [
        {
          role: 'system',
          content: `You are an Editor trying to answer your own question about an Author.

Question: ${note.content}
Context: ${note.context || 'None'}

Available memories about the Author:
${(memories || []).map((m: { content: string }) => `- ${m.content}`).join('\n')}

Can you answer this question from the available information?

Return JSON:
{
  "can_answer": true/false,
  "answer": "The answer based on evidence...",
  "confidence": "high|medium|low",
  "reasoning": "I concluded this because..."
}

Only return can_answer: true if you have REAL evidence. Don't guess.`
        }
      ]
    });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { resolved: false };

      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.can_answer && parsed.confidence !== 'low') {
        await this.resolve(noteId, parsed.answer);
        return { resolved: true, answer: parsed.answer };
      }
      return { resolved: false };
    } catch {
      return { resolved: false };
    }
  }

  /**
   * Recalculate weights/categories based on accumulated context
   * LLM decides what's actually critical vs non-critical given everything known
   */
  async recalculateWeights(userId: string): Promise<{ updated: number }> {
    const { data: pendingNotes } = await supabase.rpc('get_notes_for_reflection', { p_user_id: userId });
    
    if (!pendingNotes || pendingNotes.length === 0) return { updated: 0 };

    const { text: response } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      messages: [
        {
          role: 'system',
          content: `You are an Editor reviewing your pending questions/notes about an Author.

RECATEGORIZE based on Ghost fidelity impact:
- "critical": Ghost will give WRONG answers without this (core identity, values, key relationships, defining events)
- "non_critical": Ghost will be INCOMPLETE but not wrong (preferences, details, nice-to-know)

Also reassess priority within category (high/medium/low).

Current pending notes:
${JSON.stringify(pendingNotes, null, 2)}

Return JSON array of updates (only include notes that should change):
[
  {"note_id": "uuid", "new_category": "critical", "new_priority": "high", "reason": "..."}
]

Be strict about "critical" - only core identity/values/relationships that would cause WRONG Ghost responses.`
        }
      ]
    });

    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return { updated: 0 };

      const updates = JSON.parse(jsonMatch[0]);
      let updated = 0;

      for (const update of updates) {
        if (update.note_id) {
          const { error } = await supabase.from('editor_notes')
            .update({ 
              category: update.new_category,
              priority: update.new_priority 
            })
            .eq('id', update.note_id);
          
          if (!error) updated++;
        }
      }

      console.log(`[EditorNotes] Recalculated weights: ${updated} updated`);
      return { updated };
    } catch {
      return { updated: 0 };
    }
  }

  /**
   * Get the next question to ask - critical first, then by priority
   */
  async getNextToAsk(userId: string): Promise<PendingQuestion | null> {
    const { data, error } = await supabase.rpc('get_next_question_to_ask', { p_user_id: userId });

    if (error || !data || data.length === 0) return null;

    return data[0];
  }
}
