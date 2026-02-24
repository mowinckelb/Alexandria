'use client';

import { useEffect, useState } from 'react';

type ProposalStatus = 'queued' | 'reviewing' | 'accepted' | 'rejected' | 'applied';
type ProposalType = 'config' | 'prompt' | 'policy' | 'code';
type ImpactLevel = 'low' | 'medium' | 'high';

interface ProposalItem {
  id: string;
  title: string;
  rationale: string;
  proposal_type: ProposalType;
  impact_level: ImpactLevel;
  status: ProposalStatus;
  source: string;
  created_at: string;
  updated_at: string;
}

export default function BlueprintPage() {
  const [userId, setUserId] = useState('');
  const [items, setItems] = useState<ProposalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>('');

  const [title, setTitle] = useState('');
  const [rationale, setRationale] = useState('');
  const [proposalType, setProposalType] = useState<ProposalType>('config');
  const [impactLevel, setImpactLevel] = useState<ImpactLevel>('medium');

  const loadItems = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/blueprint/proposals?userId=${id}&limit=100`);
      const data = await res.json();
      setItems(data.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = localStorage.getItem('alexandria_user_id') || '';
    setUserId(id);
    if (id) void loadItems(id);
  }, []);

  const createProposal = async () => {
    if (!userId || !title.trim() || !rationale.trim()) return;
    setSaving(true);
    setStatus('');
    try {
      const res = await fetch('/api/blueprint/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          proposalType,
          title: title.trim(),
          rationale: rationale.trim(),
          impactLevel,
          source: 'manual'
        })
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setStatus(data?.error || 'failed');
        return;
      }
      setTitle('');
      setRationale('');
      setStatus('proposal queued');
      await loadItems(userId);
    } catch {
      setStatus('failed');
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(''), 3000);
    }
  };

  const updateStatus = async (id: string, nextStatus: ProposalStatus) => {
    if (!userId) return;
    setSaving(true);
    setStatus('');
    try {
      const res = await fetch('/api/blueprint/proposals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          userId,
          status: nextStatus
        })
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setStatus(data?.error || 'failed');
        return;
      }
      await loadItems(userId);
      setStatus(`updated: ${nextStatus}`);
    } catch {
      setStatus('failed');
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(''), 2500);
    }
  };

  if (!userId) {
    return (
      <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <div className="mx-auto max-w-4xl">
          <a href="/" className="inline-flex items-center gap-1 text-sm opacity-60 hover:opacity-100 transition-opacity mb-2" style={{ color: 'var(--text-primary)' }}>
            ← home
          </a>
          <div className="rounded-xl p-4 text-sm" style={{ background: 'var(--bg-secondary)' }}>
            sign in first, then open this page again.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="mx-auto max-w-5xl space-y-4">
        <a href="/" className="inline-flex items-center gap-1 text-sm opacity-60 hover:opacity-100 transition-opacity mb-2" style={{ color: 'var(--text-primary)' }}>
          ← home
        </a>
        <h1 className="text-2xl">Blueprint</h1>
        <p className="text-sm opacity-70">engine-to-blueprint proposal valve for machine refinement.</p>

        <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg-secondary)' }}>
          <div className="text-sm">new proposal</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="title"
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          />
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="rationale"
            className="w-full min-h-[110px] rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          />
          <div className="flex flex-wrap gap-2">
            <select
              value={proposalType}
              onChange={(e) => setProposalType(e.target.value as ProposalType)}
              className="rounded-lg px-3 py-2 text-sm"
              style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            >
              <option value="config">config</option>
              <option value="prompt">prompt</option>
              <option value="policy">policy</option>
              <option value="code">code</option>
            </select>
            <select
              value={impactLevel}
              onChange={(e) => setImpactLevel(e.target.value as ImpactLevel)}
              className="rounded-lg px-3 py-2 text-sm"
              style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
            <button
              onClick={createProposal}
              disabled={saving}
              className="rounded-lg px-3 py-2 text-sm disabled:opacity-50"
              style={{ background: 'var(--bg-primary)' }}
            >
              {saving ? 'saving...' : 'queue proposal'}
            </button>
            <button
              onClick={() => loadItems(userId)}
              disabled={loading}
              className="rounded-lg px-3 py-2 text-sm disabled:opacity-50"
              style={{ background: 'var(--bg-primary)' }}
            >
              {loading ? 'refreshing...' : 'refresh'}
            </button>
            <a className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--bg-primary)' }} href="/">
              back to app
            </a>
          </div>
          {status && <div className="text-xs opacity-70">{status}</div>}
        </div>

        <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-secondary)' }}>
          <div className="text-sm">proposals</div>
          {items.length === 0 && <div className="text-xs opacity-60">none yet</div>}
          {items.map((item) => (
            <div key={item.id} className="rounded-lg p-3 space-y-2" style={{ background: 'var(--bg-primary)' }}>
              <div className="text-sm">{item.title}</div>
              <div className="text-xs opacity-70">{item.rationale}</div>
              <div className="text-xs opacity-60">
                {item.proposal_type} · {item.impact_level} · {item.status} · {item.source}
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => updateStatus(item.id, 'reviewing')} className="rounded px-2 py-1 text-xs" style={{ background: 'var(--bg-secondary)' }}>
                  reviewing
                </button>
                <button onClick={() => updateStatus(item.id, 'accepted')} className="rounded px-2 py-1 text-xs" style={{ background: 'var(--bg-secondary)' }}>
                  accept
                </button>
                <button onClick={() => updateStatus(item.id, 'rejected')} className="rounded px-2 py-1 text-xs" style={{ background: 'var(--bg-secondary)' }}>
                  reject
                </button>
                <button onClick={() => updateStatus(item.id, 'applied')} className="rounded px-2 py-1 text-xs" style={{ background: 'var(--bg-secondary)' }}>
                  applied
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
