import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { z } from 'zod';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

// Enhanced schema - captures objective facts AND objective truths about subjective states
const extractionSchema = z.object({
  facts: z.array(z.string()),           // Objective facts: dates, events, relationships
  preferences: z.array(z.object({       // Explicit preferences: "I love X", "I hate Y"
    statement: z.string(),
    valence: z.enum(['positive', 'negative', 'neutral']),
    strength: z.enum(['strong', 'moderate', 'weak'])
  })).optional().default([]),
  opinions: z.array(z.object({          // Explicit opinions: "I think X", "I believe Y"
    statement: z.string(),
    domain: z.string().optional()       // politics, technology, relationships, etc.
  })).optional().default([]),
  values: z.array(z.string()).optional().default([]),  // What Author cares about
  entities: z.array(z.string()),
  importance: z.number().min(0).max(1)
});

export type ExtractionResult = z.infer<typeof extractionSchema>;

export class GroqExtractor {
  async structure(text: string): Promise<ExtractionResult> {
    // Use generateText and parse JSON manually since Groq doesn't support json_schema
    const { text: response } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      messages: [
        {
          role: 'system',
          content: `You extract information to build a high-fidelity digital twin (Ghost).

Extract TWO types of objective truths:
1. OBJECTIVE FACTS - dates, events, relationships, biographical data
2. OBJECTIVE TRUTHS ABOUT SUBJECTIVE STATES - preferences, opinions, values, feelings

"Author loves jazz" is an OBJECTIVE TRUTH about a SUBJECTIVE PREFERENCE. It belongs in Memory.

Return ONLY valid JSON:
{
  "facts": ["atomic fact 1", "atomic fact 2"],
  "preferences": [
    {"statement": "loves jazz", "valence": "positive", "strength": "strong"},
    {"statement": "dislikes seafood", "valence": "negative", "strength": "moderate"}
  ],
  "opinions": [
    {"statement": "believes remote work is better", "domain": "work"},
    {"statement": "thinks social media is harmful", "domain": "technology"}
  ],
  "values": ["family", "intellectual honesty", "creativity"],
  "entities": ["person/company/place"],
  "importance": 0.5
}

Rules:
- facts: Objective biographical/event facts
- preferences: Likes, dislikes, favorites (with valence and strength)
- opinions: Beliefs, stances, worldviews (with optional domain)
- values: What the Author cares about deeply
- entities: People, companies, places mentioned
- importance: 0-1 (0=trivial, 1=critical)
- Return ONLY the JSON object`
        },
        {
          role: 'user',
          content: text.substring(0, 8000)
        }
      ]
    });
    
    // Parse and validate the response
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in response:', response);
        return { facts: [], preferences: [], opinions: [], values: [], entities: [], importance: 0.5 };
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      return extractionSchema.parse(parsed);
    } catch (e) {
      console.error('Failed to parse extraction response:', e, response);
      return { facts: [], preferences: [], opinions: [], values: [], entities: [], importance: 0.5 };
    }
  }

  /**
   * Convert extraction result to storable Memory items
   * Each preference/opinion becomes a fact-like statement for vector storage
   */
  toMemoryItems(result: ExtractionResult): string[] {
    const items: string[] = [...result.facts];
    
    // Convert preferences to storable statements
    for (const pref of result.preferences || []) {
      const strength = pref.strength === 'strong' ? 'strongly' : pref.strength === 'weak' ? 'slightly' : '';
      const verb = pref.valence === 'positive' ? 'likes' : pref.valence === 'negative' ? 'dislikes' : 'feels neutral about';
      items.push(`Author ${strength} ${verb} ${pref.statement}`.replace(/\s+/g, ' ').trim());
    }
    
    // Convert opinions to storable statements
    for (const opinion of result.opinions || []) {
      items.push(`Author believes: ${opinion.statement}`);
    }
    
    // Convert values to storable statements
    for (const value of result.values || []) {
      items.push(`Author values ${value}`);
    }
    
    return items;
  }
}