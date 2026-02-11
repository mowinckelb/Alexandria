'use client';

import { useState, useEffect } from 'react';

interface ConstitutionSection {
  coreIdentity?: string;
  worldview?: {
    epistemology?: string[];
    ontology?: string[];
  };
  values?: {
    tier1?: Array<{ name: string; description: string; examples?: string[] }>;
    tier2?: Array<{ name: string; description: string }>;
    tier3?: Array<{ name: string; description: string }>;
  };
  mentalModels?: Array<{ domain: string; name: string; whenToApply: string; howItWorks: string }>;
  heuristics?: Array<{ situationType: string; name: string; rule: string; reasoning?: string }>;
  communicationPatterns?: {
    writingStyle?: { vocabulary?: string[]; avoidedWords?: string[] };
    speakingStyle?: { verbalTics?: string[] };
    characteristicPhrases?: string[];
  };
  domainExpertise?: Array<{ domain: string; depth: string; subdomains?: string[]; opinions?: string[] }>;
  boundaries?: string[];
  evolutionNotes?: Array<{ date: string; section: string; whatChanged: string; why: string }>;
}

interface Constitution {
  id: string;
  version: number;
  sections: ConstitutionSection;
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
}

export default function ConstitutionPanel({ userId, isOpen, onClose }: ConstitutionPanelProps) {
  const [constitution, setConstitution] = useState<Constitution | null>(null);
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'view' | 'history'>('view');

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
        const data = await res.json();
        setConstitution(data);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to load constitution');
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
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions || []);
      }
    } catch (e) {
      console.error('Failed to load versions:', e);
    }
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
        const data = await res.json();
        // Reload constitution after extraction
        await loadConstitution();
        await loadVersions();
      } else {
        const data = await res.json();
        setError(data.error || 'Extraction failed');
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
    } catch (e) {
      console.error('Restore failed:', e);
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
        className="rounded-2xl p-6 w-[95%] max-w-[600px] max-h-[85vh] flex flex-col shadow-xl"
        style={{ background: 'var(--bg-modal)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
              Constitution
            </h2>
            {constitution && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-subtle)' }}>
                v{constitution.version}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-xl cursor-pointer hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-subtle)' }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
          <button
            onClick={() => setActiveTab('view')}
            className={`pb-2 text-sm transition-opacity ${activeTab === 'view' ? 'opacity-100' : 'opacity-50'}`}
            style={{ 
              color: 'var(--text-primary)',
              borderBottom: activeTab === 'view' ? '2px solid var(--text-primary)' : 'none'
            }}
          >
            View
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2 text-sm transition-opacity ${activeTab === 'history' ? 'opacity-100' : 'opacity-50'}`}
            style={{ 
              color: 'var(--text-primary)',
              borderBottom: activeTab === 'history' ? '2px solid var(--text-primary)' : 'none'
            }}
          >
            History ({versions.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: 'calc(85vh - 180px)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="text-sm opacity-50 animate-pulse" style={{ color: 'var(--text-primary)' }}>
                loading...
              </span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm mb-4" style={{ color: 'var(--text-error, #ef4444)' }}>{error}</p>
              <button
                onClick={loadConstitution}
                className="text-sm underline cursor-pointer"
                style={{ color: 'var(--text-subtle)' }}
              >
                try again
              </button>
            </div>
          ) : activeTab === 'view' ? (
            constitution ? (
              <ConstitutionView sections={constitution.sections} />
            ) : (
              <div className="text-center py-12">
                <p className="text-sm mb-4" style={{ color: 'var(--text-subtle)' }}>
                  No Constitution yet.
                </p>
                <p className="text-xs mb-6" style={{ color: 'var(--text-ghost)' }}>
                  Extract from your existing data to create one.
                </p>
                <button
                  onClick={handleExtract}
                  disabled={extracting}
                  className="px-4 py-2 rounded-lg text-sm cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  {extracting ? 'extracting...' : 'extract constitution'}
                </button>
              </div>
            )
          ) : (
            <VersionHistory 
              versions={versions} 
              currentVersion={constitution?.version}
              onRestore={handleRestore}
            />
          )}
        </div>

        {/* Footer Actions */}
        {constitution && activeTab === 'view' && (
          <div className="mt-4 pt-4 border-t flex justify-between items-center" style={{ borderColor: 'var(--border-light)' }}>
            <span className="text-xs" style={{ color: 'var(--text-ghost)' }}>
              Last updated: {new Date(constitution.createdAt).toLocaleDateString()}
            </span>
            <button
              onClick={handleExtract}
              disabled={extracting}
              className="text-xs cursor-pointer transition-opacity hover:opacity-70 disabled:opacity-50"
              style={{ color: 'var(--text-subtle)' }}
            >
              {extracting ? 'extracting...' : 're-extract'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ConstitutionView({ sections }: { sections: ConstitutionSection }) {
  return (
    <div className="space-y-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
      {/* Core Identity */}
      {sections.coreIdentity && (
        <Section title="Core Identity">
          <p className="italic">{sections.coreIdentity}</p>
        </Section>
      )}

      {/* Values */}
      {sections.values && (sections.values.tier1?.length || sections.values.tier2?.length) && (
        <Section title="Values">
          {sections.values.tier1?.map((v, i) => (
            <div key={i} className="mb-2">
              <strong>{v.name}</strong>: {v.description}
            </div>
          ))}
          {sections.values.tier2?.map((v, i) => (
            <div key={i} className="mb-1 text-xs opacity-80">
              • {v.name}: {v.description}
            </div>
          ))}
        </Section>
      )}

      {/* Worldview */}
      {sections.worldview && ((sections.worldview.epistemology?.length ?? 0) > 0 || (sections.worldview.ontology?.length ?? 0) > 0) && (
        <Section title="Worldview">
          {(sections.worldview.epistemology?.length ?? 0) > 0 && (
            <div className="mb-2">
              <span className="text-xs opacity-60">How I know things:</span>
              <ul className="mt-1 space-y-1">
                {sections.worldview.epistemology?.map((e, i) => (
                  <li key={i} className="text-xs">• {e}</li>
                ))}
              </ul>
            </div>
          )}
          {(sections.worldview.ontology?.length ?? 0) > 0 && (
            <div>
              <span className="text-xs opacity-60">What matters:</span>
              <ul className="mt-1 space-y-1">
                {sections.worldview.ontology?.map((o, i) => (
                  <li key={i} className="text-xs">• {o}</li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      )}

      {/* Heuristics */}
      {(sections.heuristics?.length ?? 0) > 0 && (
        <Section title="Decision Rules">
          {sections.heuristics?.map((h, i) => (
            <div key={i} className="mb-2 text-xs">
              <strong>{h.name}</strong> ({h.situationType}): {h.rule}
            </div>
          ))}
        </Section>
      )}

      {/* Boundaries */}
      {(sections.boundaries?.length ?? 0) > 0 && (
        <Section title="Boundaries">
          <ul className="space-y-1">
            {sections.boundaries?.map((b, i) => (
              <li key={i} className="text-xs">• {b}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* Communication */}
      {(sections.communicationPatterns?.characteristicPhrases?.length ?? 0) > 0 && (
        <Section title="Communication Style">
          <div className="text-xs">
            <span className="opacity-60">Characteristic phrases:</span>
            <div className="mt-1 space-y-1">
              {sections.communicationPatterns?.characteristicPhrases?.map((p, i) => (
                <span key={i} className="inline-block mr-2 px-2 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                  "{p}"
                </span>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Domain Expertise */}
      {(sections.domainExpertise?.length ?? 0) > 0 && (
        <Section title="Expertise">
          {sections.domainExpertise?.map((d, i) => (
            <div key={i} className="mb-1 text-xs">
              <strong>{d.domain}</strong> ({d.depth})
              {(d.subdomains?.length ?? 0) > 0 && (
                <span className="opacity-60"> — {d.subdomains?.join(', ')}</span>
              )}
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--text-subtle)' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function VersionHistory({ 
  versions, 
  currentVersion,
  onRestore 
}: { 
  versions: VersionSummary[]; 
  currentVersion?: number;
  onRestore: (version: number) => void;
}) {
  if (versions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>
          No version history yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {versions.map((v) => (
        <div 
          key={v.id}
          className="p-3 rounded-lg flex justify-between items-start"
          style={{ background: v.isActive ? 'var(--bg-tertiary)' : 'var(--bg-secondary)' }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Version {v.version}
              </span>
              {v.isActive && (
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}>
                  active
                </span>
              )}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>
              {v.changeSummary || 'No description'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-ghost)' }}>
              {new Date(v.createdAt).toLocaleString()}
            </p>
          </div>
          {!v.isActive && (
            <button
              onClick={() => onRestore(v.version)}
              className="text-xs px-2 py-1 rounded cursor-pointer hover:opacity-70"
              style={{ background: 'var(--bg-primary)', color: 'var(--text-subtle)' }}
            >
              restore
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
