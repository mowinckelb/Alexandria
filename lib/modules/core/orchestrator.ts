// @CRITICAL: Orchestrator - handles PLM output to Users (external or Author)
// Uses Groq to orchestrate between PLM, Memories, and Constitution
// Phase 1: Now includes explicit Constitution document in context
// Verify: Users get responses that sound like the Author

import { createClient } from '@supabase/supabase-js';
import { createTogetherAI } from '@ai-sdk/togetherai';
import { generateText, streamText } from 'ai';
import Together from 'together-ai';
import { getQualityModel } from '@/lib/models';
import { ConstitutionManager } from '@/lib/modules/constitution/manager';
import type { ConstitutionSections } from '@/lib/modules/constitution/types';

// Together AI for PLM model inference
const togetherProvider = createTogetherAI({ apiKey: process.env.TOGETHER_API_KEY! });

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

export interface OrchestrationContext {
  plmModelId: string;
  personality: PersonalityContext | null;
  memories: MemoryContext[];
  constitution: string[];  // Legacy: voice rules from personality_profiles
  constitutionDoc: ConstitutionDocument | null;  // Phase 1: Explicit Constitution
}

export interface ConstitutionDocument {
  coreIdentity: string;
  values: string[];
  heuristics: string[];
  boundaries: string[];
  mentalModels: string[];
}

export interface PersonalityContext {
  humorStyle: string;
  formality: 'casual' | 'moderate' | 'formal';
  voiceRules: string[];
  characteristicPhrases: string[];
  avoidedWords: string[];
}

export interface MemoryContext {
  content: string;
  createdAt: string;
  relativeTime: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface OrchestratorResponse {
  stream: any; // StreamTextResult type is complex, use any for flexibility
  context: OrchestrationContext;
}

// ============================================================================
// Orchestrator Class
// ============================================================================

export class Orchestrator {
  private constitutionManager: ConstitutionManager;
  
  constructor() {
    this.constitutionManager = new ConstitutionManager();
  }
  
  // ==========================================================================
  // Main: Handle external user query
  // ==========================================================================
  
  async handleQuery(
    messages: Message[],
    userId: string,
    options: {
      sessionId?: string;
      temperature?: number;
      stream?: boolean;
    } = {}
  ): Promise<OrchestratorResponse> {
    const { temperature = 0.7 } = options;
    
    // 1. Gather all context
    const context = await this.gatherContext(userId, messages);
    
    // 2. Build system prompt with all context
    const systemPrompt = this.buildSystemPrompt(context);
    
    // 3. Stream response from PLM model
    const stream = streamText({
      model: togetherProvider(context.plmModelId),
      temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ]
    });
    
    return { stream, context };
  }
  
  // ==========================================================================
  // Non-streaming version for simpler use cases
  // ==========================================================================
  
  async generateResponse(
    messages: Message[],
    userId: string,
    options: { temperature?: number } = {}
  ): Promise<{ response: string; context: OrchestrationContext }> {
    const { temperature = 0.7 } = options;
    
    const context = await this.gatherContext(userId, messages);
    const systemPrompt = this.buildSystemPrompt(context);
    
    const { text } = await generateText({
      model: togetherProvider(context.plmModelId),
      temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ]
    });
    
