import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const QuerySchema = z.object({
  userId: z.string().uuid(),
  seed: z.string().min(1),
  depth: z.coerce.number().int().min(1).max(4).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional()
});

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  return createClient(url, key);
}

interface Edge {
  source_entity: string;
  target_entity: string;
  relation_type: string;
  confidence: number;
}

export async function GET(request: NextRequest) {
  try {
    const parsed = QuerySchema.safeParse({
      userId: request.nextUrl.searchParams.get('userId'),
      seed: request.nextUrl.searchParams.get('seed'),
      depth: request.nextUrl.searchParams.get('depth') || 2,
      limit: request.nextUrl.searchParams.get('limit') || 200
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.issues }, { status: 400 });
    }

    const { userId, seed, depth, limit } = parsed.data;
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('memory_relationships')
      .select('source_entity, target_entity, relation_type, confidence')
      .eq('user_id', userId)
      .limit(limit || 200);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const edges = (data || []) as Edge[];
    const normalizedSeed = seed.trim().toLowerCase();

    const adjacency = new Map<string, Array<{ neighbor: string; edge: Edge }>>();
    for (const edge of edges) {
      const s = edge.source_entity.toLowerCase();
      const t = edge.target_entity.toLowerCase();
      if (!adjacency.has(s)) adjacency.set(s, []);
      if (!adjacency.has(t)) adjacency.set(t, []);
      adjacency.get(s)!.push({ neighbor: t, edge });
      adjacency.get(t)!.push({ neighbor: s, edge });
    }

    const visited = new Set<string>([normalizedSeed]);
    const queue: Array<{ node: string; depth: number }> = [{ node: normalizedSeed, depth: 0 }];
    const nodes = new Set<string>([normalizedSeed]);
    const traversedEdges: Edge[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth >= (depth || 2)) continue;
      const neighbors = adjacency.get(current.node) || [];

      for (const { neighbor, edge } of neighbors) {
        traversedEdges.push(edge);
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          nodes.add(neighbor);
          queue.push({ node: neighbor, depth: current.depth + 1 });
        }
      }
    }

    const uniqueEdges = new Map<string, Edge>();
    for (const edge of traversedEdges) {
      const key = [edge.source_entity.toLowerCase(), edge.target_entity.toLowerCase()].sort().join('::') + `::${edge.relation_type}`;
      if (!uniqueEdges.has(key)) uniqueEdges.set(key, edge);
    }

    return NextResponse.json({
      seed,
      depth: depth || 2,
      nodeCount: nodes.size,
      edgeCount: uniqueEdges.size,
      nodes: [...nodes],
      edges: [...uniqueEdges.values()]
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
