'use client';

import { useEffect, useState } from 'react';

interface ChannelMessage {
  id: string;
  channel: string;
  direction: 'inbound' | 'outbound';
  external_contact_id: string;
  status: 'queued' | 'processing' | 'sent' | 'failed' | 'acked';
  created_at: string;
  content: string;
  metadata?: {
    deadLetter?: boolean;
    retryAttempts?: number;
    diagnostics?: {
      provider?: string;
      statusCode?: number;
      latencyMs?: number;
      responsePreview?: string;
    };
  };
}

interface ChannelBinding {
  id: string;
  user_id: string;
  channel: string;
  external_contact_id: string;
  privacy_mode: 'private' | 'personal' | 'professional';
  audience: 'author' | 'external';
  is_active: boolean;
  max_messages_per_flush: number;
  min_interval_seconds: number;
  paused_until: string | null;
}

interface ChannelAuditItem {
  id: string;
  action_type: string;
  summary: string;
  created_at: string;
}

export default function ChannelsPage() {
  const [userId, setUserId] = useState('');
  const [items, setItems] = useState<ChannelMessage[]>([]);
  const [bindings, setBindings] = useState<ChannelBinding[]>([]);
  const [audit, setAudit] = useState<ChannelAuditItem[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    byStatus: Record<string, number>;
    byDirection: Record<string, number>;
    retryBacklog: number;
    deadLetter: number;
    byChannel: Record<string, { sent: number; failed: number; total: number; avgLatencyMs: number | null }>;
  } | null>(null);
  const [security, setSecurity] = useState<{
    score: number;
    maxScore: number;
    readiness: string;
    status: Record<string, boolean>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [newChannel, setNewChannel] = useState('web');
  const [newExternalContactId, setNewExternalContactId] = useState('');
  const [newPrivacyMode, setNewPrivacyMode] = useState<'private' | 'personal' | 'professional'>('professional');
  const [newAudience, setNewAudience] = useState<'author' | 'external'>('external');
  const [newMaxPerFlush, setNewMaxPerFlush] = useState(5);
  const [newMinIntervalSeconds, setNewMinIntervalSeconds] = useState(0);
  const [runningRetry, setRunningRetry] = useState(false);
  const [runningDeadLetterRequeue, setRunningDeadLetterRequeue] = useState(false);
  const [requeueingIds, setRequeueingIds] = useState<Set<string>>(new Set());

  const reload = async (id: string) => {
    const [messagesRes, statsRes, bindingsRes] = await Promise.all([
      fetch(`/api/channels/messages?userId=${id}&limit=100`),
      fetch(`/api/channels/stats?userId=${id}`),
      fetch(`/api/channels/bindings?userId=${id}`)
    ]);
    const auditRes = await fetch(`/api/channels/audit?userId=${id}&limit=20`);
    const securityRes = await fetch('/api/channels/security');
    if (messagesRes.ok) {
      const data = await messagesRes.json();
      setItems(data.items || []);
    }
    if (statsRes.ok) {
      const data = await statsRes.json();
      setStats(data);
    }
    if (bindingsRes.ok) {
      const data = await bindingsRes.json();
      setBindings(data.items || []);
    }
    if (auditRes.ok) {
      const data = await auditRes.json();
      setAudit(data.items || []);
    }
    if (securityRes.ok) {
      const data = await securityRes.json();
      setSecurity(data);
    }
  };

  useEffect(() => {
    setUserId(localStorage.getItem('alexandria_user_id') || '');
  }, []);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        await reload(userId);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [userId]);

  const createBinding = async () => {
    if (!userId || !newExternalContactId.trim()) return;
    await fetch('/api/channels/bindings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        channel: newChannel,
        externalContactId: newExternalContactId.trim(),
        privacyMode: newPrivacyMode,
        audience: newAudience,
        maxMessagesPerFlush: newMaxPerFlush,
        minIntervalSeconds: newMinIntervalSeconds,
        isActive: true
      })
    });
    setNewExternalContactId('');
    await reload(userId);
  };

  const toggleBinding = async (binding: ChannelBinding) => {
    await fetch('/api/channels/bindings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: binding.user_id,
        channel: binding.channel,
        externalContactId: binding.external_contact_id,
        privacyMode: binding.privacy_mode,
        audience: binding.audience,
        maxMessagesPerFlush: binding.max_messages_per_flush,
        minIntervalSeconds: binding.min_interval_seconds,
        pausedUntil: binding.paused_until,
        isActive: !binding.is_active
      })
    });
    await reload(userId);
  };

  const pauseBinding = async (binding: ChannelBinding, minutes: number) => {
    await fetch('/api/channels/bindings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: binding.user_id,
        channel: binding.channel,
        externalContactId: binding.external_contact_id,
        privacyMode: binding.privacy_mode,
        audience: binding.audience,
        maxMessagesPerFlush: binding.max_messages_per_flush,
        minIntervalSeconds: binding.min_interval_seconds,
        pausedUntil: new Date(Date.now() + minutes * 60_000).toISOString(),
        isActive: binding.is_active
      })
    });
    await reload(userId);
  };

  const clearPause = async (binding: ChannelBinding) => {
    await fetch('/api/channels/bindings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: binding.user_id,
        channel: binding.channel,
        externalContactId: binding.external_contact_id,
        privacyMode: binding.privacy_mode,
        audience: binding.audience,
        maxMessagesPerFlush: binding.max_messages_per_flush,
        minIntervalSeconds: binding.min_interval_seconds,
        pausedUntil: null,
        isActive: binding.is_active
      })
    });
    await reload(userId);
  };

  const deleteBinding = async (binding: ChannelBinding) => {
    await fetch('/api/channels/bindings', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: binding.channel,
        externalContactId: binding.external_contact_id
      })
    });
    await reload(userId);
  };

  const runRetry = async () => {
    setRunningRetry(true);
    try {
      await fetch('/api/cron/channel-retry', { method: 'POST' });
      await reload(userId);
    } finally {
      setRunningRetry(false);
    }
  };

  const runDeadLetterRequeue = async () => {
    if (!userId) return;
    setRunningDeadLetterRequeue(true);
    try {
      await fetch('/api/channels/dead-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, limit: 100 })
      });
      await reload(userId);
    } finally {
      setRunningDeadLetterRequeue(false);
    }
  };

  const requeueMessage = async (id: string) => {
    if (!userId) return;
    setRequeueingIds((prev) => new Set(prev).add(id));
    try {
      await fetch('/api/channels/requeue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ids: [id] })
      });
      await reload(userId);
    } finally {
      setRequeueingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="mx-auto max-w-5xl space-y-4">
        <h1 className="text-2xl">Channels</h1>
        <p className="text-sm opacity-70">durable channel message lifecycle</p>

        {loading ? (
          <div className="text-sm opacity-70">loading...</div>
        ) : (
          <>
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="text-xs opacity-60">total</div>
                  <div className="text-sm">{stats.total}</div>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="text-xs opacity-60">sent</div>
                  <div className="text-sm">{stats.byStatus.sent || 0}</div>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="text-xs opacity-60">failed</div>
                  <div className="text-sm">{stats.byStatus.failed || 0}</div>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="text-xs opacity-60">retry backlog</div>
                  <div className="text-sm">{stats.retryBacklog || 0}</div>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="text-xs opacity-60">dead-letter</div>
                  <div className="text-sm">{stats.deadLetter || 0}</div>
                </div>
              </div>
            )}
            {security && (
              <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-xs opacity-60">security posture</div>
                <div className="text-sm">{security.readiness} ({security.score}/{security.maxScore})</div>
                <div className="mt-1 text-xs opacity-70">
                  {Object.entries(security.status).map(([k, v]) => `${k}:${v ? 'on' : 'off'}`).join(' · ')}
                </div>
              </div>
            )}
            {stats && (
              <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-xs opacity-60 mb-1">by channel</div>
                <div className="space-y-1">
                  {Object.entries(stats.byChannel || {}).map(([channel, values]) => (
                    <div key={channel} className="text-xs opacity-80">
                      {channel} · total {values.total} · sent {values.sent} · failed {values.failed}
                      {values.avgLatencyMs !== null ? ` · avg latency ${values.avgLatencyMs}ms` : ''}
                    </div>
                  ))}
                  {Object.keys(stats.byChannel || {}).length === 0 && (
                    <div className="text-xs opacity-60">none</div>
                  )}
                </div>
              </div>
            )}
            <div>
              <button
                onClick={runRetry}
                disabled={runningRetry}
                className="rounded px-3 py-1 text-xs disabled:opacity-50"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              >
                {runningRetry ? 'running retry...' : 'run retry worker'}
              </button>
              <button
                onClick={runDeadLetterRequeue}
                disabled={runningDeadLetterRequeue}
                className="rounded px-3 py-1 text-xs disabled:opacity-50 ml-2"
                style={{ background: 'var(--bg-primary)', color: 'var(--text-subtle)' }}
              >
                {runningDeadLetterRequeue ? 'requeueing dead-letter...' : 'requeue dead-letter'}
              </button>
            </div>

            <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg-secondary)' }}>
              <div className="text-sm">contact bindings</div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value)}
                  className="rounded px-2 py-1 text-xs"
                  style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  placeholder="channel"
                />
                <input
                  value={newExternalContactId}
                  onChange={(e) => setNewExternalContactId(e.target.value)}
                  className="rounded px-2 py-1 text-xs min-w-[220px]"
                  style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  placeholder="external_contact_id"
                />
                <select
                  value={newPrivacyMode}
                  onChange={(e) => setNewPrivacyMode(e.target.value as 'private' | 'personal' | 'professional')}
                  className="rounded px-2 py-1 text-xs"
                  style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  <option value="private">private</option>
                  <option value="personal">personal</option>
                  <option value="professional">professional</option>
                </select>
                <select
                  value={newAudience}
                  onChange={(e) => setNewAudience(e.target.value as 'author' | 'external')}
                  className="rounded px-2 py-1 text-xs"
                  style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  <option value="external">external</option>
                  <option value="author">author</option>
                </select>
                <input
                  type="number"
                  value={newMaxPerFlush}
                  min={1}
                  max={100}
                  onChange={(e) => setNewMaxPerFlush(Number(e.target.value || 5))}
                  className="rounded px-2 py-1 text-xs w-[90px]"
                  style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  placeholder="max/flush"
                />
                <input
                  type="number"
                  value={newMinIntervalSeconds}
                  min={0}
                  max={86400}
                  onChange={(e) => setNewMinIntervalSeconds(Number(e.target.value || 0))}
                  className="rounded px-2 py-1 text-xs w-[110px]"
                  style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  placeholder="min interval s"
                />
                <button
                  onClick={createBinding}
                  className="rounded px-3 py-1 text-xs"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  add binding
                </button>
              </div>
              <div className="space-y-2">
                {bindings.length === 0 && <div className="text-xs opacity-60">no bindings yet</div>}
                {bindings.map((row) => (
                  <div key={row.id} className="text-xs flex items-center justify-between gap-3">
                    <span>
                      {row.channel} · {row.external_contact_id} · {row.privacy_mode} · {row.audience} · {row.is_active ? 'active' : 'inactive'}
                      {` · max/flush ${row.max_messages_per_flush} · min interval ${row.min_interval_seconds}s`}
                      {row.paused_until ? ` · paused until ${new Date(row.paused_until).toLocaleString()}` : ''}
                    </span>
                    <span className="flex gap-2">
                      <button
                        onClick={() => toggleBinding(row)}
                        className="rounded px-2 py-0.5"
                        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                      >
                        {row.is_active ? 'deactivate' : 'activate'}
                      </button>
                      <button
                        onClick={() => deleteBinding(row)}
                        className="rounded px-2 py-0.5"
                        style={{ background: 'var(--bg-primary)', color: 'var(--text-subtle)' }}
                      >
                        delete
                      </button>
                      {!row.paused_until ? (
                        <button
                          onClick={() => pauseBinding(row, 15)}
                          className="rounded px-2 py-0.5"
                          style={{ background: 'var(--bg-primary)', color: 'var(--text-subtle)' }}
                        >
                          pause 15m
                        </button>
                      ) : (
                        <button
                          onClick={() => clearPause(row)}
                          className="rounded px-2 py-0.5"
                          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                        >
                          unpause
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-secondary)' }}>
              {items.length === 0 && <div className="text-xs opacity-60">none yet</div>}
              {items.map((row) => (
                <div key={row.id} className="text-xs border-b pb-2 last:border-0" style={{ borderColor: 'var(--border-light)' }}>
                  <div className="opacity-70">
                    {new Date(row.created_at).toLocaleString()} · {row.channel} · {row.direction} · {row.status}
                  </div>
                  <div className="opacity-60">contact: {row.external_contact_id}</div>
                  <div>{row.content.slice(0, 220)}</div>
                  {row.metadata?.diagnostics && (
                    <div className="mt-1 opacity-60">
                      provider: {row.metadata.diagnostics.provider || 'unknown'}
                      {typeof row.metadata.diagnostics.statusCode === 'number' ? ` · status: ${row.metadata.diagnostics.statusCode}` : ''}
                      {typeof row.metadata.diagnostics.latencyMs === 'number' ? ` · latency: ${row.metadata.diagnostics.latencyMs}ms` : ''}
                    </div>
                  )}
                  {(row.status === 'failed' || row.metadata?.deadLetter) && (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="opacity-60">retryAttempts: {Number(row.metadata?.retryAttempts || 0)}</span>
                      {row.metadata?.deadLetter && <span className="opacity-60">dead-letter</span>}
                      <button
                        onClick={() => requeueMessage(row.id)}
                        disabled={requeueingIds.has(row.id)}
                        className="rounded px-2 py-0.5 disabled:opacity-50"
                        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                      >
                        {requeueingIds.has(row.id) ? 'requeueing...' : 'requeue'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-secondary)' }}>
              <div className="text-sm">channel audit</div>
              {audit.length === 0 && <div className="text-xs opacity-60">none yet</div>}
              {audit.map((row) => (
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
