'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Work {
  id: string;
  title: string;
  content: string;
  medium: string;
  summary: string;
  published_at: string;
}

interface Influence {
  id: string;
  title: string;
  medium: string;
  url: string | null;
  annotation: string | null;
  category: string | null;
}

interface Profile {
  user_id: string;
  display_name: string | null;
  handle: string | null;
  bio: string | null;
}

interface PersonaInfo {
  constitutionSummary: string | null;
  maturity: number;
  interactive: boolean;
}

export default function NeoBiographyPage() {
  const params = useParams();
  const userId = params.id as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [influences, setInfluences] = useState<Influence[]>([]);
  const [persona, setPersona] = useState<PersonaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeWork, setActiveWork] = useState<Work | null>(null);
  const [queryInput, setQueryInput] = useState('');
  const [queryResponse, setQueryResponse] = useState('');
  const [querying, setQuerying] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/neo-biography?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setProfile(data.profile);
          setWorks(data.works || []);
          setInfluences(data.influences || []);
          setPersona(data.persona);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const queryPersona = async () => {
    if (!queryInput.trim()) return;
    setQuerying(true);
    setQueryResponse('');
    try {
      const res = await fetch('/api/persona/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryInput, userId })
      });
      const data = await res.json();
      setQueryResponse(data.response || data.error || 'No response');
    } catch {
      setQueryResponse('Failed to query persona');
    } finally {
      setQuerying(false);
    }
  };

  if (loading) return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="mx-auto max-w-3xl">
        <p className="text-sm opacity-40">loading...</p>
      </div>
    </main>
  );

  const name = profile?.display_name || 'Anonymous';

  return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <a href="/library" className="text-sm opacity-50 hover:opacity-100 transition-opacity">← library</a>
        </div>

        {/* Author identity */}
        <div className="mb-12">
          <h1 className="text-2xl" style={{ letterSpacing: '0.04em' }}>{name}</h1>
          {profile?.handle && (
            <p className="text-xs opacity-30 mt-1">@{profile.handle}</p>
          )}
          {profile?.bio && (
            <p className="text-sm opacity-50 mt-3 leading-relaxed">{profile.bio}</p>
          )}
          {persona?.constitutionSummary && (
            <p className="text-xs opacity-25 mt-3 leading-relaxed">{persona.constitutionSummary}</p>
          )}
        </div>

        {/* Reading an authored work (modal-like) */}
        {activeWork && (
          <div className="mb-12">
            <button
              onClick={() => setActiveWork(null)}
              className="text-xs opacity-40 hover:opacity-100 transition-opacity mb-4"
            >
              ← back to works
            </button>
            <article>
              <h2 className="text-lg mb-1">{activeWork.title}</h2>
              <p className="text-xs opacity-30 mb-6">
                {activeWork.medium} · {new Date(activeWork.published_at).toLocaleDateString()}
              </p>
              <div className="prose prose-sm opacity-80 leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                {activeWork.content}
              </div>
            </article>
          </div>
        )}

        {/* Works listing (hidden when reading) */}
        {!activeWork && works.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xs opacity-30 uppercase tracking-widest mb-4">Works</h2>
            <div className="space-y-3">
              {works.map((work) => (
                <button
                  key={work.id}
                  onClick={() => setActiveWork(work)}
                  className="block w-full text-left rounded-xl p-4 transition-all hover:scale-[1.005]"
                  style={{ background: 'var(--bg-secondary)' }}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm">{work.title}</span>
                    <span className="text-xs opacity-25 ml-2 shrink-0">{work.medium}</span>
                  </div>
                  {work.summary && (
                    <p className="text-xs opacity-40 mt-1 line-clamp-2">{work.summary}</p>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Curated influences */}
        {!activeWork && influences.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xs opacity-30 uppercase tracking-widest mb-4">Influences</h2>
            <div className="space-y-2">
              {influences.map((inf) => (
                <div
                  key={inf.id}
                  className="rounded-xl p-4"
                  style={{ background: 'var(--bg-secondary)' }}
                >
                  <div className="flex items-baseline justify-between">
                    {inf.url ? (
                      <a href={inf.url} target="_blank" rel="noopener noreferrer"
                        className="text-sm hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--text-primary)' }}>
                        {inf.title}
                      </a>
                    ) : (
                      <span className="text-sm">{inf.title}</span>
                    )}
                    <span className="text-xs opacity-25 ml-2 shrink-0">
                      {inf.medium}{inf.category ? ` · ${inf.category}` : ''}
                    </span>
                  </div>
                  {inf.annotation && (
                    <p className="text-xs opacity-40 mt-1 italic leading-relaxed">{inf.annotation}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Interactive Persona */}
        {!activeWork && (
          <section className="mb-12">
            <h2 className="text-xs opacity-30 uppercase tracking-widest mb-4">Persona</h2>
            {persona?.interactive ? (
              <div className="rounded-xl p-5" style={{ background: 'var(--bg-secondary)' }}>
                <p className="text-xs opacity-40 mb-4">
                  Ask {name} anything. Responses synthesised from their Constitution, PLM, and Vault.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={queryInput}
                    onChange={(e) => setQueryInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && queryPersona()}
                    placeholder={`Ask ${name}...`}
                    className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  />
                  <button
                    onClick={queryPersona}
                    disabled={querying || !queryInput.trim()}
                    className="rounded-lg px-4 py-2 text-sm disabled:opacity-30"
                    style={{ background: 'var(--bg-primary)' }}
                  >
                    {querying ? '...' : 'ask'}
                  </button>
                </div>
                {queryResponse && (
                  <div className="mt-4 text-sm opacity-70 leading-relaxed whitespace-pre-wrap">
                    {queryResponse}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl p-5" style={{ background: 'var(--bg-secondary)' }}>
                <p className="text-xs opacity-40">
                  This persona is still building fidelity. Interactive queries will be available once PLM maturity reaches threshold.
                </p>
              </div>
            )}
          </section>
        )}

        {/* Empty state */}
        {!activeWork && works.length === 0 && influences.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xs opacity-30">This Neo-Biography is empty. The Author has not yet published works or curated influences.</p>
          </div>
        )}
      </div>
    </main>
  );
}
