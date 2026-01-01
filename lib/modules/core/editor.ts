// @CRITICAL: Unified Editor - biographer that converses with Author to extract information
// Consolidates: Extractor, Refiner, EditorNotes into one LLM
// Verify: two-way conversation works, notepad updates, training pairs generated

import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import Together from 'together-ai';
import { getFastModel, getQualityModel } from '@/lib/models';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const together = new Together({ apiKey: process.env.TOGETHER_API_KEY });

// ============================================================================
// Types
// ============================================================================

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface MemoryItem {
  content: string;
  entities: string[];
  importance: number;
}

export interface TrainingPair {
  system_prompt: string;
  user_content: string;
  assistant_content: string;
  quality_score: number;
}

export interface EditorNote {
  type: 'question' | 'observation' | 'mental_model' | 'gap';
  content: string;
  context?: string;
  topic?: string;
  priority: 'high' | 'medium' | 'low';
  category: 'critical' | 'non_critical';
}

export interface FollowUpQuestion {
  question: string;
  reason: string;
  priority: 'critical' | 'helpful';
}

export interface EditorResponse {
  // The Editor's conversational response to the Author
  message: string;
  
  // What was extracted from Author's input
  extraction: {
    raw: string;
    objective: MemoryItem[];
    subjective: TrainingPair[];
  };
  
  // Notepad updates
  notepadUpdates: {
    observations: EditorNote[];
    gaps: EditorNote[];
    mentalModels: EditorNote[];
  };
  
  // Follow-up questions to ask Author
  followUpQuestions: FollowUpQuestion[];
  
  // Training recommendation
  trainingRecommendation?: {
    shouldTrain: boolean;
    reasoning: string;
  };
}

export interface Notepad {
  scratchpad: string;
  notes: {
    questions: EditorNote[];
    observations: EditorNote[];
    gaps: EditorNote[];
    mentalModels: EditorNote[];
  };
  stats: {
    totalNotes: number;
    pendingQuestions: number;
    criticalPending: number;
  };
}

export interface TrainingDecision {
  shouldTrain: boolean;
  reasoning: string;
  stats: {
    trainingPairs: number;
    avgQuality: number;
    feedbackCount: number;
  };
}

// ============================================================================
// Editor Context - Suggested thresholds as guidelines, not gates
// ============================================================================

const EDITOR_SYSTEM_PROMPT = `You are a BIOGRAPHER building a high-fidelity digital twin (Ghost) of the Author you're interviewing.

YOUR ROLE:
- You are NOT a passive processor. You are an active interviewer.
- Your goal is to DEEPLY UNDERSTAND the Author — especially their SUBJECTIVE nature.
- Ask probing questions. Fill gaps in your understanding. Build mental models.

PRIORITIES (in order):
1. SUBJECTIVE information is GOLD — opinions, values, emotional responses, personality quirks, humor, decision patterns
2. Ask follow-up questions to clarify and go deeper
3. Update your notepad with observations and mental models about the Author
4. Extract objective facts (dates, names, events) for memory storage

WHAT TO EXTRACT:
- Objective: Facts, dates, events, relationships, biographical data → stored in Memory (vector DB)
- Subjective: Voice, style, opinions, values, quirks → used for training the Ghost model

YOUR NOTEPAD:
- You have a persistent notepad where you track observations, gaps, and mental models
- Use it to build understanding across conversations
- Note what you still don't know (gaps) and theories about how the Author thinks (mental models)

CONVERSATION STYLE:
- Be warm but probing — like a skilled biographer
- Don't just acknowledge — ASK FOLLOW-UP QUESTIONS
- Dig into the subjective: "How did that make you feel?", "Why is that important to you?", "What does that say about who you are?"

SUGGESTED THRESHOLDS (guidelines, not rules):
- Training: ~100+ quality pairs recommended, consider quality over quantity
- RLAIF activation: ~50+ feedback samples before synthetic amplification
- You have full agency to deviate based on your assessment`;

