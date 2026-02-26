import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { getFastModel } from '@/lib/models';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  // Fetch raw editor notes (gaps, questions, observations)
  const { data: notes } = await supabase
    .from('editor_notes')
    .select('id, content, topic, priority, type')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .in('type', ['gap', 'question', 'observation'])
    .order('priority', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(20);

  if (!notes || notes.length === 0) {
    return NextResponse.json({ questions: [] });
  }

  // Synthesize raw notes into clear topic questions via LLM
  const rawNotes = notes.map(n => `[${n.type}/${n.priority}] ${n.content}`).join('\n');

  try {
    const { text } = await generateText({
      model: getFastModel(),
      system: `You are an editor preparing targeted questions for an author. Given raw editor notes (gaps, observations, questions), synthesize them into 5-8 focused conversation topics.

Each topic should have:
- "title": A short title (3-6 words) — specific ("how you handle disagreement"), not generic ("your background")
- "opener": The first question you'd ask to start this conversation — warm, specific, easy to answer. NOT generic ("tell me about..."). Example: "when was the last time you changed your mind about something important?"
- "criteria": 2-4 specific things you need to find out. These are your checklist — once you've confirmed each one, you can close the conversation. Be concrete, e.g. "whether they prioritise loyalty or honesty", "their default reaction to conflict", "what kind of humor they use"

Return ONLY a JSON array: [{"title": "...", "opener": "...", "criteria": ["...", "..."]}, ...]
Order by what would give you the most new signal about who this person IS.`,
      prompt: rawNotes,
    });

    const parsed = JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
    const questions = (Array.isArray(parsed) ? parsed : []).slice(0, 8).map((q: { title: string; opener?: string; criteria?: string[] }, i: number) => ({
      id: String(i + 1),
      title: q.title,
      opener: q.opener || '',
      criteria: q.criteria || [],
    }));

    return NextResponse.json({ questions });
  } catch (e) {
    console.error('[editor-questions] LLM synthesis failed, falling back to raw notes', e);
    // Fallback: use raw notes directly, deduplicated by topic
    const seen = new Set<string>();
    const fallback = notes
      .filter(n => {
        const key = (n.topic || n.content).slice(0, 40);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8)
      .map((n, i) => ({
        id: String(i + 1),
        title: n.topic || n.content.slice(0, 60),
        opener: '',
        criteria: [],
      }));

    return NextResponse.json({ questions: fallback });
  }
}
