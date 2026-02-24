'use client';

import { useEffect, useMemo, useState } from 'react';

interface TrainingExport {
  id: string;
  status: string;
  pair_count: number;
  created_at: string;
  resulting_model_id?: string | null;
  training_job_id?: string | null;
}

interface TrainingSummary {
  total: number;
  available: number;
  high_quality: number;
  ready: boolean;
  tier: 'insufficient' | 'minimum' | 'good' | 'optimal';
  active_model: string;
  recent_exports: TrainingExport[];
  thresholds: {
    minimum: number;
    good: number;
    optimal: number;
  };
}

interface JobStatus {
  job_id: string;
  status: string;
  fine_tuned_model?: string;
  progress?: string | null;
  error?: string | null;
}

export default function TrainingPage() {
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<TrainingSummary | null>(null);
  const [activeJob, setActiveJob] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [starting, setStarting] = useState(false);
  const [activating, setActivating] = useState(false);
  const [message, setMessage] = useState('');

  const progressPct = useMemo(() => {
    if (!summary) return 0;
    const min = 50;
    const pct = Math.round((summary.available / min) * 100);
    return Math.max(0, Math.min(100, pct));
  }, [summary]);

  const loadSummary = async (id: string) => {
    const res = await fetch(`/api/training?userId=${id}`);
    if (!res.ok) {
      throw new Error(`failed to load training summary (${res.status})`);
    }
    const data = await res.json();
    setSummary(data);

    const inFlight = (data.recent_exports || []).find((item: TrainingExport) =>
      ['uploading', 'uploaded', 'queued', 'training'].includes(item.status)
    );
    if (inFlight?.training_job_id) {
      setActiveJob(inFlight.training_job_id);
    }
  };

  const loadJobStatus = async (jobId: string) => {
    const res = await fetch(`/api/training/job?jobId=${jobId}`);
    if (!res.ok) {
      throw new Error(`failed to load job status (${res.status})`);
    }
    const data = await res.json();
    setJobStatus(data);
  };

  useEffect(() => {
    const id = localStorage.getItem('alexandria_user_id') || '';
    setUserId(id);
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const run = async () => {
      try {
        await loadSummary(userId);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'failed to load data');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [userId]);

  useEffect(() => {
    if (!activeJob) return;

    const poll = async () => {
      try {
        await loadJobStatus(activeJob);
      } catch {
        // ignore transient polling errors
      }
    };

    void poll();
    const interval = setInterval(poll, 8000);
    return () => clearInterval(interval);
  }, [activeJob]);

  const startTraining = async () => {
    if (!userId || starting) return;
    setStarting(true);
    setMessage('');
    try {
      const res = await fetch('/api/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action: 'start',
          minQuality: 0.4
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `training start failed (${res.status})`);
      }

      setActiveJob(data.job_id);
      setMessage(`training started · job ${data.job_id}`);
      await loadSummary(userId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'failed to start training');
    } finally {
      setStarting(false);
    }
  };

  const activateModel = async () => {
    if (!jobStatus?.job_id || activating || jobStatus.status !== 'completed') return;
    setActivating(true);
    setMessage('');
    try {
      const res = await fetch('/api/training/job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'activate',
          jobId: jobStatus.job_id
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `activation failed (${res.status})`);
      }
      setMessage(`new model active: ${data.model_id}`);
      await loadSummary(userId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'failed to activate model');
    } finally {
      setActivating(false);
    }
  };

  return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="mx-auto max-w-4xl space-y-4">
        <a href="/" className="inline-flex items-center gap-1 text-sm opacity-60 hover:opacity-100 transition-opacity mb-2" style={{ color: 'var(--text-primary)' }}>
          ← home
        </a>
        <h1 className="text-2xl">Training</h1>
        <p className="text-sm opacity-70">observe pair growth, start training, and activate new models.</p>

        {!userId ? (
          <div className="rounded-xl p-4 text-sm opacity-70" style={{ background: 'var(--bg-secondary)' }}>
            not authenticated. sign in first.
          </div>
        ) : loading ? (
          <div className="rounded-xl p-4 text-sm opacity-70" style={{ background: 'var(--bg-secondary)' }}>
            loading training state...
          </div>
        ) : !summary ? (
          <div className="rounded-xl p-4 text-sm opacity-70" style={{ background: 'var(--bg-secondary)' }}>
            failed to load training state.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-xs opacity-60">available pairs</div>
                <div className="text-lg">{summary.available}</div>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-xs opacity-60">high quality</div>
                <div className="text-lg">{summary.high_quality}</div>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-xs opacity-60">total pairs</div>
                <div className="text-lg">{summary.total}</div>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-xs opacity-60">tier</div>
                <div className="text-lg">{summary.tier}</div>
              </div>
            </div>

            <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-secondary)' }}>
              <div className="text-sm">readiness</div>
              <div className="text-xs opacity-70">
                {summary.available} available pairs (minimum target for auto-training: 50)
              </div>
              <div className="h-2 rounded" style={{ background: 'var(--bg-primary)' }}>
                <div className="h-full rounded" style={{ width: `${progressPct}%`, background: 'var(--text-subtle)' }} />
              </div>
              <div className="text-xs opacity-70">active model: {summary.active_model}</div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={startTraining}
                  disabled={starting}
                  className="rounded px-3 py-1.5 text-sm disabled:opacity-50"
                  style={{ background: 'var(--bg-primary)' }}
                >
                  {starting ? 'starting...' : 'train now'}
                </button>
                <a className="rounded px-3 py-1.5 text-sm" style={{ background: 'var(--bg-primary)' }} href="/">
                  back to app
                </a>
              </div>
            </div>

            {jobStatus && (
              <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-sm">current job</div>
                <div className="text-xs opacity-70">job: {jobStatus.job_id}</div>
                <div className="text-xs opacity-70">status: {jobStatus.status}</div>
                {jobStatus.progress ? <div className="text-xs opacity-70">progress: {jobStatus.progress}</div> : null}
                {jobStatus.error ? <div className="text-xs text-red-400">error: {jobStatus.error}</div> : null}
                {jobStatus.fine_tuned_model ? (
                  <div className="text-xs opacity-70 break-all">model: {jobStatus.fine_tuned_model}</div>
                ) : null}
                {jobStatus.status === 'completed' && (
                  <button
                    onClick={activateModel}
                    disabled={activating}
                    className="rounded px-3 py-1.5 text-sm disabled:opacity-50"
                    style={{ background: 'var(--bg-primary)' }}
                  >
                    {activating ? 'activating...' : 'activate model'}
                  </button>
                )}
              </div>
            )}

            <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-secondary)' }}>
              <div className="text-sm">recent exports</div>
              <div className="space-y-2 text-xs opacity-80">
                {(summary.recent_exports || []).map((item) => (
                  <div key={item.id} className="rounded p-2" style={{ background: 'var(--bg-primary)' }}>
                    <div className="flex justify-between">
                      <span>{item.status}</span>
                      <span>{new Date(item.created_at).toLocaleString()}</span>
                    </div>
                    <div className="opacity-70">pairs: {item.pair_count}</div>
                    {item.training_job_id ? <div className="opacity-70 break-all">job: {item.training_job_id}</div> : null}
                    {item.resulting_model_id ? <div className="opacity-70 break-all">model: {item.resulting_model_id}</div> : null}
                  </div>
                ))}
                {summary.recent_exports.length === 0 ? <div className="opacity-60">no exports yet.</div> : null}
              </div>
            </div>

            {message ? (
              <div className="rounded-xl p-3 text-xs opacity-80" style={{ background: 'var(--bg-secondary)' }}>
                {message}
              </div>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
