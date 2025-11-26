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
    console.log(`[Indexer] Ingesting fact for userId: ${userId}`);
    console.log(`[Indexer] Fact: "${fact}"`);
    
    // BAAI/bge-base-en-v1.5 produces 768-dimensional vectors (matches DB schema)
    const response = await this.together.embeddings.create({
      model: "BAAI/bge-base-en-v1.5",
      input: fact
    });
    console.log(`[Indexer] Generated embedding with ${response.data[0].embedding.length} dimensions`);
    
    const { data, error } = await this.supabase.from('memory_fragments').insert({
      user_id: userId,
      content: fact,
      embedding: response.data[0].embedding,
      entities: metadata.entities || [],
      importance: metadata.importance || 0.5
    }).select();
    
    if (error) {
      console.error(`[Indexer] Insert error:`, error);
      throw error;
    }
    console.log(`[Indexer] Inserted memory:`, data);
  }

  async recall(query: string, userId: string): Promise<string[]> {
    console.log(`[Indexer] Recall for userId: ${userId}, query: "${query}"`);
    
    // First, check if any memories exist for this user
    const { data: allMemories, error: checkError } = await this.supabase
      .from('memory_fragments')
      .select('content, user_id')
      .eq('user_id', userId)
      .limit(10);
    
    console.log(`[Indexer] Found ${allMemories?.length || 0} total memories for user, error: ${checkError?.message || 'none'}`);
    if (allMemories && allMemories.length > 0) {
      console.log('[Indexer] Sample memories:', allMemories.slice(0, 3));
    }
    
    // If no memories exist, return early
    if (!allMemories || allMemories.length === 0) {
      return [];
    }
    
    // Generate embedding for query
    const response = await this.together.embeddings.create({
      model: "BAAI/bge-base-en-v1.5",
      input: query
    });
    console.log(`[Indexer] Generated embedding with ${response.data[0].embedding.length} dimensions`);

    // Try the RPC function
    const { data, error } = await this.supabase.rpc('match_memory', {
      query_embedding: response.data[0].embedding,
      match_threshold: 0.5, // Lowered threshold for testing
      match_count: 5,
      p_user_id: userId
    });
    
    console.log(`[Indexer] RPC match_memory result: ${data?.length || 0} matches, error: ${error?.message || 'none'}`);
    
    return data ? data.map((m: MemoryFragment) => m.content) : [];
  }
}