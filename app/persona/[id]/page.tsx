'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface PersonaSummary {
  id: string;
  title: string;
  type: string;
  summary: {
    counts: {
      entries: number;
      memoryFragments: number;
      trainingPairs: number;
    };
    constitutionVersion: number | null;
    hasConstitution: boolean;
    hasWorldview: boolean;
    hasValues: boolean;
    readinessScore: number;
    trustBadges: string[];
    maturityScore: number;
    maturityUpdatedAt: string | null;
    moderationPendingCount: number;
    moderationOldestPendingHours: number;
    rankingScore: number;
    growth: {
      views7d: number;
      interactions7d: number;
      externalQueries7d: number;
    };
  };
}

export default function PersonaPage() {
  const params = useParams<{ id: string }>();
  const personaId = params?.id || '';
  const [userId, setUserId] = useState('');
  const [data, setData] = useState<PersonaSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportReason, setReportReason] = useState<'abuse' | 'impersonation' | 'privacy' | 'spam' | 'other'>('other');
  const [reportNotes, setReportNotes] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reportStatus, setReportStatus] = useState<string | null>(null);

  useEffect(() => {
    setUserId(localStorage.getItem('alexandria_user_id') || '');
  }, []);

  useEffect(() => {
    if (!personaId) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/library/${personaId}`);
        if (!res.ok) return;
        const json = await res.json();
        setData(json);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [personaId]);

  useEffect(() => {
    if (!personaId) return;
    const payload: {
      personaId: string;
      eventType: 'view';
      surface: 'persona_page';
      viewerUserId?: string;
    } = {
      personaId,
      eventType: 'view',
      surface: 'persona_page'
    };
    if (userId) payload.viewerUserId = userId;
    void fetch('/api/library/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }, [personaId, userId]);

  const submitReport = async () => {
    if (!userId || !personaId) {
      setReportStatus('set your user id first');
      return;
    }
    setReporting(true);
    setReportStatus('submitting...');
    try {
      const res = await fetch('/api/library/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterUserId: userId,
          personaId,
          reason: reportReason,
          notes: reportNotes.trim() || undefined
        })
      });
      const payload = await res.json();
      if (!res.ok) {
        setReportStatus(payload.error || 'report failed');
        return;
      }
      setReportNotes('');
      setReportStatus('report submitted');
      void fetch('/api/library/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId,
          viewerUserId: userId || undefined,
          eventType: 'interaction',
          surface: 'persona_page',
          metadata: { interactionType: 'report_submission' }
        })
      });
    } catch {
      setReportStatus('report failed');
    } finally {
      setReporting(false);
      setTimeout(() => setReportStatus(null), 3000);
    }
  };

  return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="mx-auto max-w-3xl">
        <a href="/" className="inline-flex items-center gap-1 text-sm opacity-60 hover:opacity-100 transition-opacity mb-2" style={{ color: 'var(--text-primary)' }}>
          ← home
        </a>
        <h1 className="text-2xl mb-2">{data?.title || `Persona ${personaId.slice(0, 8)}`}</h1>
        <p className="text-sm opacity-70 mb-8">Neo-Biography (early)</p>

        {loading ? (
          <div className="rounded-xl p-4 text-sm opacity-70" style={{ background: 'var(--bg-secondary)' }}>
            loading persona...
          </div>
        ) : (
          <>
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg-secondary)' }}>
              <div className="text-sm opacity-85">
                Constitution: {data?.summary.hasConstitution ? `v${data.summary.constitutionVersion}` : 'not extracted yet'}
              </div>
              <div className="text-sm opacity-75">
                Vault coverage: {data?.summary.counts.entries || 0} entries, {data?.summary.counts.memoryFragments || 0} indexed memories, {data?.summary.counts.trainingPairs || 0} training pairs
              </div>
              <div className="text-xs opacity-60">
                API access endpoint: <code>/api/persona/query</code> with <code>x-api-key</code>.
              </div>
              <div className="text-xs opacity-70">
                readiness: {Number(data?.summary.readinessScore || 0)} / 100 · maturity: {Number(data?.summary.maturityScore || 0).toFixed(3)}
                {Number(data?.summary.moderationPendingCount || 0) > 0 ? ` · pending moderation: ${data?.summary.moderationPendingCount}` : ''}
                {Number(data?.summary.moderationOldestPendingHours || 0) > 0 ? ` · oldest pending: ${Number(data?.summary.moderationOldestPendingHours || 0).toFixed(1)}h` : ''}
              </div>
              <div className="text-xs opacity-60">
                rank: {Number(data?.summary.rankingScore || 0).toFixed(2)} · 7d growth: {data?.summary.growth?.views7d || 0} views / {data?.summary.growth?.interactions7d || 0} interactions / {data?.summary.growth?.externalQueries7d || 0} external queries
              </div>
              {data?.summary.trustBadges?.length ? (
                <div className="text-xs opacity-60">badges: {data.summary.trustBadges.join(' · ')}</div>
              ) : null}
            </div>
            <div className="rounded-xl p-4 space-y-2 mt-3" style={{ background: 'var(--bg-secondary)' }}>
              <div className="text-sm">report persona</div>
              <div className="flex items-center gap-2">
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value as 'abuse' | 'impersonation' | 'privacy' | 'spam' | 'other')}
                  className="rounded px-2 py-1 text-xs"
                  style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  <option value="other">other</option>
                  <option value="abuse">abuse</option>
                  <option value="impersonation">impersonation</option>
                  <option value="privacy">privacy</option>
                  <option value="spam">spam</option>
                </select>
                <button
                  onClick={submitReport}
                  disabled={reporting}
                  className="rounded px-3 py-1 text-xs disabled:opacity-50"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  {reporting ? 'submitting...' : 'submit report'}
                </button>
              </div>
              <textarea
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                className="w-full min-h-[80px] rounded p-2 text-xs"
                style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                placeholder="optional notes"
              />
              {reportStatus && <div className="text-xs opacity-70">{reportStatus}</div>}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
