'use client';

import { useEffect, useState } from 'react';

export default function SystemPage() {
  const [userId, setUserId] = useState('');
  const [configText, setConfigText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem('alexandria_user_id') || '';
    setUserId(id);
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      try {
        const res = await fetch(`/api/system-config?userId=${userId}`);
        if (!res.ok) return;
        const data = await res.json();
        setConfigText(JSON.stringify(data.config, null, 2));
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
    } catch {
      setStatus('invalid JSON');
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(null), 2500);
    }
  };

  return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="mx-auto max-w-4xl space-y-4">
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
              {status && <span className="text-sm opacity-70">{status}</span>}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
