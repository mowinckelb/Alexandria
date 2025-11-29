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

interface EnhancedMemoryMatch {
  id: string;
  content: string;
  similarity: number;
  importance: number;
  created_at: string;
  combined_score?: number;
}

function calculateRecencyFactor(createdAt: string): number {
  const ageInDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  // Decay factor: 1.0 for today, ~0.5 for 30 days ago, ~0.25 for 90 days ago
  // Using exponential decay: e^(-age/halfLife) where halfLife = 30 days
  return Math.exp(-ageInDays / 30);
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
    
    // Get all memories with importance and timestamps for weighted ranking
    const { data: allMemories } = await this.supabase
      .from('memory_fragments')
      .select('id, content, importance, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (!allMemories || allMemories.length === 0) {
      console.log('[Indexer] No memories found');
      return [];
    }

    // For small datasets (< 20), return all sorted by importance * recency
    if (allMemories.length <= 20) {
      console.log(`[Indexer] Small dataset (${allMemories.length}), applying recency/importance weighting`);
      const weighted = allMemories.map(m => ({
        ...m,
        combined_score: (m.importance || 0.5) * calculateRecencyFactor(m.created_at)
      }));
      weighted.sort((a, b) => b.combined_score - a.combined_score);
      return weighted.map(m => m.content);
    }

    // For larger datasets, use enhanced semantic search with weighted ranking
    const response = await this.together.embeddings.create({
      model: "BAAI/bge-base-en-v1.5",
      input: query
    });

    // Try enhanced function, fall back to basic if not available
    const { data: enhancedMatches, error: enhancedError } = await this.supabase.rpc('match_memory_enhanced', {
      query_embedding: response.data[0].embedding,
      match_threshold: 0.3,
      match_count: 25,
      p_user_id: userId
    });

    if (enhancedError) {
      console.log('[Indexer] Enhanced function not available, using basic recall');
      const { data: basicMatches } = await this.supabase.rpc('match_memory', {
        query_embedding: response.data[0].embedding,
        match_threshold: 0.3,
        match_count: 15,
        p_user_id: userId
      });
      const recentMemories = allMemories.slice(0, 10).map(m => m.content);
      const semanticContents = (basicMatches || []).map((m: MemoryMatch) => m.content);
      return [...new Set([...semanticContents, ...recentMemories])];
    }

    // Calculate combined scores: similarity * importance * recency
    const scoredMatches = (enhancedMatches || []).map((m: EnhancedMemoryMatch) => ({
      ...m,
      combined_score: (m.similarity || 0) * (m.importance || 0.5) * calculateRecencyFactor(m.created_at)
    }));

    scoredMatches.sort((a: EnhancedMemoryMatch, b: EnhancedMemoryMatch) => 
      (b.combined_score || 0) - (a.combined_score || 0)
    );

    const topMatches = scoredMatches.slice(0, 15);
    console.log(`[Indexer] Returning ${topMatches.length} memories with weighted ranking`);
    
    return topMatches.map((m: EnhancedMemoryMatch) => m.content);
  }
}
