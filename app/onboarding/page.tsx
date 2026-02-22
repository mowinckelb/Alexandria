'use client';

import { useEffect, useState } from 'react';

interface OnboardingOps {
  counts: {
    entries: number;
    constitutions: number;
    activeBindings: number;
    apiKeys: number;
  };
  checklist: Record<string, boolean>;
  blockers: string[];
  recommendations: string[];
  details: {
    maturity: number | null;
    maturityUpdatedAt: string | null;
    lastEditorContactAt: string | null;
  };
}

export default function OnboardingPage() {
  const [userId, setUserId] = useState('');
  const [data, setData] = useState<OnboardingOps | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUserId(localStorage.getItem('alexandria_user_id') || '');
  }, []);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/onboarding/ops?userId=${userId}`);
        if (!res.ok) return;
        setData(await res.json());
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [userId]);

  return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="text-2xl">Onboarding Ops</h1>
        <p className="text-sm opacity-70">readiness, blockers, and next actions</p>
        {loading ? (
          <div className="rounded-xl p-4 text-sm opacity-70" style={{ background: 'var(--bg-secondary)' }}>
            loading...
          </div>
        ) : !data ? (
          <div className="rounded-xl p-4 text-sm opacity-70" style={{ background: 'var(--bg-secondary)' }}>
            no onboarding data
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-xs opacity-60">entries</div>
                <div className="text-sm">{data.counts.entries}</div>
              </div>
              <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-xs opacity-60">constitutions</div>
                <div className="text-sm">{data.counts.constitutions}</div>
              </div>
              <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-xs opacity-60">active bindings</div>
                <div className="text-sm">{data.counts.activeBindings}</div>
              </div>
              <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-xs opacity-60">api keys</div>
                <div className="text-sm">{data.counts.apiKeys}</div>
              </div>
            </div>

            <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-secondary)' }}>
              <div className="text-sm">checklist</div>
              {Object.entries(data.checklist).map(([k, v]) => (
                <div key={k} className="text-xs">{v ? '✅' : '❌'} {k}</div>
              ))}
            </div>

            <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-secondary)' }}>
              <div className="text-sm">blockers</div>
              {data.blockers.length === 0 ? (
                <div className="text-xs opacity-70">none</div>
              ) : (
                data.blockers.map((row) => <div key={row} className="text-xs">{row}</div>)
              )}
            </div>

            <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-secondary)' }}>
              <div className="text-sm">recommended actions</div>
              {data.recommendations.length === 0 ? (
                <div className="text-xs opacity-70">none</div>
              ) : (
                data.recommendations.map((row, idx) => <div key={`${idx}-${row}`} className="text-xs">{row}</div>)
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
