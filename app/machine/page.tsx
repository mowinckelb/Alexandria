'use client';

import { useEffect, useState } from 'react';

interface LoopStatus {
  machine?: {
    healthy: boolean;
    axioms: { healthy: boolean; violations: Array<{ message: string }> };
    editorLoop: {
      healthy: boolean;
      activityLevel: string;
      cycleCount: number;
      sleepMinutes: number | null;
      lagMinutes?: number | null;
      stale?: boolean;
    };
    ingestionLoop: { healthy: boolean; pendingJobs: number; runningJobs: number };
    rlaifLoop: { pendingAuthorReview: number; undeliveredEditorMessages: number };
    constitutionLoop?: {
      hasConstitution: boolean;
      version: number | null;
      qualityPairsAll: number;
      newPairsSinceLast: number | null;
      refreshReady: boolean;
    };
    trainingLoop: {
      readyPairs: number;
      readyForAutoTrain: boolean;
      twinStatus?: string;
      activeModelId?: string | null;
      lastTrainingExport: { status: string } | null;
    };
    nextActions?: string[];
  };
}

interface Gap { section: string; gapScore: number; priority: string; evidenceCount: number }

export default function MachinePage() {
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState<LoopStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionRunning, setActionRunning] = useState('');
  const [result, setResult] = useState('');
  const [gaps, setGaps] = useState<Gap[]>([]);

  const load = async (id: string) => {
    setLoading(true);
    try {
      const [s, g] = await Promise.all([
        fetch(`/api/machine/status?userId=${id}`).then(r => r.json()),
        fetch(`/api/rlaif/gaps?userId=${id}`).then(r => r.ok ? r.json() : { items: [] })
      ]);
      setStatus(s);
      setGaps(g.items || []);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const id = localStorage.getItem('alexandria_user_id') || '';
    setUserId(id);
    if (id) void load(id);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const t = setInterval(() => void load(userId), 15000);
    return () => clearInterval(t);
  }, [userId]);

  const act = async (label: string, url: string, body?: Record<string, unknown>) => {
    setActionRunning(label);
    setResult('');
    try {
      const res = await fetch(url, body ? {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...body })
      } : { method: 'POST' });
      const data = await res.json();
      setResult(data?.success ? `${label} complete` : (data?.error || `${label} failed`));
      await load(userId);
    } catch { setResult(`${label} failed`); }
    finally { setActionRunning(''); }
  };

  if (!userId) return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="mx-auto max-w-3xl">
        <a href="/" className="text-sm opacity-50 hover:opacity-100 transition-opacity">← home</a>
        <p className="mt-4 text-sm opacity-60">sign in first.</p>
      </div>
    </main>
  );

  const m = status?.machine;
  const healthy = m?.healthy;
  const axiomsOk = m?.axioms?.healthy;

  return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <a href="/" className="text-sm opacity-50 hover:opacity-100 transition-opacity">← home</a>
          <div className="flex gap-2">
            <button onClick={() => load(userId)} disabled={loading}
              className="rounded px-3 py-1.5 text-xs disabled:opacity-30" style={{ background: 'var(--bg-secondary)' }}>
              {loading ? '...' : 'refresh'}
            </button>
            <button onClick={() => act('cycle', `/api/cron/machine-cycle?userId=${encodeURIComponent(userId)}`)}
              disabled={!!actionRunning}
              className="rounded px-3 py-1.5 text-xs disabled:opacity-30" style={{ background: 'var(--bg-secondary)' }}>
              {actionRunning === 'cycle' ? '...' : 'run cycle'}
            </button>
          </div>
        </div>

        <div>
          <h1 className="text-xl" style={{ letterSpacing: '0.03em' }}>Machine</h1>
          <p className="text-xs opacity-40 mt-1">
            {healthy ? 'healthy' : 'degraded'} · axioms {axiomsOk ? 'ok' : 'violated'}
            {!axiomsOk && m?.axioms?.violations?.[0] ? ` — ${m.axioms.violations[0].message}` : ''}
          </p>
        </div>

        {result && <p className="text-xs opacity-60">{result}</p>}

        {/* Loop status grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card title="editor">
            <Line>{m?.editorLoop?.healthy ? 'running' : 'idle'} · {m?.editorLoop?.activityLevel || '—'}</Line>
            <Dim>cycles {m?.editorLoop?.cycleCount || 0} · lag {m?.editorLoop?.lagMinutes ?? '—'}m{m?.editorLoop?.stale ? ' · stale' : ''}</Dim>
          </Card>

          <Card title="ingestion">
            <Line>pending {m?.ingestionLoop?.pendingJobs || 0} · running {m?.ingestionLoop?.runningJobs || 0}</Line>
          </Card>

          <Card title="constitution">
            <Line>{m?.constitutionLoop?.hasConstitution ? `v${m.constitutionLoop.version}` : 'none'} · refresh {m?.constitutionLoop?.refreshReady ? 'ready' : 'not ready'}</Line>
            <Dim>quality pairs {m?.constitutionLoop?.qualityPairsAll || 0} · new since refresh {m?.constitutionLoop?.newPairsSinceLast ?? '—'}</Dim>
          </Card>

          <Card title="rlaif">
            <Line>review queue {m?.rlaifLoop?.pendingAuthorReview || 0}</Line>
            <Dim>editor msgs pending {m?.rlaifLoop?.undeliveredEditorMessages || 0}</Dim>
            {(m?.rlaifLoop?.pendingAuthorReview || 0) > 0 && (
              <button onClick={() => act('approve', '/api/rlaif/review', { action: 'bulk_approve', limit: 100, includeFlagged: false })}
                disabled={!!actionRunning}
                className="mt-2 rounded px-2 py-1 text-xs disabled:opacity-30" style={{ background: 'var(--bg-primary)' }}>
                bulk approve
              </button>
            )}
          </Card>

          <Card title="training">
            <Line>ready pairs {m?.trainingLoop?.readyPairs || 0}{m?.trainingLoop?.readyForAutoTrain ? ' · auto-train ready' : ''}</Line>
            <Dim>export {m?.trainingLoop?.lastTrainingExport?.status || 'none'} · model {m?.trainingLoop?.activeModelId ? '✓' : 'base'}</Dim>
          </Card>

          <Card title="constitution gaps">
            {gaps.length === 0 ? <Dim>no gap data</Dim> : gaps.map(g => (
              <div key={g.section} className="flex justify-between text-xs opacity-70">
                <span>{g.section}</span>
                <span>{g.gapScore.toFixed(2)} · {g.evidenceCount} ev</span>
              </div>
            ))}
          </Card>
        </div>

        {/* Next actions */}
        {(m?.nextActions?.length || 0) > 0 && (
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}>
            <div className="text-xs opacity-50 mb-2">next actions</div>
            {m!.nextActions!.map((a, i) => (
              <div key={i} className="text-xs opacity-70">{i + 1}. {a}</div>
            ))}
          </div>
        )}

        {/* Quick links */}
        <div className="flex gap-2 text-xs opacity-50">
          <a href="/batch-upload" className="hover:opacity-100 transition-opacity">upload</a>
          <span>·</span>
          <a href="/training" className="hover:opacity-100 transition-opacity">training</a>
          <span>·</span>
          <a href="/" className="hover:opacity-100 transition-opacity">chat</a>
        </div>
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}>
      <div className="text-xs opacity-40 mb-1">{title}</div>
      {children}
    </div>
  );
}

function Line({ children }: { children: React.ReactNode }) {
  return <div className="text-sm">{children}</div>;
}

function Dim({ children }: { children: React.ReactNode }) {
  return <div className="text-xs opacity-50">{children}</div>;
}
