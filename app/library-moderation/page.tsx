'use client';

import { useEffect, useState } from 'react';

interface ModerationItem {
  id: string;
  summary: string;
  details: {
    reason?: string;
    notes?: string | null;
    reporterUserId?: string;
    moderationStatus?: string;
  };
  requires_attention: boolean;
  created_at: string;
  sla?: {
    ageHours: number;
    severity: 'resolved' | 'ok' | 'warning' | 'critical';
  };
}

export default function LibraryModerationPage() {
  const [userId, setUserId] = useState('');
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [sla, setSla] = useState<{
    warnHours: number;
    criticalHours: number;
    warningCount: number;
    criticalCount: number;
    oldestPendingHours: number;
  } | null>(null);
  const [alerts, setAlerts] = useState<Array<{ severity: 'warning' | 'critical'; message: string; activityId: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const reload = async (id: string) => {
    const res = await fetch(`/api/library/moderation?userId=${id}&limit=100`);
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.items || []);
    setPendingCount(data.pendingCount || 0);
    setSla(data.sla || null);
    setAlerts(data.alerts || []);
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

  const resolve = async (activityId: string, resolution: 'dismissed' | 'actioned') => {
    if (!userId) return;
    setResolvingId(activityId);
    try {
      await fetch('/api/library/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, activityId, resolution })
      });
      await reload(userId);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="text-2xl">Library Moderation</h1>
        <p className="text-sm opacity-70">pending reports: {pendingCount}</p>
        {sla && (
          <div className="text-xs opacity-70">
            SLA warn: {sla.warnHours}h · critical: {sla.criticalHours}h · warning: {sla.warningCount} · critical: {sla.criticalCount} · oldest pending: {sla.oldestPendingHours.toFixed(1)}h
          </div>
        )}
        {alerts.length > 0 && (
          <div className="rounded-xl p-3 space-y-1" style={{ background: 'var(--bg-secondary)' }}>
            <div className="text-sm">aging alerts</div>
            {alerts.map((alert) => (
              <div key={alert.activityId} className={`text-xs ${alert.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'}`}>
                {alert.severity.toUpperCase()}: {alert.message}
              </div>
            ))}
          </div>
        )}
        {loading ? (
          <div className="text-sm opacity-70">loading...</div>
        ) : (
          <div className="space-y-2">
            {items.length === 0 && <div className="text-sm opacity-70">no reports yet</div>}
            {items.map((row) => (
              <div key={row.id} className="rounded-xl p-3 space-y-1" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-xs opacity-70">{new Date(row.created_at).toLocaleString()}</div>
                <div className="text-sm">{row.summary}</div>
                <div className="text-xs opacity-70">
                  reason: {row.details?.reason || 'n/a'} · status: {row.requires_attention ? 'pending' : (row.details?.moderationStatus || 'resolved')}
                </div>
                {row.sla && (
                  <div className="text-xs opacity-70">
                    age: {row.sla.ageHours.toFixed(1)}h · severity: {row.sla.severity}
                  </div>
                )}
                {row.details?.notes && <div className="text-xs opacity-75">notes: {row.details.notes}</div>}
                {row.requires_attention && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => resolve(row.id, 'dismissed')}
                      disabled={resolvingId === row.id}
                      className="rounded px-2 py-1 text-xs disabled:opacity-50"
                      style={{ background: 'var(--bg-primary)', color: 'var(--text-subtle)' }}
                    >
                      dismiss
                    </button>
                    <button
                      onClick={() => resolve(row.id, 'actioned')}
                      disabled={resolvingId === row.id}
                      className="rounded px-2 py-1 text-xs disabled:opacity-50"
                      style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                    >
                      actioned
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
