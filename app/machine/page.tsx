'use client';

import { useEffect, useState } from 'react';

interface MachineStatusPayload {
  machine?: {
    healthy: boolean;
    coreHealthy?: boolean;
    warnings?: {
      queuedHighImpactBlueprintProposals?: number;
    };
    axioms: {
      healthy: boolean;
      violations: Array<{ code: string; message: string; path: string }>;
    };
    editorLoop: {
      healthy: boolean;
      activityLevel: string;
      cycleCount: number;
      sleepMinutes: number | null;
      lastCycleAt: string | null;
      nextCycleAt: string | null;
      stale?: boolean;
      lagMinutes?: number | null;
      nextInMinutes?: number | null;
    };
    ingestionLoop: {
      healthy: boolean;
      pendingJobs: number;
      runningJobs: number;
    };
    rlaifLoop: {
      pendingAuthorReview: number;
      undeliveredEditorMessages: number;
    };
    trainingLoop: {
      readyPairs: number;
      readyForAutoTrain: boolean;
      twinStatus?: string;
      activeModelId?: string | null;
      lastTrainedAt?: string | null;
      lastTrainingExport: {
        id: string;
        status: string;
        createdAt: string;
        completedAt: string | null;
      } | null;
    };
    blueprintLoop: {
      queuedProposals: number;
      queuedHighImpact?: number;
    };
    nextActions?: string[];
  };
  error?: string;
}

