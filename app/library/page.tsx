'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface PersonaListItem {
  id: string;
  userId: string;
  title: string;
  subtitle: string;
  type: 'natural';
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
        <p className="text-sm opacity-70 mb-8">mentes aeternae</p>
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
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
