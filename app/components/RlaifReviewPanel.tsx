'use client';

import { useEffect, useState } from 'react';

interface ReviewItem {
  id: string;
  prompt: string;
  plm_response: string;
  constitution_section: string;
  overall_confidence: number;
  routing: 'author_review' | 'flagged' | 'auto_approved';
  scores?: {
    values_alignment?: number;
    model_usage?: number;
    heuristic_following?: number;
    style_match?: number;
  };
  created_at: string;
}

interface RlaifReviewPanelProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onReviewed?: () => void;
}

export default function RlaifReviewPanel({ userId, isOpen, onClose, onReviewed }: RlaifReviewPanelProps) {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !userId) return;
    void loadQueue();
  }, [isOpen, userId]);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rlaif/review?userId=${userId}&limit=20`);
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items || []);
    } finally {
      setLoading(false);
    }
  };

  const submitVerdict = async (evaluationId: string, verdict: 'approved' | 'rejected') => {
    setSubmittingId(evaluationId);
    try {
      const res = await fetch('/api/rlaif/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          evaluationId,
          verdict
        })
      });
      if (!res.ok) return;
      setItems((prev) => prev.filter((item) => item.id !== evaluationId));
      onReviewed?.();
    } finally {
      setSubmittingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'var(--bg-overlay)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl p-6 w-[95%] max-w-[760px] max-h-[85vh] flex flex-col shadow-xl"
        style={{ background: 'var(--bg-modal)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
            RLAIF Review Queue
          </h2>
          <button
            onClick={onClose}
            className="text-xl cursor-pointer hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-subtle)' }}
          >
            ×
          </button>
        </div>

        <div className="text-xs mb-3" style={{ color: 'var(--text-subtle)' }}>
          Author-review and flagged evaluations waiting for author validation.
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
          {loading && (
            <div className="text-sm opacity-60" style={{ color: 'var(--text-primary)' }}>
              loading...
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="text-sm opacity-60" style={{ color: 'var(--text-primary)' }}>
              no pending items.
            </div>
          )}

          {items.map((item) => (
            <div key={item.id} className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)' }}>
              <div className="text-xs mb-2" style={{ color: 'var(--text-subtle)' }}>
                section: {item.constitution_section} · routing: {item.routing} · confidence: {(item.overall_confidence || 0).toFixed(2)}
              </div>
              {item.scores && (
                <div className="text-xs mb-2 opacity-70" style={{ color: 'var(--text-subtle)' }}>
                  values {Number(item.scores.values_alignment || 0).toFixed(2)} · models {Number(item.scores.model_usage || 0).toFixed(2)} · heuristics {Number(item.scores.heuristic_following || 0).toFixed(2)} · style {Number(item.scores.style_match || 0).toFixed(2)}
                </div>
              )}
              <div className="text-sm mb-2" style={{ color: 'var(--text-primary)' }}>
                <span className="opacity-70">prompt:</span> {item.prompt}
              </div>
              <div className="text-sm mb-3 whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                <span className="opacity-70">response:</span> {item.plm_response}
              </div>
              <div className="flex gap-2">
                <button
                  disabled={submittingId === item.id}
                  onClick={() => submitVerdict(item.id, 'approved')}
                  className="text-xs px-3 py-1 rounded cursor-pointer disabled:opacity-50"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  approve
                </button>
                <button
                  disabled={submittingId === item.id}
                  onClick={() => submitVerdict(item.id, 'rejected')}
                  className="text-xs px-3 py-1 rounded cursor-pointer disabled:opacity-50"
                  style={{ background: 'var(--bg-primary)', color: 'var(--text-subtle)' }}
                >
                  reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
