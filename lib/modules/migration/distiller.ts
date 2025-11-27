import { createTogetherAI } from '@ai-sdk/togetherai';
import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { PersonalityProfile } from './personality-extractor';

const togetherai = createTogetherAI({ apiKey: process.env.TOGETHER_API_KEY });
const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

/**
 * A distillation pair: prompt + response from the source model
 */
export interface DistillationPair {
  prompt: string;
  response: string;
  prompt_category: string;
  quality_score: number;
  style_consistency_score?: number;
}

/**
 * Prompt from the corpus
 */
export interface CorpusPrompt {
  prompt: string;
  category: string;
  subcategory?: string;
  difficulty?: string;
}

/**
 * The Distiller captures an old model's personality by generating responses
 * that can then train a new model. This is the "Teacher → Student" transfer.
 */
export class Distiller {
  /**
   * Generate distillation pairs by running prompts through the source model
   * This is the core knowledge transfer mechanism
   */
  async distill(
    sourceModelId: string,
    prompts: CorpusPrompt[],
    personalityProfile?: PersonalityProfile,
    onProgress?: (completed: number, total: number) => void
  ): Promise<DistillationPair[]> {
    const pairs: DistillationPair[] = [];
    const batchSize = 5; // Process in batches to avoid rate limits
    
    for (let i = 0; i < prompts.length; i += batchSize) {
      const batch = prompts.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(p => this.generateResponse(sourceModelId, p))
      );
      
      pairs.push(...batchResults.filter((r): r is DistillationPair => r !== null));
      
      if (onProgress) {
        onProgress(Math.min(i + batchSize, prompts.length), prompts.length);
      }
    }
    
    // Score style consistency if we have a personality profile
    if (personalityProfile) {
      return this.scoreStyleConsistency(pairs, personalityProfile);
    }
    
