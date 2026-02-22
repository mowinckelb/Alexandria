'use client';

import { useEffect, useState } from 'react';

interface BillingResponse {
  summary: {
    expenseTotalUsd: number;
    incomeTotalUsd: number;
    netUsd: number;
    usageCostUsd: number;
  };
  breakdown: {
    expenseByCategory: Record<string, number>;
    incomeByCategory: Record<string, number>;
  };
  usage: Array<{ cost: number; created_at: string; api_key_id: string }>;
  expenses: Array<{ id: string; category: string; amount_usd: number; created_at: string }>;
  income: Array<{ id: string; category: string; amount_usd: number; created_at: string }>;
}

interface GuardrailResponse {
  limits: {
    dailyApiKeySpendLimitUsd: number | null;
  };
  keys: Array<{
    id: string;
    name: string;
    spend24hUsd: number;
    lastUsed: string | null;
    utilizationPct: number | null;
  }>;
  alerts: Array<{
    severity: 'high' | 'medium';
    message: string;
    apiKeyId: string;
  }>;
}

export default function BillingPage() {
  const [userId, setUserId] = useState<string>('');
  const [data, setData] = useState<BillingResponse | null>(null);
  const [guardrails, setGuardrails] = useState<GuardrailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [disablingKeyIds, setDisablingKeyIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const id = localStorage.getItem('alexandria_user_id') || '';
    setUserId(id);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/billing?userId=${userId}&limit=50`);
        if (!res.ok) return;
        const [billingJson, guardrailsRes] = await Promise.all([
          res.json(),
          fetch(`/api/billing/guardrails?userId=${userId}`)
        ]);
        setData(billingJson);
        if (guardrailsRes.ok) {
          setGuardrails(await guardrailsRes.json());
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [userId]);

  const disableKey = async (id: string) => {
    if (!userId) return;
    setDisablingKeyIds((prev) => new Set(prev).add(id));
    try {
      await fetch('/api/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, id })
      });
      const [billingRes, guardrailsRes] = await Promise.all([
        fetch(`/api/billing?userId=${userId}&limit=50`),
        fetch(`/api/billing/guardrails?userId=${userId}`)
      ]);
      if (billingRes.ok) setData(await billingRes.json());
      if (guardrailsRes.ok) setGuardrails(await guardrailsRes.json());
    } finally {
      setDisablingKeyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="text-2xl">Billing</h1>
        <p className="text-sm opacity-70">expense tab + income tab</p>

        {loading ? (
          <div className="rounded-xl p-4 text-sm opacity-70" style={{ background: 'var(--bg-secondary)' }}>
            loading ledger...
          </div>
        ) : !data ? (
          <div className="rounded-xl p-4 text-sm opacity-70" style={{ background: 'var(--bg-secondary)' }}>
            no billing data yet.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-xs opacity-60">expenses</div>
                <div className="text-lg">${data.summary.expenseTotalUsd.toFixed(6)}</div>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-xs opacity-60">income</div>
                <div className="text-lg">${data.summary.incomeTotalUsd.toFixed(6)}</div>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-xs opacity-60">net</div>
                <div className="text-lg">${data.summary.netUsd.toFixed(6)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-sm mb-2">Expense Breakdown</div>
                <div className="space-y-2 text-xs opacity-80">
                  {Object.entries(data.breakdown?.expenseByCategory || {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span>{k}</span>
                      <span>${Number(v || 0).toFixed(6)}</span>
                    </div>
                  ))}
                  {Object.keys(data.breakdown?.expenseByCategory || {}).length === 0 && <div className="opacity-60">none</div>}
                </div>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-sm mb-2">Income Breakdown</div>
                <div className="space-y-2 text-xs opacity-80">
                  {Object.entries(data.breakdown?.incomeByCategory || {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span>{k}</span>
                      <span>${Number(v || 0).toFixed(6)}</span>
                    </div>
                  ))}
                  {Object.keys(data.breakdown?.incomeByCategory || {}).length === 0 && <div className="opacity-60">none</div>}
                </div>
              </div>
            </div>

            {guardrails && (
              <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-sm mb-1">Guardrails</div>
                <div className="text-xs opacity-70">
                  daily API key spend limit: {guardrails.limits.dailyApiKeySpendLimitUsd !== null ? `$${guardrails.limits.dailyApiKeySpendLimitUsd.toFixed(6)}` : 'disabled'}
                </div>
                {guardrails.alerts.length > 0 && (
                  <div className="space-y-1 text-xs">
                    {guardrails.alerts.map((alert, idx) => (
                      <div key={`${alert.apiKeyId}-${idx}`} className={alert.severity === 'high' ? 'text-red-400' : 'text-yellow-400'}>
                        {alert.severity.toUpperCase()}: {alert.message}
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-1 text-xs opacity-80 max-h-[220px] overflow-y-auto">
                  {guardrails.keys.map((row) => (
                    <div key={row.id} className="flex items-center justify-between gap-3">
                      <span>{row.name}</span>
                      <span className="flex items-center gap-2">
                        <span>${row.spend24hUsd.toFixed(6)}{row.utilizationPct !== null ? ` (${row.utilizationPct.toFixed(2)}%)` : ''}</span>
                        <button
                          onClick={() => disableKey(row.id)}
                          disabled={disablingKeyIds.has(row.id)}
                          className="rounded px-2 py-0.5 disabled:opacity-50"
                          style={{ background: 'var(--bg-primary)', color: 'var(--text-subtle)' }}
                        >
                          {disablingKeyIds.has(row.id) ? 'disabling...' : 'disable'}
                        </button>
                      </span>
                    </div>
                  ))}
                  {guardrails.keys.length === 0 && <div className="opacity-60">no api keys</div>}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-sm mb-2">Recent Expenses</div>
                <div className="space-y-2 text-xs opacity-80 max-h-[320px] overflow-y-auto">
                  {data.expenses.map((row) => (
                    <div key={row.id} className="flex justify-between">
                      <span>{row.category}</span>
                      <span>${Number(row.amount_usd || 0).toFixed(4)}</span>
                    </div>
                  ))}
                  {data.expenses.length === 0 && <div className="opacity-60">none</div>}
                </div>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}>
                <div className="text-sm mb-2">Recent Income</div>
                <div className="space-y-2 text-xs opacity-80 max-h-[320px] overflow-y-auto">
                  {data.income.map((row) => (
                    <div key={row.id} className="flex justify-between">
                      <span>{row.category}</span>
                      <span>${Number(row.amount_usd || 0).toFixed(4)}</span>
                    </div>
                  ))}
                  {data.income.length === 0 && <div className="opacity-60">none</div>}
                </div>
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}>
              <div className="text-sm mb-2">Recent API Usage Cost</div>
              <div className="text-xs opacity-70 mb-2">estimated usage cost total: ${Number(data.summary.usageCostUsd || 0).toFixed(6)}</div>
              <div className="space-y-2 text-xs opacity-80 max-h-[220px] overflow-y-auto">
                {(data.usage || []).map((row, idx) => (
                  <div key={`${row.api_key_id}-${row.created_at}-${idx}`} className="flex justify-between">
                    <span>{new Date(row.created_at).toLocaleString()}</span>
                    <span>${Number(row.cost || 0).toFixed(6)}</span>
                  </div>
                ))}
                {(data.usage || []).length === 0 && <div className="opacity-60">none</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
