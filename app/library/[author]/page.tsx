import type { Metadata } from 'next';
import AuthorPageClient from './client';
import { SERVER_URL } from '../../lib/config';

export async function generateMetadata({ params }: { params: Promise<{ author: string }> }): Promise<Metadata> {
  const { author } = await params;
  try {
    const res = await fetch(`${SERVER_URL}/library/${author}`, { next: { revalidate: 300 } });
    if (!res.ok) return { title: 'the library — alexandria.' };
    const data = await res.json();
    const name = data.author?.display_name || author;
    const bio = data.author?.bio || 'mens aeterna.';
    return {
      title: `${name} — the library`,
      description: bio,
      openGraph: {
        title: `${name}`,
        description: bio,
        siteName: 'Alexandria',
        type: 'profile',
      },
      twitter: { card: 'summary', title: name, description: bio },
    };
  } catch {
    return { title: 'the library — alexandria.' };
  }
}

export default function AuthorPage({ params }: { params: Promise<{ author: string }> }) {
  return <AuthorPageClient params={params} />;
}
