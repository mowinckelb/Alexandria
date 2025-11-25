import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

const groq = createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: process.env.GROQ_API_KEY });

export class GroqExtractor {
  async structure(text: string) {
    const { object } = await generateObject({
      model: groq('llama-3.3-70b-versatile'), 
      schema: z.object({
        facts: z.array(z.string()).describe("Atomic facts (e.g. 'User met Elon')."),
        entities: z.array(z.string()).describe("People, Companies, Places."),
        importance: z.number().min(0).max(1)
      }),
      prompt: `Extract Objective Memory & Graph Nodes from: "${text.substring(0, 8000)}"`
    });
    return object;
  }
}