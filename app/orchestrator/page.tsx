'use client';

import { useEffect, useState } from 'react';

export default function OrchestratorDebugPage() {
  const [userId, setUserId] = useState('');
  const [query, setQuery] = useState('How should I frame this project for an investor update?');
  const [privacyMode, setPrivacyMode] = useState<'private' | 'personal' | 'professional'>('professional');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUserId(localStorage.getItem('alexandria_user_id') || '');
  }, []);

  const preview = async () => {
    if (!userId || !query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/orchestrator/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, query: query.trim(), privacyMode })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'request failed');
        return;
      }
      setResult(data.preview);
    } catch {
      setError('request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="mx-auto max-w-4xl space-y-4">
        <a href="/" className="inline-flex items-center gap-1 text-sm opacity-60 hover:opacity-100 transition-opacity mb-2" style={{ color: 'var(--text-primary)' }}>
          ← home
        </a>
        <h1 className="text-2xl">Orchestrator Preview</h1>
        <p className="text-sm opacity-70">inspect query classification, privacy mode, and weighting context</p>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full min-h-[120px] rounded-xl p-3 text-sm outline-none"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        />
        <div className="flex items-center gap-2">
          <select
            value={privacyMode}
            onChange={(e) => setPrivacyMode(e.target.value as 'private' | 'personal' | 'professional')}
            className="rounded px-3 py-2 text-sm"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            <option value="private">private</option>
            <option value="personal">personal</option>
            <option value="professional">professional</option>
          </select>
          <button
            onClick={preview}
            disabled={loading}
            className="rounded px-4 py-2 text-sm disabled:opacity-50"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            {loading ? 'running...' : 'preview'}
          </button>
        </div>
        {error && <div className="text-sm text-red-400">{error}</div>}
        <pre
          className="rounded-xl p-3 text-xs overflow-x-auto"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        >
          {result ? JSON.stringify(result, null, 2) : 'run preview to inspect context'}
        </pre>
      </div>
    </main>
  );
}