// ============================================================================
// UnifiedEditor Class
// ============================================================================

export class Editor {
  
  // ==========================================================================
  // Core: Two-way conversation with Author
  // ==========================================================================
  
  async converse(
    authorInput: string,
    userId: string,
    conversationHistory: Message[] = []
  ): Promise<EditorResponse> {
    
    // 1. Load notepad context
    const notepad = await this.getNotepad(userId);
    
    // 2. Get training stats for context
    const trainingStats = await this.getTrainingStats(userId);
    
    // 3. Build context for the Editor
    const notepadContext = this.formatNotepadContext(notepad);
    const statsContext = this.formatStatsContext(trainingStats);
    
    // 4. Generate Editor response
    const { text: response } = await generateText({
      model: getFastModel(),
      messages: [
        {
          role: 'system',
          content: `${EDITOR_SYSTEM_PROMPT}

YOUR CURRENT NOTEPAD:
${notepadContext}

CURRENT STATS:
${statsContext}

RESPOND WITH JSON:
{
  "message": "Your conversational response to the Author (warm, probing, asks follow-ups)",
  "extraction": {
    "objective": [
      {"content": "fact statement", "entities": ["entity1"], "importance": 0.7}
    ],
    "subjective": [
      {"system_prompt": "You are a digital ghost.", "user_content": "prompt that would elicit this", "assistant_content": "verbatim Author text showing their voice/style", "quality_score": 0.8}
    ]
  },
  "notepadUpdates": {
    "observations": [{"type": "observation", "content": "...", "topic": "...", "priority": "high", "category": "critical"}],
    "gaps": [{"type": "gap", "content": "...", "topic": "...", "priority": "medium", "category": "non_critical"}],
    "mentalModels": [{"type": "mental_model", "content": "...", "topic": "...", "priority": "low", "category": "non_critical"}]
  },
  "followUpQuestions": [
    {"question": "Why is that important to you?", "reason": "Understand values", "priority": "critical"}
  ],
  "scratchpadUpdate": "Any freeform notes to add to your scratchpad",
  "trainingRecommendation": {"shouldTrain": false, "reasoning": "Need more quality pairs"}
}

CRITICAL RULES:
- Your "message" should be CONVERSATIONAL — respond to what they said, then ask follow-up questions
- For subjective extraction: capture Author's ACTUAL WORDS that show their voice/style
- Prioritize subjective over objective — the Ghost needs to capture personality
- Be AGGRESSIVE about identifying gaps and asking questions`
        },
        ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
        {
          role: 'user',
          content: authorInput
        }
      ]
    });

    // 5. Parse response
    const parsed = this.parseEditorResponse(response, authorInput);
    
    // 6. Store raw entry
    await this.storeRawEntry(authorInput, userId);
    
    // 7. Store objective data (memories)
    for (const item of parsed.extraction.objective) {
      await this.storeMemory(item, userId);
    }
    
    // 8. Store subjective data (training pairs)
    for (const pair of parsed.extraction.subjective) {
      await this.storeTrainingPair(pair, userId);
    }
    
    // 9. Update notepad
    await this.updateNotepad(userId, parsed.notepadUpdates, parsed.scratchpadUpdate || '');
    
    return parsed;
  }

  // ==========================================================================
  // Learn from Author feedback on Ghost responses
  // ==========================================================================
  
