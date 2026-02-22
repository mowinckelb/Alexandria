'use client';

import { useEffect, useState } from 'react';

interface Maturity {
  overallScore: number;
  domainScores: Record<string, number>;
  trainingPairCount: number;
  rlaifEvaluationCount: number;
  updatedAt?: string;
}

export default function MaturityPage() {
  const [userId, setUserId] = useState('');
  const [data, setData] = useState<Maturity | null>(null);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);

  const load = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/plm-maturity?userId=${id}`);
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = localStorage.getItem('alexandria_user_id') || '';
    setUserId(id);
    if (id) void load(id);
  }, []);

  const recompute = async () => {
    if (!userId) return;
    setRecomputing(true);
    try {
      await fetch('/api/plm-maturity/recompute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      await load(userId);
    } finally {
      setRecomputing(false);
    }
  };

  return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl">PLM Maturity</h1>
        {loading ? (
          <div className="text-sm opacity-70">loading...</div>
        ) : (
          <>
            <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-secondary)' }}>
              <div className="text-sm">overall: {Number(data?.overallScore || 0).toFixed(3)}</div>
              <div className="text-xs opacity-70">training pairs: {data?.trainingPairCount || 0}</div>
              <div className="text-xs opacity-70">rlaif evals: {data?.rlaifEvaluationCount || 0}</div>
              <div className="text-xs opacity-60">{data?.updatedAt ? `updated ${new Date(data.updatedAt).toLocaleString()}` : ''}</div>
            </div>

            <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-secondary)' }}>
              <div className="text-sm opacity-80">domain scores</div>
              {Object.entries(data?.domainScores || {}).map(([k, v]) => (
                <div key={k} className="text-xs">{k}: {Number(v || 0).toFixed(3)}</div>
              ))}
            </div>

            <button
              onClick={recompute}
              disabled={recomputing}
              className="rounded px-3 py-1 text-sm disabled:opacity-50"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            >
              {recomputing ? 'recomputing...' : 'recompute'}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
