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
}

export default function ChannelsPage() {
  const [userId, setUserId] = useState('');
  const [items, setItems] = useState<ChannelMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUserId(localStorage.getItem('alexandria_user_id') || '');
  }, []);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/channels/messages?userId=${userId}&limit=100`);
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
      <div className="mx-auto max-w-5xl space-y-4">
        <h1 className="text-2xl">Channels</h1>
        <p className="text-sm opacity-70">durable channel message lifecycle</p>

        {loading ? (
          <div className="text-sm opacity-70">loading...</div>
        ) : (
          <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-secondary)' }}>
            {items.length === 0 && <div className="text-xs opacity-60">none yet</div>}
            {items.map((row) => (
              <div key={row.id} className="text-xs border-b pb-2 last:border-0" style={{ borderColor: 'var(--border-light)' }}>
                <div className="opacity-70">
                  {new Date(row.created_at).toLocaleString()} · {row.channel} · {row.direction} · {row.status}
                </div>
                <div className="opacity-60">contact: {row.external_contact_id}</div>
                <div>{row.content.slice(0, 220)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