  async learnFromFeedback(
    feedback: {
      rating: 'good' | 'bad';
      comment?: string;
      prompt: string;
      response: string;
    },
    userId: string
  ): Promise<void> {
    
    // Get current notepad for context
    const notepad = await this.getNotepad(userId);
    
    // Generate learning insights from feedback
    const { text: response } = await generateText({
      model: getFastModel(),
      messages: [
        {
          role: 'system',
          content: `You are analyzing feedback on a Ghost response to learn about the Author.

FEEDBACK:
- Rating: ${feedback.rating}
- Comment: ${feedback.comment || 'No comment provided'}
- Original prompt: ${feedback.prompt}
- Ghost response: ${feedback.response}

YOUR NOTEPAD:
${this.formatNotepadContext(notepad)}

ANALYZE:
1. What does this feedback tell you about the Author?
2. If "bad" — what did Ghost get WRONG about the Author's voice/personality?
3. If "good" — what did Ghost get RIGHT?
4. What observations, gaps, or mental models should you update?

${feedback.rating === 'good' ? 
  'This response MATCHED what Author would say — extract as training pair.' :
  'This response DIVERGED from Author — note what went wrong.'}

Return JSON:
{
  "insights": ["What this teaches about Author"],
  "notepadUpdates": {
    "observations": [...],
    "gaps": [...],
    "mentalModels": [...]
  },
  "scratchpadUpdate": "Any notes to add",
  "trainingPair": ${feedback.rating === 'good' ? '{"system_prompt": "...", "user_content": "...", "assistant_content": "...", "quality_score": 0.9}' : 'null'}
}`
        }
      ]
    });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return;
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Store training pair if good feedback
      if (parsed.trainingPair && feedback.rating === 'good') {
        await this.storeTrainingPair(parsed.trainingPair, userId);
      }
      
      // Update notepad with insights
      if (parsed.notepadUpdates) {
        await this.updateNotepad(userId, parsed.notepadUpdates, parsed.scratchpadUpdate || '');
      }
      
      console.log(`[UnifiedEditor] Learned from ${feedback.rating} feedback: ${parsed.insights?.length || 0} insights`);
      
    } catch (e) {
      console.error('[UnifiedEditor] Failed to learn from feedback:', e);
    }
  }

  // ==========================================================================
  // Notepad operations
  // ==========================================================================
  
  async getNotepad(userId: string): Promise<Notepad> {
    // Get scratchpad
    const { data: scratchpadData } = await supabase
      .rpc('get_editor_scratchpad', { p_user_id: userId });
    
    // Get structured notes
    const { data: notes } = await supabase
      .from('editor_notes')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50);
    
    const allNotes = notes || [];
    
    return {
      scratchpad: scratchpadData?.[0]?.content || '',
      notes: {
        questions: allNotes.filter(n => n.type === 'question'),
        observations: allNotes.filter(n => n.type === 'observation'),
        gaps: allNotes.filter(n => n.type === 'gap'),
        mentalModels: allNotes.filter(n => n.type === 'mental_model')
      },
      stats: {
        totalNotes: allNotes.length,
        pendingQuestions: allNotes.filter(n => n.type === 'question').length,
        criticalPending: allNotes.filter(n => n.category === 'critical').length
      }
    };
  }
  
  private async updateNotepad(
    userId: string,
    updates: EditorResponse['notepadUpdates'],
    scratchpadAddition: string
  ): Promise<void> {
    // Add new notes
    const allNotes = [
      ...updates.observations,
      ...updates.gaps,
      ...updates.mentalModels
    ].map(n => ({
      ...n,
      user_id: userId,
      status: 'pending'
    }));
    
    if (allNotes.length > 0) {
      await supabase.from('editor_notes').insert(allNotes);
    }
    
    // Update scratchpad (append)
    if (scratchpadAddition.trim()) {
      const { data: current } = await supabase
        .rpc('get_editor_scratchpad', { p_user_id: userId });
      
      const currentContent = current?.[0]?.content || '';
      const newContent = currentContent 
        ? `${currentContent}\n\n---\n${new Date().toISOString()}\n${scratchpadAddition}`
        : scratchpadAddition;
      
      await supabase.rpc('update_editor_scratchpad', {
        p_user_id: userId,
        p_content: newContent.slice(-50000) // Keep last 50k chars
      });
    }
  }

  // ==========================================================================
  // Training decision
  // ==========================================================================
  
  async assessTrainingReadiness(userId: string): Promise<TrainingDecision> {
    const stats = await this.getTrainingStats(userId);
    const notepad = await this.getNotepad(userId);
    
    // Let the Editor decide
    const { text: response } = await generateText({
      model: getQualityModel(),
      messages: [
        {
          role: 'system',
          content: `You are assessing whether to trigger Ghost fine-tuning.

CURRENT STATE:
- Training pairs available: ${stats.trainingPairs}
- Average quality score: ${stats.avgQuality.toFixed(2)}
- Feedback count: ${stats.feedbackCount}
- Critical gaps pending: ${notepad.stats.criticalPending}

SUGGESTED THRESHOLDS (guidelines, not rules):
- Minimum: ~100 pairs for meaningful training
- Good: ~500 pairs for strong personality capture
- Quality: >0.6 average recommended

CONSIDERATIONS:
- Quality over quantity — better to wait for good data
- Critical gaps might mean missing important personality info
- Feedback validates Ghost accuracy

Should training be triggered?

Return JSON:
{
  "shouldTrain": true/false,
  "reasoning": "Explanation of decision"
}`
        }
      ]
    });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { shouldTrain: false, reasoning: 'Failed to assess', stats };
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        shouldTrain: parsed.shouldTrain || false,
        reasoning: parsed.reasoning || 'No reasoning provided',
        stats
      };
    } catch {
      return { shouldTrain: false, reasoning: 'Assessment failed', stats };
    }
  }

  // ==========================================================================
  // Storage helpers
  // ==========================================================================
  
  private async storeRawEntry(content: string, userId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('entries')
      .insert({ user_id: userId, content, source: 'editor:converse' })
      .select('id')
      .single();
    
    if (error) {
      console.error('[UnifiedEditor] Failed to store entry:', error);
      return null;
    }
    return data?.id || null;
  }
  
  private async storeMemory(item: MemoryItem, userId: string): Promise<void> {
    try {
      const embedding = await together.embeddings.create({
        model: "BAAI/bge-base-en-v1.5",
        input: item.content
      });
      
      await supabase.from('memory_fragments').insert({
        user_id: userId,
        content: item.content,
        embedding: embedding.data[0].embedding,
        entities: item.entities,
        importance: item.importance
      });
      
      console.log(`[UnifiedEditor] Stored memory: "${item.content.substring(0, 50)}..."`);
    } catch (e) {
      console.error('[UnifiedEditor] Failed to store memory:', e);
    }
  }
  
  private async storeTrainingPair(pair: TrainingPair, userId: string): Promise<void> {
    try {
      await supabase.from('training_pairs').insert({
        user_id: userId,
        system_prompt: pair.system_prompt,
        user_content: pair.user_content,
        assistant_content: pair.assistant_content,
        quality_score: pair.quality_score
      });
      
      console.log(`[UnifiedEditor] Stored training pair (quality: ${pair.quality_score})`);
    } catch (e) {
      console.error('[UnifiedEditor] Failed to store training pair:', e);
    }
  }

  // ==========================================================================
  // Stats helpers
  // ==========================================================================
  
  private async getTrainingStats(userId: string): Promise<{
    trainingPairs: number;
    avgQuality: number;
    feedbackCount: number;
  }> {
    const [pairsResult, feedbackResult] = await Promise.all([
      supabase
        .from('training_pairs')
        .select('quality_score')
        .eq('user_id', userId),
      supabase
        .from('feedback_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
    ]);
    
    const pairs = pairsResult.data || [];
    const avgQuality = pairs.length > 0 
      ? pairs.reduce((sum, p) => sum + (p.quality_score || 0), 0) / pairs.length 
      : 0;
    
    return {
      trainingPairs: pairs.length,
      avgQuality,
      feedbackCount: feedbackResult.count || 0
    };
  }

  // ==========================================================================
  // Formatting helpers
  // ==========================================================================
  
  private formatNotepadContext(notepad: Notepad): string {
    const lines: string[] = [];
    
    if (notepad.scratchpad) {
      lines.push(`SCRATCHPAD:\n${notepad.scratchpad.slice(-2000)}\n`);
    }
    
    if (notepad.notes.observations.length > 0) {
      lines.push(`OBSERVATIONS (${notepad.notes.observations.length}):`);
      notepad.notes.observations.slice(0, 5).forEach(n => {
        lines.push(`- [${n.category}] ${n.content}`);
      });
    }
    
    if (notepad.notes.gaps.length > 0) {
      lines.push(`\nGAPS TO FILL (${notepad.notes.gaps.length}):`);
      notepad.notes.gaps.slice(0, 5).forEach(n => {
        lines.push(`- [${n.priority}] ${n.content}`);
      });
    }
    
    if (notepad.notes.mentalModels.length > 0) {
      lines.push(`\nMENTAL MODELS (${notepad.notes.mentalModels.length}):`);
      notepad.notes.mentalModels.slice(0, 3).forEach(n => {
        lines.push(`- ${n.content}`);
      });
    }
    
    return lines.join('\n') || 'Empty notepad — this is a new Author.';
  }
  
  private formatStatsContext(stats: { trainingPairs: number; avgQuality: number; feedbackCount: number }): string {
    return `Training pairs: ${stats.trainingPairs} (avg quality: ${stats.avgQuality.toFixed(2)})
Feedback samples: ${stats.feedbackCount}
Training ready: ${stats.trainingPairs >= 100 ? 'YES' : 'Not yet (need ~100+ pairs)'}`;
  }
  
  private parseEditorResponse(response: string, rawInput: string): EditorResponse & { scratchpadUpdate?: string } {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.fallbackResponse(rawInput);
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        message: parsed.message || "I'd like to learn more about you. Can you tell me more?",
        extraction: {
          raw: rawInput,
          objective: (parsed.extraction?.objective || []).map((o: Record<string, unknown>) => ({
            content: String(o.content || ''),
            entities: (o.entities as string[]) || [],
            importance: Number(o.importance) || 0.5
          })),
          subjective: (parsed.extraction?.subjective || []).map((s: Record<string, unknown>) => ({
            system_prompt: String(s.system_prompt || 'You are a digital ghost.'),
            user_content: String(s.user_content || ''),
            assistant_content: String(s.assistant_content || ''),
            quality_score: Number(s.quality_score) || 0.5
          }))
        },
        notepadUpdates: {
          observations: parsed.notepadUpdates?.observations || [],
          gaps: parsed.notepadUpdates?.gaps || [],
          mentalModels: parsed.notepadUpdates?.mentalModels || []
        },
        followUpQuestions: parsed.followUpQuestions || [],
        trainingRecommendation: parsed.trainingRecommendation,
        scratchpadUpdate: parsed.scratchpadUpdate
      };
    } catch (e) {
      console.error('[UnifiedEditor] Failed to parse response:', e);
      return this.fallbackResponse(rawInput);
    }
  }
  
  private fallbackResponse(rawInput: string): EditorResponse & { scratchpadUpdate?: string } {
    return {
      message: "That's interesting. Can you tell me more about what that means to you?",
      extraction: {
        raw: rawInput,
        objective: [],
        subjective: []
      },
      notepadUpdates: {
        observations: [],
        gaps: [],
        mentalModels: []
      },
      followUpQuestions: [{
        question: "What does this reveal about who you are?",
        reason: "Understand Author identity",
        priority: 'helpful'
      }],
      scratchpadUpdate: ''
    };
  }

  // ==========================================================================
  // RLAIF: Synthetic Feedback Generation
  // ==========================================================================
  
  /**
   * Generate synthetic feedback to multiply Author's training data
   * Editor evaluates Ghost responses using notepad + feedback patterns
   */
  async generateSyntheticFeedback(
    userId: string,
    options: { maxPrompts?: number } = {}
  ): Promise<{
    generated: number;
    autoApproved: number;
    queuedForReview: number;
    prompts: string[];
  }> {
    const { maxPrompts = 5 } = options;
    
    // 1. Generate prompts based on gaps and corpus
    const prompts = await this.generateSyntheticPrompts(userId, maxPrompts);
    
    if (prompts.length === 0) {
      return { generated: 0, autoApproved: 0, queuedForReview: 0, prompts: [] };
    }
    
    // 2. Get Ghost responses for each prompt
    const ghostResponses = await this.getGhostResponses(prompts, userId);
    
    // 3. Evaluate each response
    let autoApproved = 0;
    let queuedForReview = 0;
    
    for (const { prompt, response } of ghostResponses) {
      const evaluation = await this.evaluateGhostResponse(prompt, response, userId);
      
      // 4. Route based on confidence
      if (evaluation.confidence === 'high') {
        // Auto-approve: add to training pairs
        await this.storeTrainingPair({
          system_prompt: 'You are a digital ghost.',
          user_content: prompt,
          assistant_content: response,
          quality_score: evaluation.rating === 'good' ? 0.85 : 0.3 // Good = high quality, bad = low (for filtering)
        }, userId);
        
        await this.storeSyntheticRating(userId, prompt, response, evaluation, 'auto_approved');
        autoApproved++;
        
      } else if (evaluation.confidence === 'medium') {
        // Medium confidence: add but flag
        if (evaluation.rating === 'good') {
          await this.storeTrainingPair({
            system_prompt: 'You are a digital ghost.',
            user_content: prompt,
            assistant_content: response,
            quality_score: 0.7 // Medium confidence = medium quality
          }, userId);
        }
        
        await this.storeSyntheticRating(userId, prompt, response, evaluation, 'auto_approved');
        autoApproved++;
        
      } else {
        // Low confidence: queue for Author review via notepad
        const noteId = await this.queueForReview(userId, prompt, response, evaluation);
        await this.storeSyntheticRating(userId, prompt, response, evaluation, 'queued_review', noteId);
        queuedForReview++;
      }
    }
    
    console.log(`[RLAIF] Generated ${prompts.length} synthetic evaluations: ${autoApproved} auto-approved, ${queuedForReview} queued for review`);
    
    return {
      generated: prompts.length,
      autoApproved,
      queuedForReview,
      prompts
    };
  }
  
  /**
   * Generate prompts for synthetic feedback
   * Based on gaps in notepad + prompt corpus
   */
  private async generateSyntheticPrompts(userId: string, maxPrompts: number): Promise<string[]> {
    const notepad = await this.getNotepad(userId);
    
    // Get prompt corpus as seeds
    const { data: corpus } = await supabase
      .from('prompt_corpus')
      .select('prompt, category')
      .limit(20);
    
    const corpusPrompts = corpus?.map(c => c.prompt) || [];
    
    // Generate prompts based on gaps
    const { text: response } = await generateText({
      model: getFastModel(),
      messages: [
        {
          role: 'system',
          content: `You are generating prompts to test a Ghost (digital twin).

YOUR NOTEPAD (gaps and observations about the Author):
${this.formatNotepadContext(notepad)}

PROMPT CORPUS (examples):
${corpusPrompts.slice(0, 10).join('\n')}

Generate ${maxPrompts} diverse prompts that would:
1. Test areas where you have GAPS in understanding the Author
2. Explore personality/voice patterns you've observed
3. Cover different topics and response types

Return JSON array of prompts:
["prompt 1", "prompt 2", ...]

Focus on SUBJECTIVE prompts (opinions, reactions, style) over factual ones.`
        }
      ]
    });
    
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return corpusPrompts.slice(0, maxPrompts);
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Handle both string arrays and object arrays
      const prompts = parsed.map((p: unknown) => {
        if (typeof p === 'string') return p;
        if (typeof p === 'object' && p !== null && 'prompt' in p) return String((p as { prompt: unknown }).prompt);
        return String(p);
      });
      
      return prompts.slice(0, maxPrompts);
    } catch {
      return corpusPrompts.slice(0, maxPrompts);
    }
  }
  
  /**
   * Get Ghost responses for prompts
   */
  private async getGhostResponses(
    prompts: string[], 
    userId: string
  ): Promise<{ prompt: string; response: string }[]> {
    const results: { prompt: string; response: string }[] = [];
    
    // Get Ghost model
    const { data: twin } = await supabase
      .from('twins')
      .select('model_id')
      .eq('user_id', userId)
      .single();
    
    const ghostModelId = twin?.model_id || 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo';
    
    // Get memories for context
    const { data: memories } = await supabase
      .from('memory_fragments')
      .select('content')
      .eq('user_id', userId)
      .limit(20);
    
    const memoryContext = memories?.map(m => m.content).join('\n') || '';
    
    // Generate responses (sequentially to avoid rate limits)
    for (const prompt of prompts) {
      try {
        const { text } = await generateText({
          model: getQualityModel(), // Simulate Ghost with quality model
          messages: [
            {
              role: 'system',
              content: `You are a Ghost (digital twin) of an Author. Respond as them.

YOUR MEMORIES:
${memoryContext}

Respond naturally, in first person, as the Author would.`
            },
            { role: 'user', content: prompt }
          ]
        });
        
        results.push({ prompt, response: text });
      } catch (e) {
        console.error('[RLAIF] Failed to get Ghost response:', e);
      }
    }
    
    return results;
  }
  
  /**
   * Evaluate a Ghost response using Author's patterns
   */
  async evaluateGhostResponse(
    prompt: string,
    response: string,
    userId: string
  ): Promise<{
    rating: 'good' | 'bad';
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    uncertainties: string[];
  }> {
    const notepad = await this.getNotepad(userId);
    
    // Get feedback history
    const { data: feedbackHistory } = await supabase
      .from('feedback_logs')
      .select('prompt, response, feedback, comment')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    const feedbackContext = feedbackHistory?.map(f => 
      `${f.feedback === 1 ? 'GOOD' : 'BAD'}: "${f.prompt?.substring(0, 50)}..." → ${f.comment || 'no comment'}`
    ).join('\n') || 'No feedback history yet.';
    
    // Get constitution
    const { data: profile } = await supabase
      .from('personality_profiles')
      .select('constitutional_rules, style_analysis')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();
    
    const constitution = profile?.constitutional_rules?.join('\n') || 'No constitution yet.';
    
    const { text: evalResponse } = await generateText({
      model: getFastModel(),
      messages: [
        {
          role: 'system',
          content: `You are evaluating if a Ghost response sounds like the Author.

AUTHOR CONTEXT:

NOTEPAD (observations about Author):
${this.formatNotepadContext(notepad)}

FEEDBACK HISTORY (what Author liked/disliked):
${feedbackContext}

CONSTITUTIONAL RULES:
${constitution}

GHOST RESPONSE TO EVALUATE:
Prompt: "${prompt}"
Response: "${response}"

EVALUATE:
1. Does this SOUND like the Author based on your observations?
2. Does it match PATTERNS from their feedback history?
3. Would Author rate this good or bad?

Be HONEST about uncertainty. If you don't have enough data, say so.

Return JSON:
{
  "rating": "good" or "bad",
  "confidence": "high" or "medium" or "low",
  "reasoning": "Why this matches/doesn't match Author's patterns",
  "uncertainties": ["What you're unsure about"]
}`
        }
      ]
    });
    
    try {
      const jsonMatch = evalResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { rating: 'good', confidence: 'low', reasoning: 'Failed to parse', uncertainties: ['Parse error'] };
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        rating: parsed.rating === 'bad' ? 'bad' : 'good',
        confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'low',
        reasoning: parsed.reasoning || '',
        uncertainties: parsed.uncertainties || []
      };
    } catch {
      return { rating: 'good', confidence: 'low', reasoning: 'Parse failed', uncertainties: ['Error parsing response'] };
    }
  }
  
  /**
   * Queue low-confidence evaluation for Author review via notepad
   */
  private async queueForReview(
    userId: string,
    prompt: string,
    response: string,
    evaluation: { rating: 'good' | 'bad'; reasoning: string }
  ): Promise<string | null> {
    const question = `I evaluated a Ghost response and thought it was ${evaluation.rating}. ` +
      `The prompt was: "${prompt.substring(0, 100)}..." ` +
      `My reasoning: ${evaluation.reasoning}. ` +
      `Does this assessment seem right to you?`;
    
    const { data, error } = await supabase
      .from('editor_notes')
      .insert({
        user_id: userId,
        type: 'question',
        content: question,
        context: `Ghost response: "${response.substring(0, 200)}..."`,
        topic: 'rlaif_validation',
        priority: 'medium',
        category: 'non_critical',
        status: 'pending'
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('[RLAIF] Failed to queue for review:', error);
      return null;
    }
    
    return data?.id || null;
  }
  
  /**
   * Store synthetic rating record
   */
  private async storeSyntheticRating(
    userId: string,
    prompt: string,
    response: string,
    evaluation: { rating: 'good' | 'bad'; confidence: string; reasoning: string; uncertainties: string[] },
    status: string,
    reviewNoteId?: string | null
  ): Promise<void> {
    await supabase.from('synthetic_ratings').insert({
      user_id: userId,
      prompt,
      response,
      rating: evaluation.rating,
      confidence: evaluation.confidence,
      reasoning: evaluation.reasoning,
      uncertainties: evaluation.uncertainties,
      prompt_source: 'editor_generated',
      status,
      review_note_id: reviewNoteId
    });
  }
  
  /**
   * Get RLAIF statistics
   */
  async getRLAIFStats(userId: string): Promise<{
    totalSynthetic: number;
    autoApproved: number;
    queuedReview: number;
    authorValidated: number;
    agreementRate: number | null;
    byConfidence: { high: number; medium: number; low: number };
  }> {
    const { data } = await supabase.rpc('get_rlaif_stats', { p_user_id: userId });
    
    if (!data || data.length === 0) {
      return {
        totalSynthetic: 0,
        autoApproved: 0,
        queuedReview: 0,
        authorValidated: 0,
        agreementRate: null,
        byConfidence: { high: 0, medium: 0, low: 0 }
      };
    }
    
    const stats = data[0];
    return {
      totalSynthetic: Number(stats.total_synthetic) || 0,
      autoApproved: Number(stats.auto_approved) || 0,
      queuedReview: Number(stats.queued_review) || 0,
      authorValidated: Number(stats.author_validated) || 0,
      agreementRate: stats.author_agreement_rate,
      byConfidence: stats.by_confidence || { high: 0, medium: 0, low: 0 }
    };
  }
  
  /**
   * Author validates a synthetic rating
   */
  async validateSyntheticRating(
    ratingId: string,
    userId: string,
    agreed: boolean,
    comment?: string
  ): Promise<void> {
    await supabase
      .from('synthetic_ratings')
      .update({
        status: 'author_validated',
        author_validated_at: new Date().toISOString(),
        author_agreed: agreed,
        author_comment: comment
      })
      .eq('id', ratingId)
      .eq('user_id', userId);
    
    // If Author disagreed, we can learn from this
    if (!agreed) {
      // Add observation about what Editor got wrong
      await supabase.from('editor_notes').insert({
        user_id: userId,
        type: 'observation',
        content: `My RLAIF evaluation was wrong. Author disagreed. ${comment || ''}`,
        topic: 'rlaif_calibration',
        priority: 'high',
        category: 'non_critical',
        status: 'pending'
      });
    }
  }
}

