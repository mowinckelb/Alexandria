import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId, fileName, fileType } = await req.json();

    if (!userId || !fileName) {
      return NextResponse.json({ error: 'userId and fileName required' }, { status: 400 });
    }

    const storagePath = `${userId}/${uuidv4()}_${fileName}`;

    const { data, error } = await supabase.storage
      .from('carbon-uploads')
      .createSignedUploadUrl(storagePath);

    if (error) {
      console.error('[GetUploadUrl] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      storagePath,
      token: data.token
    });

  } catch (error) {
    console.error('[GetUploadUrl] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
