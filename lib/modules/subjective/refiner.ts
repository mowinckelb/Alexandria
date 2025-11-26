import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

const groq = createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: process.env.GROQ_API_KEY });

export class GroqRefiner {
  async extractStyle(rawText: string): Promise<string> {
    const chunks = rawText.match(/[\s\S]{1,20000}/g) || [];
    let jsonl = "";

    for (const chunk of chunks) {
      const { text } = await generateText({
        model: groq('compound-mini'), 
        prompt: `
          TASK: Create Fine-Tuning Data for a Digital Twin.
          GOAL: Extract the "Soul" of the author.
          
          INPUT: """${chunk}"""
          
          INSTRUCTIONS:
          1. Analyze sentence length, vocabulary, and tone.
          2. Generate 5-10 JSONL pairs.
             - "user": A plausible prompt.
             - "assistant": A VERBATIM segment of the text.
          
          OUTPUT: JSONL ONLY.
          {"messages": [{"role": "system", "content": "You are a digital ghost."}, {"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}
        `
      });
      jsonl += text.replace(/```jsonl|```/g, '').trim() + "\n";
    }
    return jsonl;
  }
}