import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Model-agnostic personality profile structure
 * This is the "immortal soul" that transfers between base models
 */
export interface PersonalityProfile {
  style_analysis: {
    voice: {
      humor_style: string;        // "dry", "playful", "sardonic", "warm", etc.
      formality: number;          // 0 (casual) to 1 (formal)
      emoji_usage: string;        // "never", "rare", "moderate", "frequent"
      enthusiasm_level: number;   // 0 (measured) to 1 (exuberant)
    };
    sentence_structure: {
      avg_length: string;         // "short", "medium", "long"
      complexity: number;         // 0 (simple) to 1 (complex)
      paragraph_style: string;    // "dense", "broken", "flowing"
    };
    punctuation_patterns: {
      em_dash_usage: boolean;
      ellipsis_usage: boolean;
      exclamation_frequency: string;  // "never", "rare", "moderate", "frequent"
      oxford_comma: boolean;
    };
  };
  vocabulary_signature: {
    high_frequency: string[];     // Words they use often
    avoided: string[];            // Words they never use
    domain_affinity: Record<string, number>;  // e.g., { "technology": 0.8, "sports": 0.1 }
    formality_markers: string[];  // Characteristic formal/informal words
  };
  constitutional_rules: string[];   // Natural language rules defining the personality
  topic_dispositions: Record<string, string>;  // e.g., { "politics": "avoidant", "philosophy": "engaged" }
  confidence_score: number;
  source_pair_count: number;
}

export interface TrainingPair {
  user_content: string;
  assistant_content: string;
  quality_score?: number;
}

