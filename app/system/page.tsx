'use client';

import { useEffect, useState } from 'react';

export default function SystemPage() {
  const [userId, setUserId] = useState('');
  const [configText, setConfigText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [checkpoints, setCheckpoints] = useState<Array<{ id: string; version_label: string; created_at: string }>>([]);
  const [creatingCheckpoint, setCreatingCheckpoint] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [activity, setActivity] = useState<Array<{ id: string; action_type: string; summary: string; created_at: string }>>([]);

  useEffect(() => {
    const id = localStorage.getItem('alexandria_user_id') || '';
    setUserId(id);
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      try {
        const [res, checkpointsRes] = await Promise.all([
          fetch(`/api/system-config?userId=${userId}`),
          fetch(`/api/system-config/checkpoints?userId=${userId}&limit=20`)
        ]);
        const activityRes = await fetch(`/api/system-config/activity?userId=${userId}&limit=15`);
        if (res.ok) {
          const data = await res.json();
          setConfigText(JSON.stringify(data.config, null, 2));
        }
        if (checkpointsRes.ok) {
          const data = await checkpointsRes.json();
          setCheckpoints(data.items || []);
        }
        if (activityRes.ok) {
          const data = await activityRes.json();
          setActivity(data.items || []);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [userId]);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    setStatus('saving...');
    try {
      const parsed = JSON.parse(configText);
      const res = await fetch('/api/system-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, config: parsed })
      });
      if (!res.ok) {
        const data = await res.json();
        setStatus(data.error || 'failed');
        return;
      }
      setStatus('saved');
      const checkpointsRes = await fetch(`/api/system-config/checkpoints?userId=${userId}&limit=20`);
      const activityRes = await fetch(`/api/system-config/activity?userId=${userId}&limit=15`);
      if (checkpointsRes.ok) {
        const data = await checkpointsRes.json();
        setCheckpoints(data.items || []);
      }
      if (activityRes.ok) {
        const data = await activityRes.json();
        setActivity(data.items || []);
      }
    } catch {
      setStatus('invalid JSON');
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(null), 2500);
    }
  };

  const createCheckpoint = async () => {
    if (!userId) return;
    setCreatingCheckpoint(true);
    try {
      const res = await fetch('/api/system-config/checkpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (!res.ok) {
        const data = await res.json();
        setStatus(data.error || 'checkpoint failed');
        return;
      }
      setStatus('checkpoint created');
      const checkpointsRes = await fetch(`/api/system-config/checkpoints?userId=${userId}&limit=20`);
      const activityRes = await fetch(`/api/system-config/activity?userId=${userId}&limit=15`);
      if (checkpointsRes.ok) {
        const data = await checkpointsRes.json();
        setCheckpoints(data.items || []);
      }
      if (activityRes.ok) {
        const data = await activityRes.json();
        setActivity(data.items || []);
      }
    } finally {
      setCreatingCheckpoint(false);
      setTimeout(() => setStatus(null), 2500);
    }
  };

  const restoreCheckpoint = async (checkpointId: string) => {
    if (!userId) return;
    setRestoringId(checkpointId);
    try {
      const res = await fetch('/api/system-config/checkpoints', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, checkpointId })
      });
      if (!res.ok) {
        const data = await res.json();
        setStatus(data.error || 'restore failed');
        return;
      }
      setStatus('restored');
      const [configRes, checkpointsRes] = await Promise.all([
        fetch(`/api/system-config?userId=${userId}`),
        fetch(`/api/system-config/checkpoints?userId=${userId}&limit=20`)
      ]);
      const activityRes = await fetch(`/api/system-config/activity?userId=${userId}&limit=15`);
      if (configRes.ok) {
        const data = await configRes.json();
        setConfigText(JSON.stringify(data.config, null, 2));
      }
      if (checkpointsRes.ok) {
        const data = await checkpointsRes.json();
        setCheckpoints(data.items || []);
      }
      if (activityRes.ok) {
        const data = await activityRes.json();
        setActivity(data.items || []);
      }
    } finally {
      setRestoringId(null);
      setTimeout(() => setStatus(null), 2500);
    }
  };

  return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="mx-auto max-w-4xl space-y-4">
        <a href="/" className="inline-flex items-center gap-1 text-sm opacity-60 hover:opacity-100 transition-opacity mb-2" style={{ color: 'var(--text-primary)' }}>
          ← home
        </a>
        <h1 className="text-2xl">System Config</h1>
        <p className="text-sm opacity-70">default + selected blueprint config</p>

        {loading ? (
          <div className="rounded-xl p-4 text-sm opacity-70" style={{ background: 'var(--bg-secondary)' }}>
            loading config...
          </div>
        ) : (
          <>
            <textarea
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              className="w-full min-h-[540px] rounded-xl p-4 text-xs font-mono outline-none"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            />
            <div className="flex items-center gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              >
                save
              </button>
              <button
                onClick={createCheckpoint}
                disabled={creatingCheckpoint}
                className="px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                style={{ background: 'var(--bg-primary)', color: 'var(--text-subtle)' }}
              >
                {creatingCheckpoint ? 'creating checkpoint...' : 'create checkpoint'}
              </button>
              {status && <span className="text-sm opacity-70">{status}</span>}
            </div>
            <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-secondary)' }}>
              <div className="text-sm">checkpoints</div>
              {checkpoints.length === 0 && <div className="text-xs opacity-60">none yet</div>}
              {checkpoints.map((row) => (
                <div key={row.id} className="text-xs flex items-center justify-between gap-3">
                  <span>{new Date(row.created_at).toLocaleString()} · {row.version_label}</span>
                  <button
                    onClick={() => restoreCheckpoint(row.id)}
                    disabled={restoringId === row.id}
                    className="rounded px-2 py-1 disabled:opacity-50"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  >
                    {restoringId === row.id ? 'restoring...' : 'restore'}
                  </button>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-secondary)' }}>
              <div className="text-sm">system activity</div>
              {activity.length === 0 && <div className="text-xs opacity-60">none yet</div>}
              {activity.map((row) => (
                <div key={row.id} className="text-xs">
                  {new Date(row.created_at).toLocaleString()} · {row.action_type} · {row.summary}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
