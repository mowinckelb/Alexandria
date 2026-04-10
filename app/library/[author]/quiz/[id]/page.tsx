import type { Metadata } from 'next';
import QuizPageClient from './client';
import { SERVER_URL } from '../../../../lib/config';

export async function generateMetadata({ params }: { params: Promise<{ author: string; id: string }> }): Promise<Metadata> {
  const { author, id } = await params;
  try {
    const res = await fetch(`${SERVER_URL}/library/${author}/quiz/${id}`, { next: { revalidate: 300 } });
    if (!res.ok) return { title: 'quiz — alexandria.' };
    const data = await res.json();
    const title = `${data.title} — ${author}`;
    const description = `how well do you know ${author}? take the quiz.`;
    return {
      title,
      description,
      openGraph: { title: data.title, description, siteName: 'Alexandria', type: 'website' },
      twitter: { card: 'summary', title: data.title, description },
    };
  } catch {
    return { title: 'quiz — alexandria.' };
  }
}

export default function QuizPage({ params }: { params: Promise<{ author: string; id: string }> }) {
  return <QuizPageClient params={params} />;
}
