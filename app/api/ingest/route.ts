import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getIngestionTools } from '@/lib/factory';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const { refiner, extractor, indexer, tuner } = getIngestionTools();

export async function POST(req: Request) {
  const { text, userId } = await req.json();

  // 1. Save Raw
  await supabase.from('entries').insert({ user_id: userId, content: text });
  
  // 2. Check State
  const { data: twin } = await supabase.from('twins').select('model_id').eq('user_id', userId).single();

  // 3. Process
  (async () => {
    // Objective Path
    const structure = await extractor.structure(text);
    for (const fact of structure.facts) {
      await indexer.ingest(fact, userId, { entities: structure.entities, importance: structure.importance });
    }

    // Subjective Path
    const jsonl = await refiner.extractStyle(text);
    const fileId = await tuner.upload(jsonl);
    const jobId = await tuner.train(fileId, userId, twin?.model_id);
    
    await supabase.from('twins').upsert({ 
      user_id: userId, 
      training_job_id: jobId, 
      status: 'training' 
    });
  })();

  return NextResponse.json({ success: true });
}
