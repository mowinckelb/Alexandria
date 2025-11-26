import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export class GroqRefiner {
  async extractStyle(rawText: string): Promise<string> {
    const chunks = rawText.match(/[\s\S]{1,20000}/g) || [];
    let jsonl = "";

    for (const chunk of chunks) {
      const { text } = await generateText({
        // Use llama-3.1-8b-instant for speed (refiner prioritizes speed)
        model: groq('llama-3.1-8b-instant'), 
        messages: [
          {
            role: 'system',
            content: `You are a training data generator for fine-tuning language models. 
Your task is to extract the writing style and voice from text and create training examples.`
          },
          {
            role: 'user',
            content: `Create fine-tuning data from this text. Generate 5-10 JSONL training examples.

INPUT TEXT:
"""${chunk}"""

INSTRUCTIONS:
1. Analyze the author's sentence length, vocabulary, and tone
2. Create user/assistant pairs where the assistant response uses VERBATIM text segments
3. Output ONLY valid JSONL lines, one per line

Each line must be:
{"messages": [{"role": "system", "content": "You are a digital ghost."}, {"role": "user", "content": "<plausible prompt>"}, {"role": "assistant", "content": "<verbatim text segment>"}]}

Output JSONL only, no explanations:`
          }
        ]
      });
      jsonl += text.replace(/```jsonl|```json|```/g, '').trim() + "\n";
    }
    return jsonl;
  }
}