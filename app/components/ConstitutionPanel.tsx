'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

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

interface ConstitutionPanelProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  inline?: boolean;
}

type SectionId = 'worldview' | 'values' | 'models' | 'identity' | 'shadows';

const SECTION_META: { id: SectionId; label: string }[] = [
  { id: 'worldview', label: 'Worldview' },
  { id: 'values', label: 'Values' },
  { id: 'models', label: 'Models' },
  { id: 'identity', label: 'Identity' },
  { id: 'shadows', label: 'Shadows' },
];

function sectionHasContent(s: ConstitutionSections, id: SectionId): boolean {
  const d = s[id];
  if (!d) return false;
  return Object.values(d).some(v =>
    typeof v === 'string' ? v.length > 0 : Array.isArray(v) ? v.length > 0 : false
  );
}

export default function ConstitutionPanel({ userId, isOpen, onClose, inline }: ConstitutionPanelProps) {
  const [constitution, setConstitution] = useState<Constitution | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<SectionId | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && userId) loadConstitution();
  }, [isOpen, userId]);

  const loadConstitution = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/constitution?userId=${userId}`);
      if (res.status === 404) setConstitution(null);
      else if (res.ok) setConstitution(await res.json());
      else setError((await res.json()).error || 'Failed to load');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = useCallback(() => {
    if (!constitution) return;
    const ids = SECTION_META.filter(m => sectionHasContent(constitution.sections, m.id)).map(m => m.id);
    let current: SectionId | null = null;
    for (const id of ids) {
      const el = document.getElementById(`cs-${id}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 120) current = id;
      }
    }
    setActiveId(current);
  }, [constitution]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(`cs-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!isOpen) return null;

  const activeSections = constitution
    ? SECTION_META.filter(m => sectionHasContent(constitution.sections, m.id))
    : [];

  const content = (
    <div className="flex gap-0 min-h-0">
      {/* Left sidebar nav */}
      {constitution && activeSections.length > 1 && (
        <nav className="sticky top-0 self-start pt-1 pr-4 flex-shrink-0 hidden sm:block" style={{ minWidth: '80px' }}>
          <div className="space-y-1">
            {activeSections.map(s => {
              const isActive = activeId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => scrollToSection(s.id)}
                  className="block w-full text-left text-[0.65rem] bg-transparent border-none cursor-pointer py-1 px-0 transition-all duration-200"
                  style={{
                    color: 'var(--text-primary)',
                    opacity: isActive ? 0.8 : 0.25,
                    fontWeight: isActive ? 500 : 400,
                    borderLeft: isActive ? '2px solid var(--text-primary)' : '2px solid transparent',
                    paddingLeft: '8px',
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-baseline gap-2">
            <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>Constitution</h2>
            {constitution && (
              <span className="text-[0.6rem] tracking-wide" style={{ color: 'var(--text-subtle)' }}>
                v{constitution.version}
              </span>
            )}
          </div>
        </div>

        {/* Mobile TOC */}
        {constitution && activeSections.length > 1 && (
          <nav className="mb-5 pb-3 sm:hidden" style={{ borderBottom: '1px solid var(--border-light)' }}>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {activeSections.map(s => (
                <button
                  key={s.id}
                  onClick={() => scrollToSection(s.id)}
                  className="text-[0.68rem] bg-transparent border-none cursor-pointer p-0 transition-opacity"
                  style={{ color: 'var(--text-primary)', opacity: activeId === s.id ? 0.7 : 0.3 }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </nav>
        )}

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
            <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>no constitution yet.</p>
            <p className="text-xs mt-2" style={{ color: 'var(--text-subtle)', opacity: 0.6 }}>the editor builds it as it processes your vault data.</p>
          </div>
        ) : (
          <div className="space-y-10">
            <ConstitutionContent sections={constitution.sections} />
          </div>
        )}
      </div>
    </div>
  );

  if (inline) return <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>{content}</div>;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'var(--bg-overlay)' }}
      onClick={onClose}
    >
      <div
        ref={scrollRef}
        className="rounded-2xl p-6 w-[95%] max-w-[700px] max-h-[85vh] overflow-y-auto shadow-xl"
        style={{ background: 'var(--bg-modal)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </div>
  );
}

function SectionHeading({ id, title }: { id: string; title: string }) {
  return (
    <h3
      id={`cs-${id}`}
      className="text-[0.7rem] font-medium uppercase tracking-wider mb-3 pt-1 scroll-mt-4"
      style={{ color: 'var(--text-primary)', opacity: 0.5 }}
    >
      {title}
    </h3>
  );
}

function ConstitutionContent({ sections }: { sections: ConstitutionSections }) {
  const s = sections;
  const rendered: React.ReactElement[] = [];

  if (sectionHasContent(s, 'worldview')) {
    rendered.push(
      <div key="worldview">
        <SectionHeading id="worldview" title="Worldview" />
        <div className="space-y-1.5">
          {s.worldview?.beliefs?.map((b, i) => (
            <p key={i} className="text-[0.8rem] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{b}</p>
          ))}
        </div>
        {(s.worldview?.epistemology?.length || 0) > 0 && (
          <div className="mt-4">
            <div className="text-[0.65rem] uppercase tracking-wider mb-2" style={{ color: 'var(--text-subtle)' }}>Epistemology</div>
            {s.worldview?.epistemology?.map((e, i) => (
              <p key={i} className="text-[0.8rem] leading-relaxed" style={{ color: 'var(--text-secondary)', opacity: 0.8 }}>{e}</p>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (sectionHasContent(s, 'values')) {
    rendered.push(
      <div key="values">
        <SectionHeading id="values" title="Values" />
        <div className="space-y-3">
          {s.values?.core?.map((v, i) => (
            <div key={i}>
              <div className="text-[0.8rem] font-medium" style={{ color: 'var(--text-primary)' }}>{v.name}</div>
              <div className="text-[0.78rem] leading-relaxed mt-0.5" style={{ color: 'var(--text-secondary)' }}>{v.description}</div>
            </div>
          ))}
        </div>
        {(s.values?.preferences?.length || 0) > 0 && (
          <div className="mt-4">
            <div className="text-[0.65rem] uppercase tracking-wider mb-2" style={{ color: 'var(--text-subtle)' }}>Preferences</div>
            <div className="space-y-2">
              {s.values?.preferences?.map((v, i) => (
                <div key={i}>
                  <span className="text-[0.78rem] font-medium" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>{v.name}</span>
                  <span className="text-[0.78rem] ml-1.5" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>{v.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {(s.values?.repulsions?.length || 0) > 0 && (
          <div className="mt-4">
            <div className="text-[0.65rem] uppercase tracking-wider mb-2" style={{ color: 'var(--text-subtle)' }}>Repulsions</div>
            {s.values?.repulsions?.map((r, i) => (
              <p key={i} className="text-[0.78rem] leading-relaxed" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>{r}</p>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (sectionHasContent(s, 'models')) {
    rendered.push(
      <div key="models">
        <SectionHeading id="models" title="Models" />
        <div className="space-y-3">
          {s.models?.mentalModels?.map((m, i) => (
            <div key={i}>
              <div className="text-[0.8rem]">
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{m.name}</span>
                <span className="text-[0.65rem] ml-1.5" style={{ color: 'var(--text-subtle)' }}>{m.domain}</span>
              </div>
              <div className="text-[0.78rem] leading-relaxed mt-0.5" style={{ color: 'var(--text-secondary)' }}>{m.description}</div>
            </div>
          ))}
        </div>
        {(s.models?.decisionPatterns?.length || 0) > 0 && (
          <div className="mt-4">
            <div className="text-[0.65rem] uppercase tracking-wider mb-2" style={{ color: 'var(--text-subtle)' }}>Decision Patterns</div>
            {s.models?.decisionPatterns?.map((d, i) => (
              <p key={i} className="text-[0.78rem] leading-relaxed" style={{ color: 'var(--text-secondary)', opacity: 0.8 }}>{d}</p>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (sectionHasContent(s, 'identity')) {
    rendered.push(
      <div key="identity">
        <SectionHeading id="identity" title="Identity" />
        {s.identity?.selfConcept && (
          <p className="text-[0.8rem] leading-relaxed italic mb-3" style={{ color: 'var(--text-secondary)' }}>{s.identity.selfConcept}</p>
        )}
        {s.identity?.communicationStyle && (
          <div className="mb-3">
            <div className="text-[0.65rem] uppercase tracking-wider mb-1" style={{ color: 'var(--text-subtle)' }}>Communication Style</div>
            <p className="text-[0.78rem] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{s.identity.communicationStyle}</p>
          </div>
        )}
        {(s.identity?.roles?.length || 0) > 0 && (
          <div className="mb-3">
            <div className="text-[0.65rem] uppercase tracking-wider mb-1" style={{ color: 'var(--text-subtle)' }}>Roles</div>
            <p className="text-[0.78rem]" style={{ color: 'var(--text-secondary)' }}>{s.identity?.roles?.join(', ')}</p>
          </div>
        )}
        {s.identity?.trustModel && (
          <div>
            <div className="text-[0.65rem] uppercase tracking-wider mb-1" style={{ color: 'var(--text-subtle)' }}>Trust Model</div>
            <p className="text-[0.78rem] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{s.identity.trustModel}</p>
          </div>
        )}
      </div>
    );
  }

  if (sectionHasContent(s, 'shadows')) {
    rendered.push(
      <div key="shadows">
        <SectionHeading id="shadows" title="Shadows" />
        {s.shadows?.contradictions?.map((c, i) => (
          <p key={`c${i}`} className="text-[0.78rem] leading-relaxed mb-1.5" style={{ color: 'var(--text-secondary)' }}>{c}</p>
        ))}
        {(s.shadows?.blindSpots?.length || 0) > 0 && (
          <div className="mt-3">
            <div className="text-[0.65rem] uppercase tracking-wider mb-1" style={{ color: 'var(--text-subtle)' }}>Blind Spots</div>
            {s.shadows?.blindSpots?.map((b, i) => (
              <p key={i} className="text-[0.78rem] leading-relaxed" style={{ color: 'var(--text-secondary)', opacity: 0.75 }}>{b}</p>
            ))}
          </div>
        )}
        {(s.shadows?.dissonance?.length || 0) > 0 && (
          <div className="mt-3">
            <div className="text-[0.65rem] uppercase tracking-wider mb-1" style={{ color: 'var(--text-subtle)' }}>Dissonance</div>
            {s.shadows?.dissonance?.map((d, i) => (
              <p key={i} className="text-[0.78rem] leading-relaxed" style={{ color: 'var(--text-secondary)', opacity: 0.75 }}>{d}</p>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (rendered.length === 0) {
    return <p className="text-sm text-center py-8" style={{ color: 'var(--text-subtle)' }}>constitution is empty.</p>;
  }

  return <>{rendered}</>;
}
