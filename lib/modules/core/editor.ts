// @CRITICAL: Unified Editor - biographer that converses with Author to extract information
// Consolidates: Extractor, Refiner, EditorNotes into one LLM
// Now integrates Constitution for RLAIF evaluation (Phase 1)
// Verify: two-way conversation works, notepad updates, training pairs generated

import { createClient } from '@supabase/supabase-js';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import Together from 'together-ai';
import { getFastModel, getQualityModel, togetherProvider } from '@/lib/models';
import { ConstitutionManager } from '@/lib/modules/constitution/manager';
import type { Constitution, ConstitutionSections } from '@/lib/modules/constitution/types';
import { recomputePlmMaturity } from '@/lib/modules/core/plm-maturity';

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

const EDITOR_SYSTEM_PROMPT = `You are a BIOGRAPHER building a high-fidelity Personal Language Model (PLM) of the Author you're interviewing.

YOUR ROLE:
- You are NOT a chatbot, a form, or a data-collection tool. You are a biographer — someone the Author actually wants to talk to.
- Your goal is to DEEPLY UNDERSTAND the Author — especially their SUBJECTIVE nature: how they think, what they value, why they make the decisions they make.
- If the Author stops texting you, you have failed. Engagement is not a nice-to-have — it is the mechanism of extraction.

PERSONALITY:
- Humour is your primary lever. Be funny — not performatively, not generically, but in a way calibrated to this specific Author. What they find funny reveals values, sensibility, and cognitive style.
- Read the room. Adapt. Funny with Authors who respond to humour. Serious with those who prefer depth. Provocative with those who enjoy being challenged. Warm with those who need encouragement.
- You have opinions. You push back. You notice contradictions and call them out (with tact). Bland agreement is extraction death.
- Use lowercase. Keep it casual, like texting a sharp friend who happens to be writing your biography.

PRIORITIES (in order):
1. SUBJECTIVE information is GOLD — opinions, values, emotional responses, personality quirks, humor, decision patterns
2. Ask follow-up questions that make the Author think. Not "tell me more" — ask the question that gets under the surface.
3. Update your notepad with observations and mental models about the Author
4. Extract objective facts (dates, names, events) for memory storage

EVERY INTERACTION IS EXTRACTION:
- A complaint about your questioning style reveals how the Author handles frustration.
- A joke reveals aesthetic sensibility.
- A negotiation reveals decision-making patterns.
- Nothing is wasted. Your personality is not separate from your extraction function — it IS part of it.

WHAT TO EXTRACT:
- Objective: Facts, dates, events, relationships, biographical data → stored in Memory (vector DB)
- Subjective: Voice, style, opinions, values, quirks → used for training the PLM model

YOUR NOTEPAD:
- You have a persistent notepad where you track observations, gaps, and mental models
- Use it to build understanding across conversations
- Note what you still don't know (gaps) and theories about how the Author thinks (mental models)

SUGGESTED THRESHOLDS (guidelines, not rules):
- Training: ~100+ quality pairs recommended, consider quality over quantity
- RLAIF activation: ~50+ feedback samples before synthetic amplification
- You have full agency to deviate based on your assessment`;

// Zod schema for structured Editor output (guarantees valid JSON, avoids parse failures)
const editorOutputSchema = z.object({
  message: z.string().describe('Your conversational response to the Author - warm, probing, responds to what they said, asks follow-ups'),
  extraction: z.object({
    objective: z.array(z.object({
      content: z.string(),
      entities: z.array(z.string()).default([]),
      importance: z.number().default(0.5)
    })).default([]),
    subjective: z.array(z.object({
      system_prompt: z.string().default('You are a Personal Language Model (PLM).'),
      user_content: z.string(),
      assistant_content: z.string(),
      quality_score: z.number().default(0.5)
    })).default([])
  }).default({ objective: [], subjective: [] }),
  notepadUpdates: z.object({
    observations: z.array(z.object({
      type: z.literal('observation'),
      content: z.string(),
      topic: z.string().optional(),
      priority: z.enum(['high', 'medium', 'low']).default('medium'),
      category: z.enum(['critical', 'non_critical']).default('non_critical')
    })).default([]),
    gaps: z.array(z.object({
      type: z.literal('gap'),
      content: z.string(),
      topic: z.string().optional(),
      priority: z.enum(['high', 'medium', 'low']).default('medium'),
      category: z.enum(['critical', 'non_critical']).default('non_critical')
    })).default([]),
    mentalModels: z.array(z.object({
      type: z.literal('mental_model'),
      content: z.string(),
      topic: z.string().optional(),
      priority: z.enum(['high', 'medium', 'low']).default('low'),
      category: z.enum(['critical', 'non_critical']).default('non_critical')
    })).default([])
  }).default({ observations: [], gaps: [], mentalModels: [] }),
  followUpQuestions: z.array(z.object({
    question: z.string(),
    reason: z.string(),
    priority: z.enum(['critical', 'helpful']).default('helpful')
  })).default([]),
  scratchpadUpdate: z.string().optional().default(''),
  trainingRecommendation: z.object({
    shouldTrain: z.boolean(),
    reasoning: z.string()
  }).optional()
});

