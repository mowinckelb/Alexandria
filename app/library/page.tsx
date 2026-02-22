'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface PersonaListItem {
  id: string;
  userId: string;
  title: string;
  subtitle: string;
  type: 'natural';
  readinessScore?: number;
  trustBadges?: string[];
  moderationPendingCount?: number;
  moderationOldestPendingHours?: number;
  rankingScore?: number;
  growth?: {
    views7d: number;
    interactions7d: number;
    externalQueries7d: number;
  };
}

export default function LibraryPage() {
  const [personas, setPersonas] = useState<PersonaListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/library');
        if (!res.ok) return;
        const data = await res.json();
        setPersonas(data.personas || []);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl mb-2">Library</h1>
        <p className="text-sm opacity-70 mb-2">mentes aeternae</p>
        <a href="/library-moderation" className="text-xs opacity-60 hover:opacity-80 transition-opacity">open moderation inbox</a>
        <div className="mb-6" />
        {loading ? (
          <div className="rounded-xl p-4 text-sm opacity-70" style={{ background: 'var(--bg-secondary)' }}>
            loading personas...
          </div>
        ) : personas.length === 0 ? (
          <div className="rounded-xl p-4 text-sm opacity-70" style={{ background: 'var(--bg-secondary)' }}>
            no personas yet.
          </div>
        ) : (
          <div className="space-y-3">
            {personas.map((persona) => (
              <Link
                key={persona.id}
                href={`/persona/${persona.id}`}
                className="block rounded-xl p-4 transition-opacity hover:opacity-80"
                style={{ background: 'var(--bg-secondary)' }}
              >
                <div className="text-base">{persona.title}</div>
                <div className="text-sm opacity-70">{persona.subtitle}</div>
                <div className="mt-1 text-xs opacity-70">
                  readiness: {Number(persona.readinessScore || 0)} / 100
                  {typeof persona.rankingScore === 'number' ? ` · rank: ${persona.rankingScore.toFixed(2)}` : ''}
                  {typeof persona.moderationPendingCount === 'number' && persona.moderationPendingCount > 0
                    ? ` · pending reports: ${persona.moderationPendingCount}`
                    : ''}
                  {typeof persona.moderationOldestPendingHours === 'number' && persona.moderationOldestPendingHours > 0
                    ? ` · oldest pending: ${persona.moderationOldestPendingHours.toFixed(1)}h`
                    : ''}
                </div>
                {persona.growth && (
                  <div className="mt-1 text-xs opacity-60">
                    7d: {persona.growth.views7d} views · {persona.growth.interactions7d} interactions · {persona.growth.externalQueries7d} external queries
                  </div>
                )}
                {persona.trustBadges && persona.trustBadges.length > 0 && (
                  <div className="mt-1 text-xs opacity-60">{persona.trustBadges.join(' · ')}</div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
