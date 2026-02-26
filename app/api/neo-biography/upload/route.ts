import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'carbon-uploads';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;
    const title = formData.get('title') as string | null;

    if (!file || !userId || !title) {
      return NextResponse.json({ error: 'file, userId, and title required' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storagePath = `${userId}/works/${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    // Try public URL first; fall back to long-lived signed URL if bucket is private
    let pdfUrl: string;
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    if (urlData?.publicUrl) {
      pdfUrl = urlData.publicUrl;
    } else {
      const { data: signedData } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365);
      pdfUrl = signedData?.signedUrl || '';
    }

    const { data: work, error: dbError } = await supabase.from('authored_works').insert({
      user_id: userId,
      title: title.trim(),
      content: `[PDF] ${title.trim()}`,
      medium: ext === 'pdf' ? 'pdf' : 'other',
      summary: title.trim(),
      frozen: true,
      metadata: { pdf_url: pdfUrl, storage_path: storagePath, file_name: file.name, file_size: file.size }
    }).select().single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, work, url: pdfUrl });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