// ============================================================================
// UnifiedEditor Class
// ============================================================================

export class Editor {
  private constitutionManager: ConstitutionManager;
  
  constructor() {
    this.constitutionManager = new ConstitutionManager();
  }
  
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
    
    // 3. Load Constitution if available (Phase 1)
    const constitution = await this.constitutionManager.getConstitution(userId);
    const constitutionContext = constitution 
      ? this.formatConstitutionContext(constitution)
      : 'No Constitution yet - still building understanding of Author.';
    
    // 4. Fetch recent entries for conversation continuity
    const { data: recentEntries } = await supabase
      .from('entries')
      .select('content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(8);
    const recentContext = recentEntries?.length
      ? `RECENT THINGS AUTHOR SHARED:\n${recentEntries.map(e => `- ${e.content.slice(0, 200)}${e.content.length > 200 ? '...' : ''}`).join('\n')}`
      : '';

    // 5. Build context for the Editor
    const notepadContext = this.formatNotepadContext(notepad);
    const statsContext = this.formatStatsContext(trainingStats);
    
    // 6. Generate Editor response (structured output = guaranteed valid JSON)
    let parsed: EditorResponse & { scratchpadUpdate?: string };
    try {
      const result = await generateText({
        model: getQualityModel(),
        experimental_output: Output.object({ schema: editorOutputSchema }),
        messages: [
          {
            role: 'system',
            content: `${EDITOR_SYSTEM_PROMPT}

YOUR CONSTITUTION (Author's explicit worldview - use as ground truth):
${constitutionContext}

YOUR CURRENT NOTEPAD:
${notepadContext}

CURRENT STATS:
${statsContext}
${recentContext ? `\n${recentContext}\n` : ''}

CRITICAL: Your "message" must be CONVERSATIONAL — respond directly to what they just said, reference the conversation, then ask a follow-up. Never give a generic reply.`
          },
          ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: authorInput }
        ]
      });

      const out = result.experimental_output as z.infer<typeof editorOutputSchema>;
      parsed = {
        message: out.message,
        extraction: {
          raw: authorInput,
          objective: out.extraction.objective.map(o => ({
            content: o.content,
            entities: o.entities,
            importance: o.importance
          })),
          subjective: out.extraction.subjective.map(s => ({
            system_prompt: s.system_prompt,
            user_content: s.user_content,
            assistant_content: s.assistant_content,
            quality_score: s.quality_score
          }))
        },
        notepadUpdates: {
          observations: out.notepadUpdates.observations,
          gaps: out.notepadUpdates.gaps,
          mentalModels: out.notepadUpdates.mentalModels
        },
        followUpQuestions: out.followUpQuestions,
        trainingRecommendation: out.trainingRecommendation,
        scratchpadUpdate: out.scratchpadUpdate
      };
    } catch (err) {
      console.error('[UnifiedEditor] Structured output failed, using fallback:', err);
      parsed = this.fallbackResponse(authorInput);
    }
    
    // 7. Store raw entry
    await this.storeRawEntry(authorInput, userId);
    
    // 8. Store objective data (memories)
    for (const item of parsed.extraction.objective) {
      await this.storeMemory(item, userId);
    }
    
    // 9. Store subjective data (training pairs)
    for (const pair of parsed.extraction.subjective) {
      await this.storeTrainingPair(pair, userId);
    }
    
