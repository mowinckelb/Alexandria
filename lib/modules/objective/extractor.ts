import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { z } from 'zod';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

// Schema for validation
const extractionSchema = z.object({
  facts: z.array(z.string()),
  entities: z.array(z.string()),
  importance: z.number().min(0).max(1)
});

type ExtractionResult = z.infer<typeof extractionSchema>;

export class GroqExtractor {
  async structure(text: string): Promise<ExtractionResult> {
    // Use generateText and parse JSON manually since Groq doesn't support json_schema
    const { text: response } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      messages: [
        {
          role: 'system',
          content: `You are a fact extraction assistant. Extract information from text and return ONLY valid JSON.
          
Return format:
{
  "facts": ["atomic fact 1", "atomic fact 2"],
  "entities": ["person/company/place"],
  "importance": 0.5
}

Rules:
- facts: Array of specific, atomic facts from the text
- entities: Array of people, companies, and places mentioned  
- importance: Number 0-1 (0=trivial, 1=critical life event)
- Return ONLY the JSON object, no other text`
        },
        {
          role: 'user',
          content: text.substring(0, 8000)
        }
      ]
    });
    
    // Parse and validate the response
    try {
      // Extract JSON from response (in case model adds extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in response:', response);
        return { facts: [], entities: [], importance: 0.5 };
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      return extractionSchema.parse(parsed);
    } catch (e) {
      console.error('Failed to parse extraction response:', e, response);
      return { facts: [], entities: [], importance: 0.5 };
    }
  }
}