export class PersonalityExtractor {
  /**
   * Extract a model-agnostic personality profile from training data
   * This is the core "Carbon to Behavioral Signature" transformation
   */
  async extractProfile(
    trainingPairs: TrainingPair[],
    feedbackData?: { positive: string[]; negative: string[] }
  ): Promise<PersonalityProfile> {
    // Sample training pairs (use high-quality ones for analysis)
    const sortedPairs = [...trainingPairs].sort((a, b) => 
      (b.quality_score || 0.5) - (a.quality_score || 0.5)
    );
    
    // Take top 50 for deep analysis, sample rest for breadth
    const deepAnalysisSample = sortedPairs.slice(0, 50);
    const breadthSample = this.stratifiedSample(sortedPairs.slice(50), 50);
    const analysisSample = [...deepAnalysisSample, ...breadthSample];
    
    // Concatenate responses for analysis
    const responseCorpus = analysisSample
      .map(p => p.assistant_content)
      .join('\n\n---\n\n');
    
    // Include negative examples if available (what they DON'T sound like)
    const contrastCorpus = feedbackData?.negative?.slice(0, 10).join('\n\n---\n\n') || '';
    
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      messages: [
        {
          role: 'system',
          content: `You are an expert linguistic analyst specializing in author voice fingerprinting.
Your task is to extract a transferable personality signature from writing samples.
This signature will be used to recreate the author's voice in different AI models.
Be precise and specific - avoid generic descriptions. Look for DISTINCTIVE patterns.`
        },
        {
          role: 'user',
          content: `Analyze these writing samples and extract a detailed personality profile.

WRITING SAMPLES (${analysisSample.length} examples):
"""
${responseCorpus.slice(0, 25000)}
"""

${contrastCorpus ? `REJECTED/DISLIKED RESPONSES (for contrast):
"""
${contrastCorpus.slice(0, 5000)}
"""` : ''}

OUTPUT INSTRUCTIONS:
Return a JSON object with this EXACT structure (no markdown, just JSON):
{
  "style_analysis": {
    "voice": {
      "humor_style": "<specific type: dry/playful/sardonic/warm/absent/self-deprecating>",
      "formality": <0.0-1.0>,
      "emoji_usage": "<never/rare/moderate/frequent>",
      "enthusiasm_level": <0.0-1.0>
    },
    "sentence_structure": {
      "avg_length": "<short/medium/long>",
      "complexity": <0.0-1.0>,
      "paragraph_style": "<dense/broken/flowing>"
    },
    "punctuation_patterns": {
      "em_dash_usage": <true/false>,
      "ellipsis_usage": <true/false>,
      "exclamation_frequency": "<never/rare/moderate/frequent>",
      "oxford_comma": <true/false>
    }
  },
  "vocabulary_signature": {
    "high_frequency": ["<5-15 characteristic words/phrases they use often>"],
    "avoided": ["<words they seem to avoid - especially common words they never use>"],
    "domain_affinity": {"<domain>": <0.0-1.0>},
    "formality_markers": ["<characteristic formal or informal markers>"]
  },
  "constitutional_rules": [
    "<5-15 specific behavioral rules that define this voice>",
    "Example: 'Never uses exclamation marks except in genuine surprise'",
    "Example: 'Prefers analogies from everyday objects over technical terms'",
    "Example: 'Acknowledges uncertainty with phrases like \"I think\" or \"it seems\"'"
  ],
  "topic_dispositions": {
    "<topic>": "<avoidant/neutral/engaged/enthusiastic>"
  }
}

Be SPECIFIC. Avoid generic descriptions like "conversational" - instead say what MAKES it conversational.
Look for UNIQUE patterns that distinguish this voice from generic AI output.`
        }
      ]
    });

    try {
      // Parse the JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Calculate confidence based on data quantity
      const confidence = this.calculateConfidence(trainingPairs.length, feedbackData);
      
      return {
        ...parsed,
        confidence_score: confidence,
        source_pair_count: trainingPairs.length
      };
    } catch (error) {
      console.error('Failed to parse personality profile:', error);
      // Return a minimal profile on failure
      return this.createMinimalProfile(trainingPairs.length);
    }
  }

  /**
   * Generate constitutional rules from a profile (for use in system prompts)
   * These rules can condition ANY model to match the personality
   */
  generateConstitutionalPrompt(profile: PersonalityProfile): string {
    const rules = profile.constitutional_rules;
    const style = profile.style_analysis;
    const vocab = profile.vocabulary_signature;
    
    let prompt = `PERSONALITY CONSTITUTION:
You must embody the following voice characteristics:

STYLE:
- Humor: ${style.voice.humor_style}
- Formality: ${style.voice.formality < 0.3 ? 'casual' : style.voice.formality > 0.7 ? 'formal' : 'moderate'}
- Enthusiasm: ${style.voice.enthusiasm_level < 0.3 ? 'measured and calm' : style.voice.enthusiasm_level > 0.7 ? 'energetic and expressive' : 'balanced'}
- Sentences: ${style.sentence_structure.avg_length} length, ${style.sentence_structure.complexity > 0.6 ? 'complex' : 'straightforward'} structure

VOICE RULES:
${rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

VOCABULARY:
- Use these characteristic phrases when natural: ${vocab.high_frequency.slice(0, 5).join(', ')}
- AVOID these words: ${vocab.avoided.slice(0, 5).join(', ')}
${style.punctuation_patterns.em_dash_usage ? '- Use em-dashes (—) for emphasis and asides' : ''}
${style.punctuation_patterns.exclamation_frequency === 'never' ? '- Never use exclamation marks' : ''}`;

    return prompt;
  }

  /**
   * Stratified sampling to ensure diversity across quality scores
   */
  private stratifiedSample(pairs: TrainingPair[], count: number): TrainingPair[] {
    if (pairs.length <= count) return pairs;
    
    const step = Math.floor(pairs.length / count);
    const sampled: TrainingPair[] = [];
    
    for (let i = 0; i < pairs.length && sampled.length < count; i += step) {
      sampled.push(pairs[i]);
    }
    
    return sampled;
  }

  /**
   * Calculate profile confidence based on data quantity
   */
  private calculateConfidence(
    pairCount: number,
    feedbackData?: { positive: string[]; negative: string[] }
  ): number {
    let confidence = 0.3; // Base confidence
    
    // More training pairs = higher confidence
    if (pairCount >= 500) confidence += 0.3;
    else if (pairCount >= 200) confidence += 0.2;
    else if (pairCount >= 50) confidence += 0.1;
    
    // Feedback data adds confidence
    if (feedbackData) {
      const totalFeedback = (feedbackData.positive?.length || 0) + (feedbackData.negative?.length || 0);
      if (totalFeedback >= 50) confidence += 0.2;
      else if (totalFeedback >= 20) confidence += 0.1;
      
      // Negative examples are especially valuable for defining boundaries
      if (feedbackData.negative && feedbackData.negative.length >= 10) {
        confidence += 0.1;
      }
    }
    
    return Math.min(0.95, confidence);
  }

  /**
   * Create a minimal profile when extraction fails
   */
  private createMinimalProfile(pairCount: number): PersonalityProfile {
    return {
      style_analysis: {
        voice: {
          humor_style: 'neutral',
          formality: 0.5,
          emoji_usage: 'never',
          enthusiasm_level: 0.5
        },
        sentence_structure: {
          avg_length: 'medium',
          complexity: 0.5,
          paragraph_style: 'flowing'
        },
        punctuation_patterns: {
          em_dash_usage: false,
          ellipsis_usage: false,
          exclamation_frequency: 'rare',
          oxford_comma: true
        }
      },
      vocabulary_signature: {
        high_frequency: [],
        avoided: [],
        domain_affinity: {},
        formality_markers: []
      },
      constitutional_rules: [
        'Respond naturally and authentically',
        'Match the conversational tone of the query'
      ],
      topic_dispositions: {},
      confidence_score: 0.2,
      source_pair_count: pairCount
    };
  }
}