export default function MachinePage() {
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState<MachineStatusPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [runResult, setRunResult] = useState<string>('');

  const loadStatus = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/machine/status?userId=${id}`);
      const data = await res.json();
      setStatus(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = localStorage.getItem('alexandria_user_id') || '';
    setUserId(id);
    if (id) {
      void loadStatus(id);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    const timer = setInterval(() => {
      void loadStatus(userId);
    }, 15000);
    return () => clearInterval(timer);
  }, [userId]);

  const runMachineCycle = async () => {
    setRunning(true);
    setRunResult('');
    try {
      const res = await fetch(`/api/cron/machine-cycle?userId=${encodeURIComponent(userId)}`, { method: 'POST' });
      const data = await res.json();
      const ok = Boolean(data?.success);
      const proposalNote = data?.proposalId ? ` · blueprint proposal queued (${data.proposalId})` : '';
      setRunResult(ok ? `machine cycle complete${proposalNote}` : `machine cycle returned issues${proposalNote}`);
      if (userId) {
        await loadStatus(userId);
      }
    } catch {
      setRunResult('machine cycle failed');
    } finally {
      setRunning(false);
    }
  };

  const bootstrapMachine = async () => {
    setBootstrapping(true);
    setRunResult('');
    try {
      const res = await fetch('/api/machine/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      setRunResult(res.ok && data?.success ? 'machine bootstrapped' : (data?.error || 'bootstrap failed'));
      await loadStatus(userId);
    } catch {
      setRunResult('bootstrap failed');
    } finally {
      setBootstrapping(false);
    }
  };

  if (!userId) {
    return (
      <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <div className="mx-auto max-w-4xl">
          <div className="rounded-xl p-4 text-sm" style={{ background: 'var(--bg-secondary)' }}>
            sign in first, then open this page again.
          </div>
        </div>
      </main>
    );
  }

  const machine = status?.machine;

  return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="text-2xl">Machine</h1>
        <p className="text-sm opacity-70">single-view loop health for editor, ingestion, rlaif, and training.</p>

        <div className="flex gap-2">
          <button
            onClick={() => loadStatus(userId)}
            disabled={loading}
            className="rounded-lg px-3 py-2 text-sm disabled:opacity-50"
            style={{ background: 'var(--bg-secondary)' }}
          >
            {loading ? 'refreshing...' : 'refresh'}
          </button>
          <button
            onClick={runMachineCycle}
            disabled={running}
            className="rounded-lg px-3 py-2 text-sm disabled:opacity-50"
            style={{ background: 'var(--bg-secondary)' }}
          >
            {running ? 'running cycle...' : 'run machine cycle'}
          </button>
          <button
            onClick={bootstrapMachine}
            disabled={bootstrapping}
            className="rounded-lg px-3 py-2 text-sm disabled:opacity-50"
            style={{ background: 'var(--bg-secondary)' }}
          >
            {bootstrapping ? 'bootstrapping...' : 'bootstrap machine'}
          </button>
          <a href="/" className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--bg-secondary)' }}>
            back to app
          </a>
          <a href="/blueprint" className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--bg-secondary)' }}>
            blueprint
          </a>
        </div>

        {runResult && <div className="text-xs opacity-70">{runResult}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}>
            <div className="text-xs opacity-60">machine</div>
            <div className="text-lg">{machine?.healthy ? 'healthy' : 'degraded'}</div>
            <div className="text-xs opacity-70">
              axioms {machine?.axioms?.healthy ? 'ok' : 'violated'}
            </div>
            <div className="text-xs opacity-60">
              core {machine?.coreHealthy ? 'ok' : 'degraded'} · high-impact proposals {machine?.warnings?.queuedHighImpactBlueprintProposals || 0}
            </div>
            {!machine?.axioms?.healthy && (machine?.axioms?.violations?.length || 0) > 0 && (
              <div className="text-xs opacity-60 mt-1">
                {machine?.axioms?.violations?.[0]?.message}
              </div>
            )}
          </div>
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}>
            <div className="text-xs opacity-60">editor loop</div>
            <div className="text-sm">
              {machine?.editorLoop?.healthy ? 'ok' : 'not running'} · {machine?.editorLoop?.activityLevel || 'unknown'}
            </div>
            <div className="text-xs opacity-70">
              cycles {machine?.editorLoop?.cycleCount || 0} · sleep {machine?.editorLoop?.sleepMinutes ?? '-'}m
            </div>
            <div className="text-xs opacity-60">
              lag {machine?.editorLoop?.lagMinutes ?? '-'}m · next {machine?.editorLoop?.nextInMinutes ?? '-'}m
              {machine?.editorLoop?.stale ? ' · stale' : ''}
            </div>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}>
            <div className="text-xs opacity-60">ingestion loop</div>
            <div className="text-sm">
              pending {machine?.ingestionLoop?.pendingJobs || 0} · running {machine?.ingestionLoop?.runningJobs || 0}
            </div>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}>
            <div className="text-xs opacity-60">rlaif loop</div>
            <div className="text-sm">
              review queue {machine?.rlaifLoop?.pendingAuthorReview || 0} · editor msgs {machine?.rlaifLoop?.undeliveredEditorMessages || 0}
            </div>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}>
            <div className="text-xs opacity-60">training loop</div>
            <div className="text-sm">
              ready pairs {machine?.trainingLoop?.readyPairs || 0}
              {machine?.trainingLoop?.readyForAutoTrain ? ' · auto-train ready' : ''}
            </div>
            <div className="text-xs opacity-70">
              last export: {machine?.trainingLoop?.lastTrainingExport?.status || 'none'}
            </div>
            <div className="text-xs opacity-60">
              twin {machine?.trainingLoop?.twinStatus || 'unknown'} · model {machine?.trainingLoop?.activeModelId || 'none'}
            </div>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}>
            <div className="text-xs opacity-60">blueprint loop</div>
            <div className="text-sm">
              queued proposals {machine?.blueprintLoop?.queuedProposals || 0}
            </div>
            <div className="text-xs opacity-60">
              high impact {machine?.blueprintLoop?.queuedHighImpact || 0}
            </div>
          </div>
        </div>

        <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-secondary)' }}>
          <div className="text-sm">next actions</div>
          {(machine?.nextActions || []).length === 0 && <div className="text-xs opacity-60">none</div>}
          {(machine?.nextActions || []).map((action, idx) => (
            <div key={`${idx}-${action}`} className="text-xs opacity-80">
              {idx + 1}. {action}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
