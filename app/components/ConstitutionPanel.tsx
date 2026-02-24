'use client';

import { useState, useEffect } from 'react';

interface ConstitutionSections {
  worldview?: { beliefs?: string[]; epistemology?: string[] };
  values?: { core?: Array<{ name: string; description: string }>; preferences?: Array<{ name: string; description: string }>; repulsions?: string[] };
  models?: { mentalModels?: Array<{ name: string; domain: string; description: string }>; decisionPatterns?: string[] };
  identity?: { selfConcept?: string; communicationStyle?: string; roles?: string[]; trustModel?: string };
  shadows?: { contradictions?: string[]; blindSpots?: string[]; dissonance?: string[] };
}

interface Constitution {
  id: string;
  version: number;
  sections: ConstitutionSections;
  createdAt: string;
  changeSummary?: string;
}

interface VersionSummary {
  id: string;
  version: number;
  changeSummary: string | null;
  createdAt: string;
  isActive: boolean;
}

interface ConstitutionPanelProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  inline?: boolean;
}

type ViewTab = 'canonical' | 'training' | 'inference' | 'history';

export default function ConstitutionPanel({ userId, isOpen, onClose, inline }: ConstitutionPanelProps) {
  const [constitution, setConstitution] = useState<Constitution | null>(null);
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>('canonical');

  useEffect(() => {
    if (isOpen && userId) {
      loadConstitution();
      loadVersions();
    }
  }, [isOpen, userId]);

  const loadConstitution = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/constitution?userId=${userId}`);
      if (res.status === 404) {
        setConstitution(null);
      } else if (res.ok) {
        setConstitution(await res.json());
      } else {
        setError((await res.json()).error || 'Failed to load');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async () => {
    try {
      const res = await fetch(`/api/constitution/versions?userId=${userId}`);
      if (res.ok) setVersions((await res.json()).versions || []);
    } catch {}
  };

  const handleExtract = async () => {
    setExtracting(true);
    setError(null);
    try {
      const res = await fetch('/api/constitution/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, sourceData: 'both', includeEditorNotes: true })
      });
      if (res.ok) {
        await loadConstitution();
        await loadVersions();
      } else {
        setError((await res.json()).error || 'Extraction failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setExtracting(false);
    }
  };

  const handleRestore = async (version: number) => {
    try {
      const res = await fetch('/api/constitution/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, version })
      });
      if (res.ok) {
        await loadConstitution();
        await loadVersions();
      }
    } catch {}
  };

  if (!isOpen) return null;

  const tabs: { id: ViewTab; label: string }[] = [
    { id: 'canonical', label: 'canonical' },
    { id: 'training', label: 'training' },
    { id: 'inference', label: 'inference' },
    { id: 'history', label: `history (${versions.length})` },
  ];

  const content = (
    <>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>Constitution</h2>
        {constitution && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-subtle)' }}>
            v{constitution.version}
          </span>
        )}
      </div>

      <div className="flex gap-3 mb-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="pb-2 text-xs transition-opacity bg-transparent border-none cursor-pointer"
            style={{
              color: 'var(--text-primary)',
              opacity: activeTab === tab.id ? 1 : 0.4,
              borderBottom: activeTab === tab.id ? '2px solid var(--text-primary)' : 'none'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={inline ? '' : 'flex-1 overflow-y-auto pr-2'} style={inline ? {} : { maxHeight: 'calc(85vh - 180px)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-[0.7rem] italic thinking-pulse" style={{ color: 'var(--text-primary)', opacity: 0.3 }}>loading</span>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm mb-4" style={{ color: 'var(--text-error, #ef4444)' }}>{error}</p>
            <button onClick={loadConstitution} className="text-sm underline cursor-pointer bg-transparent border-none" style={{ color: 'var(--text-subtle)' }}>try again</button>
          </div>
        ) : !constitution ? (
          <div className="text-center py-12">
            <p className="text-sm mb-4" style={{ color: 'var(--text-subtle)' }}>no constitution yet.</p>
            <p className="text-xs mb-6" style={{ color: 'var(--text-ghost)' }}>chat with the editor first — it builds the constitution from your conversations.</p>
          </div>
        ) : activeTab === 'canonical' ? (
          <CanonicalView sections={constitution.sections} />
        ) : activeTab === 'training' ? (
          <TrainingView sections={constitution.sections} />
        ) : activeTab === 'inference' ? (
          <InferenceView sections={constitution.sections} />
        ) : (
          <VersionHistory versions={versions} currentVersion={constitution?.version} onRestore={handleRestore} />
        )}
      </div>

      {constitution && activeTab !== 'history' && (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-light)' }}>
          <span className="text-xs" style={{ color: 'var(--text-ghost)' }}>
            v{constitution.version} · {new Date(constitution.createdAt).toLocaleDateString()}
          </span>
        </div>
      )}
    </>
  );

  if (inline) return <div>{content}</div>;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'var(--bg-overlay)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl p-6 w-[95%] max-w-[600px] max-h-[85vh] flex flex-col shadow-xl"
        style={{ background: 'var(--bg-modal)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--text-subtle)' }}>{title}</h3>
      {children}
    </div>
  );
}

function CanonicalView({ sections }: { sections: ConstitutionSections }) {
  const s = sections;
  return (
    <div className="space-y-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
      {(s.worldview?.beliefs?.length || s.worldview?.epistemology?.length) ? (
        <Section title="Worldview">
          {s.worldview?.beliefs?.map((b, i) => <p key={i} className="text-xs mb-1">• {b}</p>)}
          {(s.worldview?.epistemology?.length || 0) > 0 && (
            <div className="mt-2">
              <span className="text-xs opacity-60">How I know:</span>
              {s.worldview?.epistemology?.map((e, i) => <p key={i} className="text-xs mb-1 ml-2">• {e}</p>)}
            </div>
          )}
        </Section>
      ) : null}

      {(s.values?.core?.length || s.values?.preferences?.length) ? (
        <Section title="Values">
          {s.values?.core?.map((v, i) => <div key={i} className="mb-1 text-xs"><strong>{v.name}</strong>: {v.description}</div>)}
          {(s.values?.preferences?.length || 0) > 0 && (
            <div className="mt-2">
              <span className="text-xs opacity-60">Preferences:</span>
              {s.values?.preferences?.map((v, i) => <div key={i} className="text-xs ml-2">• {v.name}: {v.description}</div>)}
            </div>
          )}
          {(s.values?.repulsions?.length || 0) > 0 && (
            <div className="mt-2">
              <span className="text-xs opacity-60">Repulsions:</span>
              {s.values?.repulsions?.map((r, i) => <p key={i} className="text-xs ml-2">• {r}</p>)}
            </div>
          )}
        </Section>
      ) : null}

      {(s.models?.mentalModels?.length || s.models?.decisionPatterns?.length) ? (
        <Section title="Models">
          {s.models?.mentalModels?.map((m, i) => <div key={i} className="mb-1 text-xs"><strong>{m.name}</strong> ({m.domain}): {m.description}</div>)}
          {(s.models?.decisionPatterns?.length || 0) > 0 && (
            <div className="mt-2">
              <span className="text-xs opacity-60">Decision patterns:</span>
              {s.models?.decisionPatterns?.map((d, i) => <p key={i} className="text-xs ml-2">• {d}</p>)}
            </div>
          )}
        </Section>
      ) : null}

      {s.identity?.selfConcept ? (
        <Section title="Identity">
          <p className="text-xs italic mb-2">{s.identity.selfConcept}</p>
          {s.identity.communicationStyle && <p className="text-xs mb-1"><strong>Style:</strong> {s.identity.communicationStyle}</p>}
          {(s.identity.roles?.length || 0) > 0 && <p className="text-xs mb-1"><strong>Roles:</strong> {s.identity.roles?.join(', ')}</p>}
          {s.identity.trustModel && <p className="text-xs"><strong>Trust:</strong> {s.identity.trustModel}</p>}
        </Section>
      ) : null}

      {(s.shadows?.contradictions?.length || s.shadows?.blindSpots?.length || s.shadows?.dissonance?.length) ? (
        <Section title="Shadows">
          {s.shadows?.contradictions?.map((c, i) => <p key={i} className="text-xs mb-1">• {c}</p>)}
          {(s.shadows?.blindSpots?.length || 0) > 0 && s.shadows?.blindSpots?.map((b, i) => <p key={i} className="text-xs mb-1 opacity-70">blind spot: {b}</p>)}
          {(s.shadows?.dissonance?.length || 0) > 0 && s.shadows?.dissonance?.map((d, i) => <p key={i} className="text-xs mb-1 opacity-70">dissonance: {d}</p>)}
        </Section>
      ) : null}
    </div>
  );
}

function TrainingView({ sections }: { sections: ConstitutionSections }) {
  const priority: Array<{ name: string; key: keyof ConstitutionSections; rank: number }> = [
    { name: 'VALUES', key: 'values', rank: 1 },
    { name: 'MODELS', key: 'models', rank: 2 },
    { name: 'IDENTITY', key: 'identity', rank: 3 },
    { name: 'WORLDVIEW', key: 'worldview', rank: 4 },
    { name: 'SHADOWS', key: 'shadows', rank: 5 },
  ];

  return (
    <div className="space-y-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
      <p className="text-xs opacity-50 italic mb-3">Dense view for RLAIF evaluation. Sections ordered by training priority.</p>
      {priority.map(({ name, key, rank }) => {
        const data = sections[key];
        if (!data) return null;
        const text = JSON.stringify(data, null, 0);
        if (text === '{}' || text === '[]' || text === '{"beliefs":[],"epistemology":[]}') return null;
        return (
          <div key={key}>
            <div className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              [{name} — priority {rank}]
            </div>
            <pre className="whitespace-pre-wrap text-xs opacity-80 p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        );
      })}
    </div>
  );
}

function InferenceView({ sections }: { sections: ConstitutionSections }) {
  const queryTypes = [
    { type: 'Values question', sections: ['values', 'worldview'] },
    { type: 'Factual question', sections: ['worldview', 'models'] },
    { type: 'Reasoning question', sections: ['models', 'worldview'] },
    { type: 'Style question', sections: ['identity', 'values'] },
    { type: 'Novel situation', sections: ['values', 'models', 'shadows'] },
    { type: 'Personal question', sections: ['identity', 'values', 'shadows'] },
  ];

  return (
    <div className="space-y-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
      <p className="text-xs opacity-50 italic mb-3">Compressed view for Orchestrator inference. Per-query section routing.</p>
      <div className="mb-4">
        <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Query routing:</div>
        {queryTypes.map(({ type, sections: secs }) => (
          <div key={type} className="flex gap-2 mb-1">
            <span className="opacity-60 w-36">{type}</span>
            <span>→ {secs.join(', ')}</span>
          </div>
        ))}
      </div>
      <div>
        <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Compressed sections:</div>
        {(['worldview', 'values', 'models', 'identity', 'shadows'] as const).map(key => {
          const data = sections[key];
          if (!data) return null;
          const flat = Object.entries(data as Record<string, unknown>)
            .filter(([, v]) => (Array.isArray(v) ? v.length > 0 : !!v))
            .map(([k, v]) => {
              if (typeof v === 'string') return v;
              if (Array.isArray(v)) return v.slice(0, 3).map(i => typeof i === 'string' ? i : (i as Record<string, string>).name || JSON.stringify(i)).join('; ');
              return '';
            })
            .filter(Boolean)
            .join(' | ');
          if (!flat) return null;
          return (
            <div key={key} className="mb-2">
              <span className="font-medium">{key}:</span> <span className="opacity-80">{flat}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VersionHistory({ versions, currentVersion, onRestore }: { versions: VersionSummary[]; currentVersion?: number; onRestore: (v: number) => void }) {
  if (versions.length === 0) {
    return <div className="text-center py-12"><p className="text-sm" style={{ color: 'var(--text-subtle)' }}>No history yet.</p></div>;
  }

  return (
    <div className="space-y-3">
      {versions.map(v => (
        <div key={v.id} className="p-3 rounded-lg flex justify-between items-start" style={{ background: v.isActive ? 'var(--bg-tertiary)' : 'var(--bg-secondary)' }}>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>v{v.version}</span>
              {v.isActive && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}>active</span>}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>{v.changeSummary || 'No description'}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-ghost)' }}>{new Date(v.createdAt).toLocaleString()}</p>
          </div>
          {!v.isActive && (
            <button onClick={() => onRestore(v.version)} className="text-xs px-2 py-1 rounded cursor-pointer hover:opacity-70 border-none" style={{ background: 'var(--bg-primary)', color: 'var(--text-subtle)' }}>restore</button>
          )}
        </div>
      ))}
    </div>
  );
}