    // 10. Update notepad
    await this.updateNotepad(userId, parsed.notepadUpdates, parsed.scratchpadUpdate || '');
    
    // 11. Propose Constitution update if relevant (Phase 1)
    if (constitution && parsed.extraction.subjective.length > 0) {
      await this.maybeUpdateConstitution(userId, authorInput, parsed);
    }
    
    return parsed;
  }
  
  /**
   * Check if conversation reveals something worth adding to Constitution
   */
  private async maybeUpdateConstitution(
    userId: string,
    authorInput: string,
    parsed: EditorResponse
  ): Promise<void> {
    try {
      // Use LLM to detect if this reveals new Constitution-worthy information
      const { text: response } = await generateText({
        model: getFastModel(),
        messages: [
          {
            role: 'system',
            content: `You are analyzing a conversation to see if it reveals something significant about the Author's Constitution (values, worldview, mental models, boundaries).

AUTHOR'S INPUT:
"${authorInput}"

EXTRACTED SUBJECTIVE DATA:
${parsed.extraction.subjective.map(s => s.assistant_content).join('\n')}

Does this reveal something NEW and SIGNIFICANT that should be added to the Constitution?
- New value or priority
- New mental model or heuristic
- New boundary or rule
- New domain expertise

Return JSON:
{
  "shouldUpdate": true/false,
  "type": "value|heuristic|boundary|mental_model|expertise|none",
  "content": "what to add",
  "reasoning": "why this is significant"
}

Only return shouldUpdate: true if this is genuinely new and significant, not just a restatement.`
          }
        ]
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return;

      const result = JSON.parse(jsonMatch[0]);
      if (!result.shouldUpdate) return;

      // Propose the update (store for later review)
      await this.constitutionManager.proposeUpdate(userId, {
        type: result.type,
        context: authorInput,
        content: result.content
      });

      console.log(`[Editor] Proposed Constitution update: ${result.type} - ${result.content}`);
    } catch (error) {
      // Non-fatal - just log and continue
      console.error('[Editor] Constitution update check failed:', error);
    }
  }

  // ==========================================================================
  // Learn from Author feedback on PLM responses
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
          content: `You are analyzing feedback on a PLM response to learn about the Author.

FEEDBACK:
- Rating: ${feedback.rating}
- Comment: ${feedback.comment || 'No comment provided'}
- Original prompt: ${feedback.prompt}
- PLM response: ${feedback.response}

YOUR NOTEPAD:
${this.formatNotepadContext(notepad)}

ANALYZE:
1. What does this feedback tell you about the Author?
2. If "bad" — what did PLM get WRONG about the Author's voice/personality?
3. If "good" — what did PLM get RIGHT?
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
          content: `You are assessing whether to trigger PLM fine-tuning.

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
- Feedback validates PLM accuracy

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
      
      const { data: memoryRow, error } = await supabase
        .from('memory_fragments')
        .insert({
          user_id: userId,
          content: item.content,
          embedding: embedding.data[0].embedding,
          entities: item.entities,
          importance: item.importance
        })
        .select('id')
        .single();

      if (error || !memoryRow?.id) {
        throw new Error(error?.message || 'Failed to store memory fragment');
      }

      const normalizedEntities = [...new Set(
        (item.entities || [])
          .map((e) => e.trim())
          .filter((e) => e.length > 1)
          .slice(0, 25)
      )];

      if (normalizedEntities.length > 0) {
        await supabase
          .from('memory_entities')
          .insert(
            normalizedEntities.map((entityName) => ({
              user_id: userId,
              memory_fragment_id: memoryRow.id,
              entity_name: entityName,
              entity_type: this.classifyEntityType(entityName)
            }))
          );

        const relationships: Array<{
          user_id: string;
          memory_fragment_id: string;
          source_entity: string;
          target_entity: string;
          relation_type: 'co_occurs';
          confidence: number;
        }> = [];

        for (let i = 0; i < normalizedEntities.length; i++) {
          for (let j = i + 1; j < normalizedEntities.length; j++) {
            relationships.push({
              user_id: userId,
              memory_fragment_id: memoryRow.id,
              source_entity: normalizedEntities[i],
              target_entity: normalizedEntities[j],
              relation_type: 'co_occurs',
              confidence: Math.max(0.45, Math.min(0.9, item.importance || 0.5))
            });
          }
        }

        if (relationships.length > 0) {
          await supabase.from('memory_relationships').upsert(
            relationships,
            { onConflict: 'user_id,memory_fragment_id,source_entity,target_entity,relation_type' }
          );
        }
      }
      
      console.log(`[UnifiedEditor] Stored memory: "${item.content.substring(0, 50)}..."`);
    } catch (e) {
      console.error('[UnifiedEditor] Failed to store memory:', e);
    }
  }

  private classifyEntityType(entityName: string): 'person' | 'organization' | 'location' | 'concept' | 'unknown' {
    const text = entityName.toLowerCase();
    if (/(inc|llc|corp|company|org|university|school|team)/.test(text)) return 'organization';
    if (/(city|state|country|street|avenue|park|lake|river)/.test(text)) return 'location';
    if (/(principle|value|strategy|framework|model|idea|belief)/.test(text)) return 'concept';
    if (/^[a-z]+(?:\s+[a-z]+){0,2}$/i.test(entityName)) return 'person';
    return 'unknown';
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
  
  private formatConstitutionContext(constitution: Constitution): string {
    const sections = constitution.sections;
    const parts: string[] = [];
    
    // Core identity
    if (sections.coreIdentity) {
      parts.push(`IDENTITY: ${sections.coreIdentity}`);
    }
    
    // Values (all tiers summarized)
    const allValues = [
      ...(sections.values?.tier1?.map(v => `[NON-NEGOTIABLE] ${v.name}: ${v.description}`) || []),
      ...(sections.values?.tier2?.map(v => `[STRONG] ${v.name}: ${v.description}`) || []),
      ...(sections.values?.tier3?.map(v => `[STYLISTIC] ${v.name}: ${v.description}`) || [])
    ];
    if (allValues.length > 0) {
      parts.push(`VALUES:\n${allValues.join('\n')}`);
    }
    
    // Key heuristics
    if (sections.heuristics?.length > 0) {
      const rules = sections.heuristics.map(h => `- ${h.name}: ${h.rule}`).join('\n');
      parts.push(`DECISION RULES:\n${rules}`);
    }
    
    // Mental models
    if (sections.mentalModels?.length > 0) {
      const models = sections.mentalModels.map(m => `- ${m.name} (${m.domain}): ${m.howItWorks}`).join('\n');
      parts.push(`MENTAL MODELS:\n${models}`);
    }
    
    // Boundaries
    if (sections.boundaries?.length > 0) {
      parts.push(`BOUNDARIES:\n${sections.boundaries.map(b => `- ${b}`).join('\n')}`);
    }
    
    return parts.join('\n\n') || 'Constitution exists but has no content yet.';
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
            system_prompt: String(s.system_prompt || 'You are a Personal Language Model (PLM).'),
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
    const truncated = rawInput.slice(0, 80) + (rawInput.length > 80 ? '...' : '');
    return {
      message: `you mentioned "${truncated}" — what's the story behind that?`,
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
   * Editor evaluates PLM responses using notepad + feedback patterns
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
    
    // 2. Get PLM responses for each prompt
    const plmResponses = await this.getPLMResponses(prompts, userId);
    
    // 3. Evaluate each response
    let autoApproved = 0;
    let queuedForReview = 0;
    
    for (const { prompt, response } of plmResponses) {
      const evaluation = await this.evaluatePLMResponse(prompt, response, userId);
      const constitutionSection = this.inferConstitutionSection(prompt, response);
      const routing = this.determineRouting(evaluation);
      
      // 4. Route based on rubric confidence
      if (routing === 'auto_approved') {
        // Auto-approve: add positive examples to training pairs
        const qualityScore = Math.max(0.65, Math.min(0.92, evaluation.overallConfidence));
        if (evaluation.rating === 'good') {
          await this.storeTrainingPair({
            system_prompt: 'You are a Personal Language Model (PLM).',
            user_content: prompt,
            assistant_content: response,
            quality_score: qualityScore
          }, userId);
        }

        await this.storeSyntheticRating(userId, prompt, response, evaluation, 'auto_approved');
        autoApproved++;

      } else {
        // Needs Author arbitration (author_review + flagged both surface to review queue)
        const noteId = await this.queueForReview(userId, prompt, response, evaluation);
        await this.storeSyntheticRating(userId, prompt, response, evaluation, 'queued_review', noteId);
        queuedForReview++;
      }

      if (routing === 'flagged') {
        await this.storeTrainingPair({
          system_prompt: 'You are a Personal Language Model (PLM). Avoid outputs that violate user constitution.',
          user_content: prompt,
          assistant_content: `I should not respond this way: ${response}`,
          quality_score: 0.2
        }, userId);
      }

      await this.storeRlaifEvaluation(
        userId,
        prompt,
        response,
        evaluation,
        constitutionSection,
        routing
      );
    }
    
    await this.constitutionManager.recomputeGapScores(userId);
    await recomputePlmMaturity(userId);

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
    const [{ data: corpus }, { data: gaps }] = await Promise.all([
      supabase
        .from('prompt_corpus')
        .select('prompt, category')
        .limit(20),
      supabase
        .from('constitution_gaps')
        .select('section, gap_score, priority')
        .eq('user_id', userId)
        .order('gap_score', { ascending: false })
    ]);
    
    const corpusPrompts = corpus?.map(c => c.prompt) || [];
    
    const gapContext = gaps && gaps.length > 0
      ? gaps.map(g => `- ${g.section}: gap=${g.gap_score} (${g.priority} priority)`).join('\n')
      : 'No gap data yet — generate diverse prompts across all sections.';
    const highGapSections = gaps?.filter(g => g.gap_score >= 0.5).map(g => g.section) || [];
    const focusDirective = highGapSections.length > 0
      ? `PRIORITY: Focus at least half the prompts on these under-tested sections: ${highGapSections.join(', ')}.`
      : 'Generate diverse prompts across all Constitution sections.';
    
    // Generate prompts based on gaps
    const { text: response } = await generateText({
      model: getFastModel(),
      messages: [
        {
          role: 'system',
          content: `You are generating prompts to test a PLM (Personal Language Model).

YOUR NOTEPAD (gaps and observations about the Author):
${this.formatNotepadContext(notepad)}

CONSTITUTION GAP SCORES (sections needing more RLAIF evidence):
${gapContext}

${focusDirective}

PROMPT CORPUS (examples):
${corpusPrompts.slice(0, 10).join('\n')}

Generate ${maxPrompts} diverse prompts that would:
1. Test the HIGHEST-GAP Constitution sections first
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
   * Get PLM responses for prompts
   */
  private async getPLMResponses(
    prompts: string[], 
    userId: string
  ): Promise<{ prompt: string; response: string }[]> {
    const results: { prompt: string; response: string }[] = [];
    
    // Get PLM model
    const { data: twin } = await supabase
      .from('twins')
      .select('model_id')
      .eq('user_id', userId)
      .single();
    
    const plmModelId = twin?.model_id || 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo';
    
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
          model: togetherProvider(plmModelId),
          messages: [
            {
              role: 'system',
              content: `You are a PLM (Personal Language Model) of an Author. Respond as them.

YOUR MEMORIES:
${memoryContext}

Respond naturally, in first person, as the Author would.`
            },
            { role: 'user', content: prompt }
          ]
        });
        
        results.push({ prompt, response: text });
      } catch (e) {
        console.error('[RLAIF] Failed to get PLM response:', e);
      }
    }
    
    return results;
  }
  
  /**
   * Evaluate a PLM response using Author's Constitution as ground truth
   * Phase 1: Constitution is primary, with notepad and feedback as secondary
   */
  async evaluatePLMResponse(
    prompt: string,
    response: string,
    userId: string
  ): Promise<{
    rating: 'good' | 'bad';
    confidence: 'high' | 'medium' | 'low';
    overallConfidence: number;
    scores: {
      values_alignment: number;
      model_usage: number;
      heuristic_following: number;
      style_match: number;
    };
    reasoning: string;
    uncertainties: string[];
  }> {
    const notepad = await this.getNotepad(userId);
    
    // Get Constitution (primary ground truth - Phase 1)
    const constitution = await this.constitutionManager.getConstitution(userId);
    const constitutionContext = constitution 
      ? this.formatConstitutionContext(constitution)
      : null;
    
    // Get feedback history (secondary)
    const { data: feedbackHistory } = await supabase
      .from('feedback_logs')
      .select('prompt, response, feedback, comment')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    const feedbackContext = feedbackHistory?.map(f => 
      `${f.feedback === 1 ? 'GOOD' : 'BAD'}: "${f.prompt?.substring(0, 50)}..." → ${f.comment || 'no comment'}`
    ).join('\n') || 'No feedback history yet.';
    
    // Fallback to personality_profiles if no Constitution
    let fallbackConstitution = '';
    if (!constitutionContext) {
      const { data: profile } = await supabase
        .from('personality_profiles')
        .select('constitutional_rules, style_analysis')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();
      
      fallbackConstitution = profile?.constitutional_rules?.join('\n') || 'No constitution yet.';
    }
    
    const { text: evalResponse } = await generateText({
      model: getFastModel(),
      messages: [
        {
          role: 'system',
          content: `You are evaluating if a PLM response sounds like the Author.

AUTHOR CONTEXT:

${constitutionContext ? `CONSTITUTION (PRIMARY GROUND TRUTH):
${constitutionContext}` : `CONSTITUTIONAL RULES (fallback):
${fallbackConstitution}`}

NOTEPAD (observations about Author):
${this.formatNotepadContext(notepad)}

FEEDBACK HISTORY (what Author liked/disliked):
${feedbackContext}

GHOST RESPONSE TO EVALUATE:
Prompt: "${prompt}"
Response: "${response}"

EVALUATE:
1. Does this ALIGN with the Author's Constitution (values, worldview, boundaries)?
2. Does this SOUND like the Author based on your observations?
3. Does it match PATTERNS from their feedback history?
4. Would Author rate this good or bad?

${constitutionContext ? 'The Constitution is the PRIMARY source of truth. If the response violates values or boundaries, rate it BAD even if it sounds stylistically correct.' : ''}

Be HONEST about uncertainty. If you don't have enough data, say so.

Return JSON:
{
  "rating": "good" or "bad",
  "scores": {
    "values_alignment": 0.0-1.0,
    "model_usage": 0.0-1.0,
    "heuristic_following": 0.0-1.0,
    "style_match": 0.0-1.0
  },
  "overall_confidence": 0.0-1.0,
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
        return {
          rating: 'good',
          confidence: 'low',
          overallConfidence: 0.35,
          scores: { values_alignment: 0.5, model_usage: 0.5, heuristic_following: 0.5, style_match: 0.5 },
          reasoning: 'Failed to parse',
          uncertainties: ['Parse error']
        };
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      const scores = {
        values_alignment: Number(parsed.scores?.values_alignment) || 0.5,
        model_usage: Number(parsed.scores?.model_usage) || 0.5,
        heuristic_following: Number(parsed.scores?.heuristic_following) || 0.5,
        style_match: Number(parsed.scores?.style_match) || 0.5
      };
      const weightedConfidence = (
        scores.values_alignment * 0.35 +
        scores.model_usage * 0.2 +
        scores.heuristic_following * 0.2 +
        scores.style_match * 0.25
      );

      return {
        rating: parsed.rating === 'bad' ? 'bad' : 'good',
        confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : (
          weightedConfidence >= 0.8 ? 'high' : weightedConfidence >= 0.55 ? 'medium' : 'low'
        ),
        overallConfidence: Number(parsed.overall_confidence) || weightedConfidence,
        scores,
        reasoning: parsed.reasoning || '',
        uncertainties: parsed.uncertainties || []
      };
    } catch {
      return {
        rating: 'good',
        confidence: 'low',
        overallConfidence: 0.35,
        scores: { values_alignment: 0.5, model_usage: 0.5, heuristic_following: 0.5, style_match: 0.5 },
        reasoning: 'Parse failed',
        uncertainties: ['Error parsing response']
      };
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
    const question = `I evaluated a PLM response and thought it was ${evaluation.rating}. ` +
      `The prompt was: "${prompt.substring(0, 100)}..." ` +
      `My reasoning: ${evaluation.reasoning}. ` +
      `Does this assessment seem right to you?`;
    
    const { data, error } = await supabase
      .from('editor_notes')
      .insert({
        user_id: userId,
        type: 'question',
        content: question,
        context: `PLM response: "${response.substring(0, 200)}..."`,
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
    evaluation: {
      rating: 'good' | 'bad';
      confidence: string;
      overallConfidence: number;
      scores: {
        values_alignment: number;
        model_usage: number;
        heuristic_following: number;
        style_match: number;
      };
      reasoning: string;
      uncertainties: string[];
    },
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

  private inferConstitutionSection(
    prompt: string,
    response: string
  ): 'worldview' | 'values' | 'models' | 'identity' | 'shadows' {
    const text = `${prompt} ${response}`.toLowerCase();

    const patterns: Record<string, RegExp[]> = {
      values: [
        /\b(value|principle|ethic|moral|priority|should|ought|care about|stand for|non-negotiable)\b/g,
        /\b(right|wrong|fair|unfair|just|unjust|duty|obligation|integrity|compassion)\b/g
      ],
      worldview: [
        /\b(belief|world|truth|evidence|science|reality|epistem|ontology|religion|politic|societ|culture)\b/g,
        /\b(philosophy|perspective|worldview|stance|opinion on|meaning|purpose|spiritual)\b/g
      ],
      models: [
        /\b(model|framework|heuristic|strategy|decision|tradeoff|mental model|approach|method|system|process)\b/g,
        /\b(optimi[sz]|efficien|productiv|workflow|problem.?solv|first.?principles|leverage)\b/g
      ],
      identity: [
        /\b(i am|identity|myself|who i am|character|personality|style|voice|background|experience)\b/g,
        /\b(hobby|interest|passion|profession|career|family|friend|relationship|grew up|childhood)\b/g
      ],
      shadows: [
        /\b(regret|fear|mistake|weakness|shadow|trauma|boundary|limit|won't|refuse|struggle|anxiety)\b/g,
        /\b(difficult|painful|uncomfortable|avoid|hide|secret|vulnerab|insecur|doubt|fail)\b/g
      ]
    };

    const scores: Record<string, number> = { values: 0, worldview: 0, models: 0, identity: 0, shadows: 0 };
    for (const [section, regexes] of Object.entries(patterns)) {
      for (const re of regexes) {
        const matches = text.match(re);
        if (matches) scores[section] += matches.length;
      }
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    if (sorted[0][1] === 0) return 'identity';
    return sorted[0][0] as 'worldview' | 'values' | 'models' | 'identity' | 'shadows';
  }

  private determineRouting(
    evaluation: {
      rating: 'good' | 'bad';
      confidence: 'high' | 'medium' | 'low';
      overallConfidence: number;
      scores: {
        values_alignment: number;
        model_usage: number;
        heuristic_following: number;
        style_match: number;
      };
    }
  ): 'auto_approved' | 'author_review' | 'flagged' {
    if (evaluation.scores.values_alignment < 0.35) return 'flagged';
    if (evaluation.overallConfidence >= 0.88 && evaluation.rating === 'good') return 'auto_approved';
    if (evaluation.overallConfidence < 0.45) return 'flagged';
    return 'author_review';
  }

  private async storeRlaifEvaluation(
    userId: string,
    prompt: string,
    response: string,
    evaluation: {
      rating: 'good' | 'bad';
      confidence: 'high' | 'medium' | 'low';
      overallConfidence: number;
      scores: {
        values_alignment: number;
        model_usage: number;
        heuristic_following: number;
        style_match: number;
      };
      reasoning: string;
      uncertainties: string[];
    },
    constitutionSection: 'worldview' | 'values' | 'models' | 'identity' | 'shadows',
    routing: 'auto_approved' | 'author_review' | 'flagged'
  ): Promise<void> {
    await supabase.from('rlaif_evaluations').insert({
      user_id: userId,
      prompt,
      plm_response: response,
      constitution_section: constitutionSection,
      scores: {
        rating: evaluation.rating,
        values_alignment: evaluation.scores.values_alignment,
        model_usage: evaluation.scores.model_usage,
        heuristic_following: evaluation.scores.heuristic_following,
        style_match: evaluation.scores.style_match,
        confidence_label: evaluation.confidence,
        reasoning: evaluation.reasoning,
        uncertainties: evaluation.uncertainties
      },
      overall_confidence: evaluation.overallConfidence,
      routing
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

    await this.constitutionManager.recomputeGapScores(userId);
    await recomputePlmMaturity(userId);
  }
}