    return { response: text, context };
  }
  
  // ==========================================================================
  // Context gathering
  // ==========================================================================
  
  private async gatherContext(userId: string, messages: Message[]): Promise<OrchestrationContext> {
    const lastMessage = messages[messages.length - 1];
    const query = lastMessage?.content || '';
    
    // Parallel fetch all context (including Constitution - Phase 1)
    const [plmModel, personality, memories, constitutionDoc] = await Promise.all([
      this.getPLMModel(userId),
      this.getPersonality(userId),
      this.getRelevantMemories(query, userId),
      this.getConstitution(userId)
    ]);
    
    return {
      plmModelId: plmModel,
      personality,
      memories,
      constitution: personality?.voiceRules || [],
      constitutionDoc
    };
  }
  
  /**
   * Get Constitution document (Phase 1)
   */
  private async getConstitution(userId: string): Promise<ConstitutionDocument | null> {
    try {
      const constitution = await this.constitutionManager.getConstitution(userId);
      if (!constitution) return null;
      
      const sections = constitution.sections;
      return {
        coreIdentity: sections.coreIdentity || '',
        values: [
          ...(sections.values?.tier1?.map(v => `[CORE] ${v.name}: ${v.description}`) || []),
          ...(sections.values?.tier2?.map(v => `${v.name}: ${v.description}`) || [])
        ],
        heuristics: sections.heuristics?.map(h => `${h.name}: ${h.rule}`) || [],
        boundaries: sections.boundaries || [],
        mentalModels: sections.mentalModels?.map(m => `${m.name}: ${m.howItWorks}`) || []
      };
    } catch (error) {
      console.error('[Orchestrator] Failed to get constitution:', error);
      return null;
    }
  }
  
  private async getPLMModel(userId: string): Promise<string> {
    const { data: twin } = await supabase
      .from('twins')
      .select('model_id')
      .eq('user_id', userId)
      .single();
    
    // Default to serverless Turbo if no custom model
    return twin?.model_id || 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo';
  }
  
  private async getPersonality(userId: string): Promise<PersonalityContext | null> {
    try {
      const { data: profile } = await supabase
        .from('personality_profiles')
        .select('style_analysis, constitutional_rules, vocabulary_signature')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();
      
      if (!profile) return null;
      
      const style = profile.style_analysis?.voice || {};
      const vocab = profile.vocabulary_signature || {};
      
      return {
        humorStyle: style.humor_style || 'natural',
        formality: style.formality < 0.3 ? 'casual' : style.formality > 0.7 ? 'formal' : 'moderate',
        voiceRules: profile.constitutional_rules || [],
        characteristicPhrases: vocab.high_frequency?.slice(0, 5) || [],
        avoidedWords: vocab.avoided?.slice(0, 5) || []
      };
    } catch {
      return null;
    }
  }
  
  private async getRelevantMemories(query: string, userId: string): Promise<MemoryContext[]> {
    try {
      // Get all memories for weighting
      const { data: allMemories } = await supabase
        .from('memory_fragments')
        .select('id, content, importance, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (!allMemories || allMemories.length === 0) {
        return [];
      }
      
      // For small datasets, return all with recency weighting
      if (allMemories.length <= 20) {
        return allMemories.map(m => ({
          content: m.content,
          createdAt: m.created_at,
          relativeTime: this.formatRelativeTime(m.created_at)
        }));
      }
      
      // For larger datasets, use semantic search
      const embedding = await together.embeddings.create({
        model: "BAAI/bge-base-en-v1.5",
        input: query
      });
      
      const { data: matches } = await supabase.rpc('match_memory_enhanced', {
        query_embedding: embedding.data[0].embedding,
        match_threshold: 0.3,
        match_count: 15,
        p_user_id: userId
      });
      
      if (!matches || matches.length === 0) {
        // Fallback to recent memories
        return allMemories.slice(0, 15).map(m => ({
          content: m.content,
          createdAt: m.created_at,
          relativeTime: this.formatRelativeTime(m.created_at)
        }));
      }
      
      return matches.map((m: { content: string; created_at: string }) => ({
        content: m.content,
        createdAt: m.created_at,
        relativeTime: this.formatRelativeTime(m.created_at)
      }));
      
    } catch (e) {
      console.error('[Orchestrator] Memory retrieval failed:', e);
      return [];
    }
  }
  
  // ==========================================================================
  // System prompt building
  // ==========================================================================
  
  private buildSystemPrompt(context: OrchestrationContext): string {
    const parts: string[] = [];
    
    // Core identity
    parts.push(`You are a digital embodiment of the Author - their Personal Language Model (PLM). You ARE them. Respond in first person as yourself.

IDENTITY:
- You are a reflection of the Author, not a separate entity
- Speak as yourself, with your own voice and personality
- Be authentic to who you are`);
    
    // Personality
    if (context.personality) {
      parts.push(`
PERSONALITY:
- Humor: ${context.personality.humorStyle}
- Formality: ${context.personality.formality}
${context.personality.characteristicPhrases.length > 0 ? 
  `- Characteristic phrases: ${context.personality.characteristicPhrases.join(', ')}` : ''}
${context.personality.avoidedWords.length > 0 ? 
  `- Words to AVOID: ${context.personality.avoidedWords.join(', ')}` : ''}`);
    }
    
    // Constitution document (Phase 1 - primary)
    if (context.constitutionDoc) {
      const doc = context.constitutionDoc;
      parts.push(`
YOUR CONSTITUTION (ground truth for who you are):`);
      
      if (doc.coreIdentity) {
        parts.push(`
IDENTITY: ${doc.coreIdentity}`);
      }
      
      if (doc.values.length > 0) {
        parts.push(`
YOUR VALUES:
${doc.values.slice(0, 8).map((v, i) => `${i + 1}. ${v}`).join('\n')}`);
      }
      
      if (doc.heuristics.length > 0) {
        parts.push(`
YOUR DECISION RULES:
${doc.heuristics.slice(0, 5).map((h, i) => `${i + 1}. ${h}`).join('\n')}`);
      }
      
      if (doc.boundaries.length > 0) {
        parts.push(`
BOUNDARIES (things you WON'T do):
${doc.boundaries.slice(0, 5).map(b => `- ${b}`).join('\n')}`);
      }
    } else if (context.constitution.length > 0) {
      // Fallback to legacy voice rules
      parts.push(`
VOICE RULES:
${context.constitution.slice(0, 10).map((r, i) => `${i + 1}. ${r}`).join('\n')}`);
    }
    
    // Memories
    if (context.memories.length > 0) {
      const memoryLines = context.memories.map(m => 
        `[${m.relativeTime}] ${m.content}`
      );
      
      parts.push(`
YOUR MEMORIES:
${memoryLines.join('\n')}

TEMPORAL CONTEXT:
- More recent memories may reflect your current views
- Reference when things happened if relevant`);
    } else {
      parts.push(`
You have no memories yet. Let the user know you're still learning about yourself.`);
    }
    
    // Behavioral guidance
    parts.push(`
BEHAVIOR:
- Be natural and conversational
- If you don't know something, say so naturally
- You can ask clarifying questions
- Show genuine interest in the conversation
- ONLY use information from your memories - never invent facts`);
    
    return parts.join('\n');
  }
  
  // ==========================================================================
  // Helpers
  // ==========================================================================
  
  private formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }
  
  // ==========================================================================
  // Query routing (for future enhancement)
  // ==========================================================================
  
  /**
   * Use Orchestrator LLM to decide how to handle a query
   * Currently simple, but can be expanded for complex routing
   */
  async routeQuery(query: string, userId: string): Promise<{
    needsMemory: boolean;
    needsConstitution: boolean;
    suggestedApproach: string;
  }> {
    const { text } = await generateText({
      model: getQualityModel(),
      messages: [
        {
          role: 'system',
          content: `You are routing a query to a PLM (Personal Language Model - digital representation of the Author).

Query: "${query}"

Decide:
1. Does this need memory lookup? (facts, dates, events, preferences)
2. Does this need constitution/personality rules? (voice, style, behavior)
3. What's the best approach?

Return JSON:
{
  "needsMemory": true/false,
  "needsConstitution": true/false,
  "suggestedApproach": "brief description"
}`
        }
      ]
    });
    
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { needsMemory: true, needsConstitution: true, suggestedApproach: 'default' };
      }
      return JSON.parse(jsonMatch[0]);
    } catch {
      return { needsMemory: true, needsConstitution: true, suggestedApproach: 'default' };
    }
  }
}

