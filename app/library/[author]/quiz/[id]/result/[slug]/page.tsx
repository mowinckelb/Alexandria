import type { Metadata } from 'next';
import ResultPageClient from './client';
import { SERVER_URL } from '../../../../../../lib/config';

export async function generateMetadata({ params }: { params: Promise<{ author: string; id: string; slug: string }> }): Promise<Metadata> {
  const { author, id, slug } = await params;
  try {
    const res = await fetch(`${SERVER_URL}/library/${author}/quiz/${id}/result/${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) return { title: 'quiz result — alexandria.' };
    const data = await res.json();
    const title = `${data.score_pct}% — ${data.quiz_title}`;
    const description = `someone scored ${data.score_pct}% on how well they know ${data.author_name}. can you do better?`;
    return {
      title,
      description,
      openGraph: { title, description, siteName: 'Alexandria', type: 'website' },
      twitter: { card: 'summary', title, description },
    };
  } catch {
    return { title: 'quiz result — alexandria.' };
  }
}

export default function ResultPage({ params }: { params: Promise<{ author: string; id: string; slug: string }> }) {
  return <ResultPageClient params={params} />;
}
