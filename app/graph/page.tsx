'use client';

import { useEffect, useState } from 'react';

interface EntityItem {
  entityName: string;
  entityType: string;
  count: number;
}

interface RelationshipItem {
  source_entity: string;
  target_entity: string;
  relation_type: string;
  confidence: number;
}

export default function GraphPage() {
  const [userId, setUserId] = useState('');
  const [seed, setSeed] = useState('alexandria');
  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [relationships, setRelationships] = useState<RelationshipItem[]>([]);
  const [graphSummary, setGraphSummary] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setUserId(localStorage.getItem('alexandria_user_id') || '');
  }, []);

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [eRes, rRes, gRes] = await Promise.all([
        fetch(`/api/memory-entities?userId=${userId}&limit=100`),
        fetch(`/api/memory-relationships?userId=${userId}&limit=100`),
        fetch(`/api/memory-graph?userId=${userId}&seed=${encodeURIComponent(seed)}&depth=2`)
      ]);
      if (eRes.ok) {
        const data = await eRes.json();
        setEntities(data.items || []);
      }
      if (rRes.ok) {
        const data = await rRes.json();
        setRelationships(data.items || []);
      }
      if (gRes.ok) {
        const data = await gRes.json();
        setGraphSummary(`nodes: ${data.nodeCount || 0} · edges: ${data.edgeCount || 0}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    void load();
  }, [userId]);

  return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="mx-auto max-w-5xl space-y-4">
        <h1 className="text-2xl">Graph Inspector</h1>
        <p className="text-sm opacity-70">{graphSummary || 'memory entities + relationships'}</p>

        <div className="flex items-center gap-2">
          <input
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            className="rounded px-3 py-1 text-sm"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            placeholder="seed entity"
          />
          <button
            onClick={load}
            disabled={loading}
            className="rounded px-3 py-1 text-sm disabled:opacity-50"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-secondary)' }}>
            <h2 className="text-sm opacity-80">entities</h2>
            {entities.length === 0 && <div className="text-xs opacity-60">none yet</div>}
            {entities.slice(0, 30).map((e) => (
              <div key={`${e.entityName}-${e.entityType}`} className="text-xs">
                {e.entityName} · {e.entityType} · {e.count}
              </div>
            ))}
          </div>

          <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-secondary)' }}>
            <h2 className="text-sm opacity-80">relationships</h2>
            {relationships.length === 0 && <div className="text-xs opacity-60">none yet</div>}
            {relationships.slice(0, 30).map((r, i) => (
              <div key={`${r.source_entity}-${r.target_entity}-${i}`} className="text-xs">
                {r.source_entity} → {r.target_entity} ({r.relation_type}, {Number(r.confidence || 0).toFixed(2)})
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
