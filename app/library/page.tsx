'use client';

import { useEffect, useState } from 'react';

interface AuthorEntry {
  userId: string;
  displayName: string | null;
  handle: string | null;
  bio: string | null;
  constitutionSummary: string | null;
  worksCount: number;
  influencesCount: number;
  maturity: number;
  interactive: boolean;
}

export default function LibraryPage() {
  const [authors, setAuthors] = useState<AuthorEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/library');
        if (!res.ok) return;
        const data = await res.json();

        const enriched: AuthorEntry[] = [];
        for (const persona of data.personas || []) {
          try {
            const bioRes = await fetch(`/api/neo-biography?userId=${persona.userId}`);
            if (bioRes.ok) {
              const bio = await bioRes.json();
              enriched.push({
                userId: persona.userId,
                displayName: bio.profile?.display_name || persona.title || null,
                handle: bio.profile?.handle || null,
                bio: bio.profile?.bio || persona.subtitle || null,
                constitutionSummary: bio.persona?.constitutionSummary || null,
                worksCount: bio.works?.length || 0,
                influencesCount: bio.influences?.length || 0,
                maturity: bio.persona?.maturity || 0,
                interactive: bio.persona?.interactive || false
              });
            }
          } catch {
            enriched.push({
              userId: persona.userId,
              displayName: persona.title || null,
              handle: null,
              bio: persona.subtitle || null,
              constitutionSummary: null,
              worksCount: 0,
              influencesCount: 0,
              maturity: 0,
              interactive: false
            });
          }
        }
        setAuthors(enriched);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <a href="/" className="text-sm opacity-50 hover:opacity-100 transition-opacity">← home</a>
        </div>

        <div className="mb-12">
          <h1 className="text-2xl mb-1" style={{ letterSpacing: '0.04em' }}>Library</h1>
          <p className="text-xs opacity-40" style={{ letterSpacing: '0.02em' }}>mentes aeternae</p>
        </div>

        {loading ? (
          <p className="text-sm opacity-40">loading...</p>
        ) : authors.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm opacity-40">no personas yet.</p>
            <p className="text-xs opacity-30 mt-2">every mind that enters Alexandria appears here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {authors.map((author) => (
              <a
                key={author.userId}
                href={`/persona/${author.userId}`}
                className="block rounded-xl p-5 transition-all hover:scale-[1.01]"
                style={{ background: 'var(--bg-secondary)', textDecoration: 'none', color: 'inherit' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-base">
                        {author.displayName || 'Anonymous'}
                      </span>
                      {author.handle && (
                        <span className="text-xs opacity-30">@{author.handle}</span>
                      )}
                    </div>
                    {author.bio && (
                      <p className="text-xs opacity-50 mt-1 line-clamp-2">{author.bio}</p>
                    )}
                    {author.constitutionSummary && (
                      <p className="text-xs opacity-30 mt-2 line-clamp-1">{author.constitutionSummary}</p>
                    )}
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    {author.interactive && (
                      <span className="text-xs opacity-60">interactive</span>
                    )}
                    <div className="text-xs opacity-30 mt-1">
                      {author.worksCount > 0 && `${author.worksCount} works`}
                      {author.worksCount > 0 && author.influencesCount > 0 && ' · '}
                      {author.influencesCount > 0 && `${author.influencesCount} influences`}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
