import type { Metadata } from 'next';
import PulsePageClient from './client';
import { SERVER_URL } from '../../../lib/config';

export async function generateMetadata({ params }: { params: Promise<{ author: string }> }): Promise<Metadata> {
  const { author } = await params;
  try {
    const res = await fetch(`${SERVER_URL}/library/${author}`, { next: { revalidate: 300 } });
    if (!res.ok) return { title: 'pulse — alexandria.' };
    const data = await res.json();
    const name = data.author?.display_name || author;
    const title = `${name} — pulse`;
    const description = `${name}'s monthly pulse.`;
    return {
      title,
      description,
      openGraph: { title, description, siteName: 'Alexandria', type: 'website' },
      twitter: { card: 'summary', title, description },
    };
  } catch {
    return { title: 'pulse — alexandria.' };
  }
}

export default function PulsePage({ params }: { params: Promise<{ author: string }> }) {
  return <PulsePageClient params={params} />;
}