    return pairs;
  }

  /**
   * Generate a single response from the source model
   */
  private async generateResponse(
    modelId: string,
    prompt: CorpusPrompt
  ): Promise<DistillationPair | null> {
    try {
      const { text } = await generateText({
        model: togetherai(modelId),
        messages: [
          {
            role: 'system',
            content: 'You are a digital ghost. Respond authentically in your unique voice.'
          },
          {
            role: 'user',
            content: prompt.prompt
          }
        ],
        maxTokens: 500, // Keep responses focused
        temperature: 0.8 // Allow some personality variance
      });

      if (!text || text.length < 20) {
        return null;
      }

      return {
        prompt: prompt.prompt,
        response: text,
        prompt_category: prompt.category,
        quality_score: this.scoreQuality(text, prompt.prompt)
      };
    } catch (error) {
      console.error(`Failed to generate response for prompt: ${prompt.prompt.slice(0, 50)}...`, error);
      return null;
    }
  }

  /**
   * Generate diverse prompts for comprehensive personality capture
   * Uses LLM to create prompts that will elicit characteristic responses
   */
  async generateDiversePrompts(
    personalityProfile: PersonalityProfile,
    basePrompts: CorpusPrompt[],
    targetCount: number
  ): Promise<CorpusPrompt[]> {
    const existingPrompts = [...basePrompts];
    const neededCount = targetCount - existingPrompts.length;
    
    if (neededCount <= 0) {
      return existingPrompts.slice(0, targetCount);
    }

    // Generate prompts that target the personality's unique characteristics
    const categories = [
      'emotional',
      'philosophical',
      'creative',
      'factual',
      'personal',
      'edge_case',
      'social',
      'humor'
    ];
    
    const promptsPerCategory = Math.ceil(neededCount / categories.length);
    
    for (const category of categories) {
      const generated = await this.generateCategoryPrompts(
        category,
        personalityProfile,
        promptsPerCategory
      );
      existingPrompts.push(...generated);
      
      if (existingPrompts.length >= targetCount) break;
    }

    return existingPrompts.slice(0, targetCount);
  }

  /**
   * Generate prompts for a specific category
   */
  private async generateCategoryPrompts(
    category: string,
    profile: PersonalityProfile,
    count: number
  ): Promise<CorpusPrompt[]> {
    const dispositions = Object.entries(profile.topic_dispositions)
      .map(([topic, stance]) => `${topic}: ${stance}`)
      .join(', ');
    
    const { text } = await generateText({
      model: groq('llama-3.1-8b-instant'),
      messages: [
        {
          role: 'system',
          content: 'You generate diverse prompts for personality distillation.'
        },
        {
          role: 'user',
          content: `Generate ${count} unique prompts in the "${category}" category.
These prompts should elicit responses that reveal personality and voice.

PERSONALITY CONTEXT:
- Humor style: ${profile.style_analysis.voice.humor_style}
- Topic interests: ${dispositions || 'varied'}
- Characteristic phrases: ${profile.vocabulary_signature.high_frequency.slice(0, 3).join(', ')}

REQUIREMENTS:
- Each prompt should be a natural question or request
- Vary the complexity and angle
- Include some prompts that would trigger the personality's distinctive traits
- Format: One prompt per line, no numbering or bullets

Generate ${count} prompts:`
        }
      ]
    });

    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 10 && !line.match(/^\d+[\.\)]/));
    
    return lines.slice(0, count).map(prompt => ({
      prompt,
      category,
      difficulty: 'medium'
    }));
  }

  /**
   * Score response quality for distillation purposes
   */
  private scoreQuality(response: string, prompt: string): number {
    let score = 0.5;
    
    const words = response.split(/\s+/);
    const wordCount = words.length;
    
    // Length scoring
    if (wordCount >= 30 && wordCount <= 200) score += 0.15;
    else if (wordCount >= 15 && wordCount <= 300) score += 0.05;
    else if (wordCount < 15 || wordCount > 400) score -= 0.15;
    
    // Vocabulary diversity
    const uniqueRatio = new Set(words.map(w => w.toLowerCase())).size / wordCount;
    if (uniqueRatio > 0.65) score += 0.1;
    else if (uniqueRatio < 0.35) score -= 0.1;
    
    // Natural punctuation indicates authentic voice
    if (/[;:"']/.test(response)) score += 0.05;
    if (/\.{3}|—|–/.test(response)) score += 0.05;
    
    // Penalize generic LLM artifacts
    if (/^(Certainly|Of course|I'd be happy|Let me)/i.test(response)) score -= 0.15;
    if (/\b(certainly|definitely|absolutely|delve|tapestry)\b/i.test(response)) score -= 0.1;
    
    // Response relevance to prompt
    const promptKeywords = prompt.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const responseText = response.toLowerCase();
    const relevantWords = promptKeywords.filter(w => responseText.includes(w));
    if (relevantWords.length > 0) score += 0.05;
    
    return Math.max(0.1, Math.min(1.0, score));
  }

  /**
   * Score how well responses match the extracted personality profile
   */
  private async scoreStyleConsistency(
    pairs: DistillationPair[],
    profile: PersonalityProfile
  ): Promise<DistillationPair[]> {
    // Simple heuristic scoring based on profile characteristics
    return pairs.map(pair => {
      let styleScore = 0.5;
      const response = pair.response;
      
      // Check for characteristic vocabulary
      const highFreq = profile.vocabulary_signature.high_frequency;
      const avoided = profile.vocabulary_signature.avoided;
      
      for (const word of highFreq) {
        if (response.toLowerCase().includes(word.toLowerCase())) {
          styleScore += 0.05;
        }
      }
      
      for (const word of avoided) {
        if (response.toLowerCase().includes(word.toLowerCase())) {
          styleScore -= 0.1;
        }
      }
      
      // Check punctuation patterns
      const punct = profile.style_analysis.punctuation_patterns;
      if (punct.em_dash_usage && /—/.test(response)) styleScore += 0.05;
      if (punct.ellipsis_usage && /\.{3}/.test(response)) styleScore += 0.05;
      if (punct.exclamation_frequency === 'never' && /!/.test(response)) styleScore -= 0.1;
      
      // Check formality match
      const formality = profile.style_analysis.voice.formality;
      const informalMarkers = /\b(gonna|wanna|kinda|sorta|yeah|nope)\b/i;
      const formalMarkers = /\b(therefore|consequently|furthermore|moreover)\b/i;
      
      if (formality < 0.3 && informalMarkers.test(response)) styleScore += 0.05;
      if (formality > 0.7 && formalMarkers.test(response)) styleScore += 0.05;
      if (formality < 0.3 && formalMarkers.test(response)) styleScore -= 0.1;
      if (formality > 0.7 && informalMarkers.test(response)) styleScore -= 0.1;
      
      return {
        ...pair,
        style_consistency_score: Math.max(0.1, Math.min(1.0, styleScore))
      };
    });
  }

  /**
   * Filter distillation pairs by quality threshold
   */
  filterByQuality(
    pairs: DistillationPair[],
    qualityThreshold: number = 0.6,
    styleThreshold?: number
  ): DistillationPair[] {
    return pairs.filter(pair => {
      if (pair.quality_score < qualityThreshold) return false;
      if (styleThreshold && pair.style_consistency_score !== undefined) {
        return pair.style_consistency_score >= styleThreshold;
      }
      return true;
    });
  }
}

