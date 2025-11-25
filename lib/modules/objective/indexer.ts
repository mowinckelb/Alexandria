import { createClient } from '@supabase/supabase-js';
import Together from 'together-ai';

interface MemoryMetadata {
  entities?: string[];
  importance?: number;
  [key: string]: unknown;
}

interface MemoryFragment {
  content: string;
  embedding: number[];
  entities: string[];
  importance: number;
  user_id: string;
}

export class SupabaseIndexer {
  private supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  private together = new Together({ apiKey: process.env.TOGETHER_API_KEY });

  async ingest(fact: string, userId: string, metadata: MemoryMetadata = {}) {
    const response = await this.together.embeddings.create({
      model: "nomic-ai/nomic-embed-text-v1.5",
      input: fact
    });
    
    await this.supabase.from('memory_fragments').insert({
      user_id: userId,
      content: fact,
      embedding: response.data[0].embedding,
      entities: metadata.entities || [],
      importance: metadata.importance || 0.5
    });
  }

  async recall(query: string, userId: string): Promise<string[]> {
    const response = await this.together.embeddings.create({
      model: "nomic-ai/nomic-embed-text-v1.5",
      input: query
    });

    const { data } = await this.supabase.rpc('match_memory', {
      query_embedding: response.data[0].embedding,
      match_threshold: 0.65, 
      match_count: 5,
      p_user_id: userId
    });
    
    return data ? data.map((m: MemoryFragment) => m.content) : [];
  }
}