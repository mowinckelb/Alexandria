'use client';

import { useEffect, useState } from 'react';

interface ActivityItem {
  id: string;
  action_type: string;
  summary: string;
  created_at: string;
  requires_attention: boolean;
}

export default function ActivityPage() {
  const [userId, setUserId] = useState<string>('');
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem('alexandria_user_id') || '';
    setUserId(id);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/activity?userId=${userId}&limit=100`);
        if (!res.ok) return;
        const data = await res.json();
        setItems(data.items || []);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [userId]);

  return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="text-2xl">Activity</h1>
        <p className="text-sm opacity-70">persona timeline</p>

        {loading ? (
          <div className="rounded-xl p-4 text-sm opacity-70" style={{ background: 'var(--bg-secondary)' }}>
            loading activity...
          </div>
        ) : (
          <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-secondary)' }}>
            {items.length === 0 && <div className="text-sm opacity-60">no activity yet.</div>}
            {items.map((item) => (
              <div key={item.id} className="border-b pb-2 last:border-0" style={{ borderColor: 'var(--border-light)' }}>
                <div className="text-xs opacity-60">{new Date(item.created_at).toLocaleString()}</div>
                <div className="text-sm">{item.summary}</div>
                <div className="text-xs opacity-60">{item.action_type}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
