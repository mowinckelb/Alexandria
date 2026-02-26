import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  return createClient(url, key);
}

const publishSchema = z.object({
  userId: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  medium: z.enum(['essay', 'poetry', 'note', 'letter', 'reflection', 'speech', 'pdf', 'other']).default('essay'),
  summary: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

const influenceSchema = z.object({
  userId: z.string().min(1),
  title: z.string().min(1),
  medium: z.enum(['book', 'film', 'music', 'playlist', 'video', 'podcast', 'essay', 'art', 'lecture', 'person', 'place', 'other']).default('book'),
  url: z.string().optional(),
  annotation: z.string().optional(),
  category: z.string().optional()
});

const profileSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().optional(),
  handle: z.string().optional(),
  bio: z.string().optional()
});

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const userId = req.nextUrl.searchParams.get('userId');
    const browse = req.nextUrl.searchParams.get('browse');

    // Browse mode: return all personas with work/influence counts
    if (browse === 'true') {
      const { data: profiles } = await supabase
        .from('author_profiles')
        .select('*')
        .order('updated_at', { ascending: false });

      const personas = [];
      for (const p of profiles || []) {
        const [worksCount, infCount] = await Promise.all([
          supabase.from('authored_works').select('*', { count: 'exact', head: true }).eq('user_id', p.user_id),
          supabase.from('curated_influences').select('*', { count: 'exact', head: true }).eq('user_id', p.user_id),
        ]);
        personas.push({
          ...p,
          works_count: worksCount.count || 0,
          influences_count: infCount.count || 0,
        });
      }

      return NextResponse.json({ personas });
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const [profileRes, worksRes, influencesRes] = await Promise.all([
      supabase.from('author_profiles').select('*').eq('user_id', userId).single(),
      supabase.from('authored_works').select('*').eq('user_id', userId).order('published_at', { ascending: false }),
      supabase.from('curated_influences').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    ]);

    const { data: constitutionData } = await supabase
      .from('active_constitutions')
      .select('constitution_id, constitutions(sections)')
      .eq('user_id', userId)
      .single();

    const sections = (constitutionData as Record<string, unknown>)?.constitutions as Record<string, unknown> | null;
    const constitutionSections = sections?.sections as Record<string, unknown> | null;
    const publicSummary = constitutionSections
      ? Object.entries(constitutionSections)
          .filter(([key]) => key !== 'shadows')
          .map(([key, val]) => {
            const items = Array.isArray(val) ? val : [];
            return items.length > 0 ? `${key}: ${items.slice(0, 2).join('; ')}` : null;
          })
          .filter(Boolean)
          .join(' · ')
      : null;

    const { data: maturityData } = await supabase
      .from('plm_maturity')
      .select('domain, score')
      .eq('user_id', userId);

    const avgMaturity = maturityData?.length
      ? maturityData.reduce((sum, m) => sum + (m.score || 0), 0) / maturityData.length
      : 0;

    return NextResponse.json({
      profile: profileRes.data || { user_id: userId },
      works: worksRes.data || [],
      influences: influencesRes.data || [],
      persona: {
        constitutionSummary: publicSummary,
        maturity: Math.round(avgMaturity * 100) / 100,
        interactive: avgMaturity > 0.3
      }
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabase();
    const body = await req.json();
    const { action } = body;

    if (action === 'publish') {
      const parsed = publishSchema.parse(body);
      const { data, error } = await supabase.from('authored_works').insert({
        user_id: parsed.userId,
        title: parsed.title,
        content: parsed.content,
        medium: parsed.medium,
        summary: parsed.summary || parsed.content.slice(0, 200),
        frozen: true,
        metadata: parsed.metadata || {}
      }).select().single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, work: data });
    }

    if (action === 'add_influence') {
      const parsed = influenceSchema.parse(body);
      const { data, error } = await supabase.from('curated_influences').insert({
        user_id: parsed.userId,
        title: parsed.title,
        medium: parsed.medium,
        url: parsed.url,
        annotation: parsed.annotation,
        category: parsed.category
      }).select().single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, influence: data });
    }

    if (action === 'update_profile') {
      const parsed = profileSchema.parse(body);
      const { data, error } = await supabase.from('author_profiles').upsert({
        user_id: parsed.userId,
        display_name: parsed.displayName,
        handle: parsed.handle,
        bio: parsed.bio,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' }).select().single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, profile: data });
    }

    if (action === 'delete_work') {
      const { id, userId: uid } = body;
      if (!id || !uid) return NextResponse.json({ error: 'id and userId required' }, { status: 400 });
      const { error } = await supabase.from('authored_works').delete().eq('id', id).eq('user_id', uid);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'delete_influence') {
      const { id, userId: uid } = body;
      if (!id || !uid) return NextResponse.json({ error: 'id and userId required' }, { status: 400 });
      const { error } = await supabase.from('curated_influences').delete().eq('id', id).eq('user_id', uid);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'rename_work') {
      const { id, userId: uid, title } = body;
      if (!id || !uid || !title) return NextResponse.json({ error: 'id, userId, and title required' }, { status: 400 });
      const { error } = await supabase.from('authored_works').update({ title }).eq('id', id).eq('user_id', uid);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === 'rename_influence') {
      const { id, userId: uid, title } = body;
      if (!id || !uid || !title) return NextResponse.json({ error: 'id, userId, and title required' }, { status: 400 });
      const { error } = await supabase.from('curated_influences').update({ title }).eq('id', id).eq('user_id', uid);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: e.issues }, { status: 400 });
    }
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
