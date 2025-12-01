import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// GET user's jobs
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const jobId = searchParams.get('jobId');

  if (!userId && !jobId) {
    return NextResponse.json({ error: 'userId or jobId required' }, { status: 400 });
  }

  // Get specific job
  if (jobId) {
    const { data, error } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(data);
  }

  // Get user's recent jobs
  const { data, error } = await supabase.rpc('get_user_jobs', {
    p_user_id: userId,
    p_limit: 20
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

// POST to create a new job (for queued processing)
export async function POST(req: Request) {
  try {
    const { userId, storagePath, fileName, fileType, fileSize, context } = await req.json();

    if (!userId || !storagePath || !fileName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('processing_jobs')
      .insert({
        user_id: userId,
        storage_path: storagePath,
        file_name: fileName,
        file_type: fileType || 'application/octet-stream',
        file_size: fileSize || 0,
        context: context || null
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ jobId: data.id, status: 'pending' });

  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
