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
      staleUndeliveredEditorMessages?: number;
    };
    constitutionLoop?: {
      hasConstitution: boolean;
      version: number | null;
      lastUpdatedAt: string | null;
      ageHours: number | null;
      qualityPairsAll: number;
      newPairsSinceLast: number | null;
      refreshReady: boolean;
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
    channelLoop?: {
      activeBindings: number;
      pausedBindings?: number;
      failedOutbound: number;
      deadLetterOutbound: number;
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
  const [stabilizing, setStabilizing] = useState(false);
  const [bulkReviewing, setBulkReviewing] = useState(false);
  const [resolvingBlueprint, setResolvingBlueprint] = useState(false);
  const [drainingEditorMessages, setDrainingEditorMessages] = useState(false);
  const [recoveringChannels, setRecoveringChannels] = useState(false);
  const [resolvingBlockers, setResolvingBlockers] = useState(false);
  const [includeChannels, setIncludeChannels] = useState(false);
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
      const res = await fetch(
        `/api/cron/machine-cycle?userId=${encodeURIComponent(userId)}${includeChannels ? '&includeChannels=1' : ''}`,
        { method: 'POST' }
      );
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

  const stabilizeMachine = async () => {
    setStabilizing(true);
    setRunResult('');
    try {
      const res = await fetch('/api/machine/stabilize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, includeChannels })
      });
      const data = await res.json();
      setRunResult(res.ok && data?.success ? `stabilized in ${data?.elapsedMs || 0}ms` : (data?.error || 'stabilize failed'));
      await loadStatus(userId);
    } catch {
      setRunResult('stabilize failed');
    } finally {
      setStabilizing(false);
    }
  };

  const bulkApproveRlaif = async () => {
    setBulkReviewing(true);
    setRunResult('');
    try {
      const res = await fetch('/api/rlaif/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_approve',
          userId,
          limit: 100,
          includeFlagged: false
        })
      });
      const data = await res.json();
      setRunResult(res.ok && data?.success ? `bulk approved ${data?.updated || 0} rlaif items` : (data?.error || 'bulk approve failed'));
      await loadStatus(userId);
    } catch {
      setRunResult('bulk approve failed');
    } finally {
      setBulkReviewing(false);
    }
  };

  const resolveHighImpactBlueprint = async () => {
    setResolvingBlueprint(true);
    setRunResult('');
    try {
      const res = await fetch('/api/blueprint/proposals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_resolve_high_impact',
          userId,
          status: 'rejected',
          reviewNotes: 'bulk resolved from machine dashboard'
        })
      });
      const data = await res.json();
      setRunResult(res.ok && data?.success ? `resolved ${data?.updated || 0} high-impact proposals` : (data?.error || 'resolve failed'));
      await loadStatus(userId);
    } catch {
      setRunResult('resolve failed');
    } finally {
      setResolvingBlueprint(false);
    }
  };

  const drainEditorMessages = async () => {
    setDrainingEditorMessages(true);
    setRunResult('');
    try {
      const res = await fetch('/api/machine/drain-editor-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          markStaleIfNoBindings: true,
          staleHours: 72
        })
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setRunResult(`drained editor messages: ${data?.undeliveredBefore || 0} -> ${data?.undeliveredAfter || 0}`);
      } else {
        setRunResult(data?.error || 'drain failed');
      }
      await loadStatus(userId);
    } catch {
      setRunResult('drain failed');
    } finally {
      setDrainingEditorMessages(false);
    }
  };

  const recoverChannels = async () => {
    setRecoveringChannels(true);
    setRunResult('');
    try {
      const res = await fetch('/api/machine/recover-channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, requeueDeadLetters: true, deadLetterLimit: 50 })
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setRunResult(`channels recovered · failed ${data?.failedOutboundAfter || 0} · dead-letter ${data?.deadLetterAfter || 0}`);
      } else {
        setRunResult(data?.error || 'channel recover failed');
      }
      await loadStatus(userId);
    } catch {
      setRunResult('channel recover failed');
    } finally {
      setRecoveringChannels(false);
    }
  };

  const resolveBlockers = async () => {
    setResolvingBlockers(true);
    setRunResult('');
    try {
      const res = await fetch('/api/machine/resolve-blockers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      setRunResult(res.ok && data?.success ? 'blocker resolution pass complete' : (data?.error || 'blocker resolution failed'));
      await loadStatus(userId);
    } catch {
      setRunResult('blocker resolution failed');
    } finally {
      setResolvingBlockers(false);
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
          <button
            onClick={stabilizeMachine}
            disabled={stabilizing}
            className="rounded-lg px-3 py-2 text-sm disabled:opacity-50"
            style={{ background: 'var(--bg-secondary)' }}
          >
            {stabilizing ? 'stabilizing...' : 'stabilize machine'}
          </button>
          <button
            onClick={bulkApproveRlaif}
            disabled={bulkReviewing}
            className="rounded-lg px-3 py-2 text-sm disabled:opacity-50"
            style={{ background: 'var(--bg-secondary)' }}
          >
            {bulkReviewing ? 'approving...' : 'bulk approve rlaif'}
          </button>
          <button
            onClick={resolveHighImpactBlueprint}
            disabled={resolvingBlueprint}
            className="rounded-lg px-3 py-2 text-sm disabled:opacity-50"
            style={{ background: 'var(--bg-secondary)' }}
          >
            {resolvingBlueprint ? 'resolving...' : 'resolve high-impact'}
          </button>
          <button
            onClick={drainEditorMessages}
            disabled={drainingEditorMessages}
            className="rounded-lg px-3 py-2 text-sm disabled:opacity-50"
            style={{ background: 'var(--bg-secondary)' }}
          >
            {drainingEditorMessages ? 'draining...' : 'drain editor msgs'}
          </button>
          <button
            onClick={recoverChannels}
            disabled={recoveringChannels}
            className="rounded-lg px-3 py-2 text-sm disabled:opacity-50"
            style={{ background: 'var(--bg-secondary)' }}
          >
            {recoveringChannels ? 'recovering...' : 'recover channels'}
          </button>
          <button
            onClick={resolveBlockers}
            disabled={resolvingBlockers}
            className="rounded-lg px-3 py-2 text-sm disabled:opacity-50"
            style={{ background: 'var(--bg-secondary)' }}
          >
            {resolvingBlockers ? 'resolving blockers...' : 'resolve blockers'}
          </button>
          <a href="/" className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--bg-secondary)' }}>
            back to app
          </a>
          <a href="/blueprint" className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--bg-secondary)' }}>
            blueprint
          </a>
        </div>
        <label className="inline-flex items-center gap-2 text-xs opacity-80">
          <input
            type="checkbox"
            checked={includeChannels}
            onChange={(e) => setIncludeChannels(e.target.checked)}
          />
          include channels in run/stabilize
        </label>

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
            <div className="text-xs opacity-60">
              stale editor msgs {machine?.rlaifLoop?.staleUndeliveredEditorMessages || 0}
            </div>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}>
            <div className="text-xs opacity-60">constitution loop</div>
            <div className="text-sm">
              {machine?.constitutionLoop?.hasConstitution ? `v${machine?.constitutionLoop?.version}` : 'missing'} · ready {machine?.constitutionLoop?.refreshReady ? 'yes' : 'no'}
            </div>
            <div className="text-xs opacity-60">
              pairs {machine?.constitutionLoop?.qualityPairsAll || 0} · new {machine?.constitutionLoop?.newPairsSinceLast ?? '-'}
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
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}>
            <div className="text-xs opacity-60">channel loop</div>
            <div className="text-sm">
              active bindings {machine?.channelLoop?.activeBindings || 0}
            </div>
            <div className="text-xs opacity-60">
              paused {machine?.channelLoop?.pausedBindings || 0} ·
            </div>
            <div className="text-xs opacity-60">
              failed {machine?.channelLoop?.failedOutbound || 0} · dead-letter {machine?.channelLoop?.deadLetterOutbound || 0}
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
