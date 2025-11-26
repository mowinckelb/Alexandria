import { createClient } from '@supabase/supabase-js';
import Together from 'together-ai';

interface MemoryMetadata {
  entities?: string[];
  importance?: number;
  [key: string]: unknown;
}

interface MemoryMatch {
  content: string;
  similarity?: number;
}

export class SupabaseIndexer {
  private supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  private together = new Together({ apiKey: process.env.TOGETHER_API_KEY });

  async ingest(fact: string, userId: string, metadata: MemoryMetadata = {}) {
    console.log(`[Indexer] Ingesting fact for userId: ${userId}`);
    console.log(`[Indexer] Fact: "${fact}"`);
    
    const response = await this.together.embeddings.create({
      model: "BAAI/bge-base-en-v1.5",
      input: fact
    });
    
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
    
    // Get all memories for this user (for small datasets, just return all)
    const { data: allMemories } = await this.supabase
      .from('memory_fragments')
      .select('content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (!allMemories || allMemories.length === 0) {
      console.log('[Indexer] No memories found');
      return [];
    }

    // For small datasets (< 20 memories), just return all of them
    // This ensures the ghost has full context for broad questions
    if (allMemories.length <= 20) {
      console.log(`[Indexer] Small dataset (${allMemories.length}), returning all memories`);
      return allMemories.map(m => m.content);
    }

    // For larger datasets, use semantic search with low threshold + recent memories
    const response = await this.together.embeddings.create({
      model: "BAAI/bge-base-en-v1.5",
      input: query
    });

    // Semantic search with low threshold to catch more matches
    const { data: semanticMatches } = await this.supabase.rpc('match_memory', {
      query_embedding: response.data[0].embedding,
      match_threshold: 0.3, // Low threshold for broader matching
      match_count: 15,
      p_user_id: userId
    });
    
    // Get recent memories as fallback (last 10)
    const recentMemories = allMemories.slice(0, 10).map(m => m.content);
    
    // Combine semantic matches with recent memories, deduplicate
    const semanticContents = (semanticMatches || []).map((m: MemoryMatch) => m.content);
    const combined = [...new Set([...semanticContents, ...recentMemories])];
    
    console.log(`[Indexer] Returning ${combined.length} memories (${semanticContents.length} semantic + recent)`);
    return combined;
  }
}
