'use client';

import { useEffect, useState } from 'react';

interface VoiceBootstrapProgressProps {
  userId: string;
}

interface VoiceBootstrapJob {
  id: string;
  status: string;
  totalItems: number;
  processedItems: number;
  progress: number;
}

export default function VoiceBootstrapProgress({ userId }: VoiceBootstrapProgressProps) {
  const [job, setJob] = useState<VoiceBootstrapJob | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    const pollStatus = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/voice-bootstrap?userId=${userId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;
        setJob(data.hasJob ? data.job : null);
      } catch {
        // Silently ignore polling errors.
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [userId]);

  if (!job || (!loading && job.status === 'completed')) return null;

  return (
    <div className="mt-2 px-1">
      <div className="text-[0.7rem] italic" style={{ color: 'var(--text-subtle)' }}>
        voice bootstrap · {job.status} · {job.processedItems}/{job.totalItems} · {job.progress}%
      </div>
    </div>
  );
}
