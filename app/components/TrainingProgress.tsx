'use client';
import { useState, useEffect, useRef } from 'react';

interface TrainingStats {
  available: number;
  ready: boolean;
  thresholds: { minimum: number; optimal: number };
}

interface TrainingProgressProps {
  userId: string;
}

export default function TrainingProgress({ userId }: TrainingProgressProps) {
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [isTuning, setIsTuning] = useState(false);
  const trainRef = useRef<HTMLButtonElement>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/training?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to fetch training stats:', e);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const shake = () => {
    const btn = trainRef.current;
    if (btn) {
      btn.classList.add('animate-shake');
      setTimeout(() => btn.classList.remove('animate-shake'), 500);
    }
  };

  const handleTrain = async () => {
    if (!stats?.ready) {
      shake();
      return;
    }
    
    if (isTuning) return;
    
    setIsTuning(true);
    
    try {
      // Export with batch creation
      const exportRes = await fetch('/api/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          minQuality: 0.4, 
          createExport: true 
        })
      });
      
      if (!exportRes.ok) throw new Error('Export failed');
      
      const exportData = await exportRes.json();
      console.log(`Exported ${exportData.count} pairs, export_id: ${exportData.export_id}`);
      
      // TODO: Upload JSONL to Together AI and start training job
      // For now, refresh stats to show pairs are now exported
      await fetchStats();
      
    } catch (e) {
      console.error('Training failed:', e);
      shake();
    } finally {
      setIsTuning(false);
    }
  };

  if (!stats) return null;

  // Calculate percentage: 100% = optimal (2000)
  // Threshold (100 pairs) = 5%
  const percent = Math.min(100, Math.round((stats.available / stats.thresholds.optimal) * 100));
  const isUnlocked = stats.ready;

  return (
    <div className="flex items-center gap-1.5 text-[0.75rem]">
      <span className="text-[#3a3a3a] opacity-60 tabular-nums">
        {percent}%
      </span>
      <span className="text-[#3a3a3a] opacity-30">·</span>
      <button
        ref={trainRef}
        onClick={handleTrain}
        disabled={isTuning}
        className={`bg-transparent border-none cursor-pointer transition-opacity ${
          isTuning 
            ? 'opacity-40 cursor-wait' 
            : isUnlocked 
              ? 'opacity-60 hover:opacity-100' 
              : 'opacity-25 cursor-default'
        }`}
      >
        {isTuning ? 'tuning...' : 'tune'}
      </button>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-1px); }
          75% { transform: translateX(1px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out;
        }
      `}</style>
    </div>
  );
}
