import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export interface TrainingPair {
  system_prompt: string;
  user_content: string;
  assistant_content: string;
  quality_score: number;
}

export class GroqRefiner {
  async extractStyle(rawText: string): Promise<TrainingPair[]> {
    const chunks = rawText.match(/[\s\S]{1,20000}/g) || [];
    const allPairs: TrainingPair[] = [];

    for (const chunk of chunks) {
      const { text } = await generateText({
        model: groq('llama-3.1-8b-instant'), 
        messages: [
          {
            role: 'system',
            content: `You are a training data generator for fine-tuning language models to capture writing style.`
          },
          {
            role: 'user',
            content: `Create fine-tuning data from this text. Generate 5-10 JSONL training examples.

INPUT TEXT:
"""${chunk}"""

INSTRUCTIONS:
1. Analyze the author's unique voice: sentence rhythm, vocabulary choices, punctuation style
2. Create DIVERSE prompts: opinions, stories, descriptions, reactions, explanations
3. Assistant responses must be VERBATIM segments (20-200 words) preserving original style
4. Output ONLY valid JSONL lines, one per line

Format:
{"messages": [{"role": "system", "content": "You are a digital ghost."}, {"role": "user", "content": "<prompt>"}, {"role": "assistant", "content": "<verbatim text>"}]}

JSONL only:`
          }
        ]
      });

      const lines = text.replace(/```jsonl|```json|```/g, '').trim().split('\n');
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.trim());
          if (parsed.messages?.length >= 3) {
            const content = parsed.messages[2]?.content || '';
            const prompt = parsed.messages[1]?.content || '';
            if (content.length > 10 && prompt.length > 5) {
              allPairs.push({
                system_prompt: parsed.messages[0]?.content || 'You are a digital ghost.',
                user_content: prompt,
                assistant_content: content,
                quality_score: this.scoreQuality(content, prompt)
              });
            }
          }
        } catch {
          // Skip malformed
        }
      }
    }

    return allPairs;
  }

  /**
   * Quality scoring for training pair filtering
   * Higher = better for capturing authentic voice
   * Algorithm is swappable; schema stays stable
   */
  private scoreQuality(response: string, prompt: string): number {
    let score = 0.5;
    
    const words = response.split(/\s+/);
    const wordCount = words.length;
    
    // Length scoring (20-150 words is sweet spot for style capture)
    if (wordCount >= 20 && wordCount <= 150) score += 0.15;
    else if (wordCount >= 10 && wordCount <= 200) score += 0.05;
    else if (wordCount < 10 || wordCount > 300) score -= 0.2;
    
    // Vocabulary diversity (unique words / total words)
    const uniqueRatio = new Set(words.map(w => w.toLowerCase())).size / wordCount;
    if (uniqueRatio > 0.7) score += 0.1;
    else if (uniqueRatio < 0.4) score -= 0.1;
    
    // Natural punctuation (indicates real writing vs generic)
    if (/[!?;:"']/.test(response)) score += 0.05;
    if (/\.{3}|—|–/.test(response)) score += 0.05; // Ellipsis, em-dash = stylistic
    
    // Prompt quality (specific > generic)
    if (prompt.length > 30) score += 0.05;
    if (/^(what|how|why|tell|describe|explain)/i.test(prompt)) score += 0.05;
    
    // Penalize obvious LLM artifacts
    if (/^(I |Here |This |The |In )/i.test(response)) score -= 0.05;
    if (/\b(certainly|definitely|absolutely|basically)\b/i.test(response)) score -= 0.1;
    
    return Math.max(0.1, Math.min(1.0, score));
  }
}
