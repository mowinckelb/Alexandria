'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface PersonaSummary {
  id: string;
  title: string;
  type: string;
  summary: {
    counts: {
      entries: number;
      memoryFragments: number;
      trainingPairs: number;
    };
    constitutionVersion: number | null;
    hasConstitution: boolean;
    hasWorldview: boolean;
    hasValues: boolean;
  };
}

export default function PersonaPage() {
  const params = useParams<{ id: string }>();
  const personaId = params?.id || '';
  const [data, setData] = useState<PersonaSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!personaId) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/library/${personaId}`);
        if (!res.ok) return;
        const json = await res.json();
        setData(json);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [personaId]);

  return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl mb-2">{data?.title || `Persona ${personaId.slice(0, 8)}`}</h1>
        <p className="text-sm opacity-70 mb-8">Neo-Biography (early)</p>

        {loading ? (
          <div className="rounded-xl p-4 text-sm opacity-70" style={{ background: 'var(--bg-secondary)' }}>
            loading persona...
          </div>
        ) : (
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg-secondary)' }}>
            <div className="text-sm opacity-85">
              Constitution: {data?.summary.hasConstitution ? `v${data.summary.constitutionVersion}` : 'not extracted yet'}
            </div>
            <div className="text-sm opacity-75">
              Vault coverage: {data?.summary.counts.entries || 0} entries, {data?.summary.counts.memoryFragments || 0} indexed memories, {data?.summary.counts.trainingPairs || 0} training pairs
            </div>
            <div className="text-xs opacity-60">
              API access endpoint: <code>/api/persona/query</code> with <code>x-api-key</code>.
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
