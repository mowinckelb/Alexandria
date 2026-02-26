'use client';
import { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';
import AuthScreen from './components/AuthScreen';
import LandingPage from './components/LandingPage';
import ConstitutionPanel from './components/ConstitutionPanel';
import RlaifReviewPanel from './components/RlaifReviewPanel';
import { useTheme } from './components/ThemeProvider';
import { ChevronDown } from 'lucide-react';


interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  prompt?: string;  // For assistant messages: the user query that generated this
  version?: number; // For regenerated responses: which version (2, 3, etc.)
}

// ============================================================================
// Inline Section Components
// ============================================================================

interface EditorStatus {
  total: number;
  processed: number;
  remaining: number;
  percentComplete: number;
  model: { provider: string; quality: string; fast: string };
  editor: { lastCycleAt: string | null; cycleCount: number; activityLevel: string };
  recentLogs: Array<{ time: string; summary: string }>;
}

function VaultSection({ userId }: { userId: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [reprocessing, setReprocessing] = useState(false);
  const [status, setStatus] = useState<EditorStatus | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/editor-status?userId=${userId}`);
      if (res.ok) setStatus(await res.json());
    } catch {}
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    return () => clearInterval(interval);
  }, [userId]);

  const addFiles = (incoming: FileList | File[]) => {
    const allowed = Array.from(incoming).filter(f => {
      const name = f.name.toLowerCase();
      return name.endsWith('.md') || name.endsWith('.txt');
    });
    if (allowed.length === 0) { setMessage('only .md and .txt files'); return; }
    setFiles(prev => [...prev, ...allowed]);
    setMessage('');
  };

  const uploadAll = async () => {
    if (uploading || files.length === 0) return;
    setUploading(true);
    setMessage('');
    let done = 0;
    for (const file of files) {
      try {
        const text = await file.text();
        if (!text.trim()) continue;
        const res = await fetch('/api/bulk-ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, userId, source: `upload:${file.name}` })
        });
        if (res.ok) done++;
      } catch {}
    }
    setFiles([]);
    setUploading(false);
    setMessage(`${done} file${done !== 1 ? 's' : ''} stored. editor will process gradually.`);
    fetchStatus();
  };

  const reprocess = async () => {
    setReprocessing(true);
    try {
      const res = await fetch('/api/reprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      setMessage(data.message || 'queued for re-processing.');
    } catch { setMessage('failed.'); }
    setReprocessing(false);
    fetchStatus();
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="space-y-5">
      <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>Vault</h2>

      {/* Status — always shown first for consistent layout */}
      {status && status.remaining > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[0.7rem]" style={{ color: 'var(--text-primary)', opacity: 0.5 }}>
            <span>{status.processed} / {status.total}</span>
            <span className="italic thinking-pulse">{status.remaining} remaining</span>
          </div>
          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-light)' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${status.percentComplete}%`, background: 'var(--text-primary)', opacity: 0.35 }} />
          </div>
        </div>
      ) : status && status.remaining === 0 ? (
        <div className="space-y-2">
          <div className="text-[0.7rem] italic" style={{ color: 'var(--text-primary)', opacity: 0.5 }}>complete</div>
          <button onClick={reprocess} disabled={reprocessing} className="text-[0.7rem] bg-transparent border-none cursor-pointer disabled:opacity-50 p-0" style={{ color: 'var(--text-primary)', opacity: 0.4 }}>
            {reprocessing ? <span className="italic thinking-pulse">resetting</span> : 're-process'}
          </button>
        </div>
      ) : null}

      {/* File upload */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
      >
        <label className="inline-block cursor-pointer text-[0.7rem]" style={{ color: 'var(--text-primary)', opacity: 0.5 }}>
          add files
          <input type="file" multiple accept=".md,.txt" className="hidden" onChange={e => { if (e.target.files) addFiles(e.target.files); e.currentTarget.value = ''; }} />
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="text-[0.7rem]" style={{ color: 'var(--text-primary)', opacity: 0.5 }}>{f.name} ({(f.size / 1024).toFixed(0)} KB)</div>
          ))}
          <button onClick={uploadAll} disabled={uploading} className="text-[0.7rem] bg-transparent border-none cursor-pointer disabled:opacity-50 p-0" style={{ color: 'var(--text-primary)', opacity: 0.55 }}>
            {uploading ? <span className="italic thinking-pulse">uploading</span> : `upload ${files.length} file${files.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {message && <div className="text-[0.7rem]" style={{ color: 'var(--text-primary)', opacity: 0.5 }}>{message}</div>}
    </div>
  );
}

function cleanModelName(raw: string): string {
  let name = raw.includes('/') ? raw.split('/').pop()! : raw;
  name = name
    .replace(/-Reference.*$/, '')
    .replace(/-Turbo.*$/, '')
    .replace(/-Instruct.*$/, '')
    .replace(/Meta-/g, '')
    .replace(/-[0-9a-f]{6,}$/i, '')
    .replace(/:.*$/, '')
    .replace(/-fp\d+/i, '')
    .replace(/-AWQ.*$/i, '')
    .replace(/-GPTQ.*$/i, '')
    .replace(/-GGUF.*$/i, '')
    .replace(/-hf$/i, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return name
    .replace(/^Llama/, 'Llama')
    .replace(/\s(v?\d)/, ' $1');
}

interface TrainingExport { id: string; status: string; pair_count: number; created_at: string; resulting_model_id: string | null; training_job_id: string | null; }

function PLMSection({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{
    total: number; available: number; active_model: string;
    recent_exports: TrainingExport[];
    version: number; last_trained_at: string | null;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/training?userId=${userId}`);
        if (res.ok) setSummary(await res.json());
      } catch {}
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading) return (
    <div className="space-y-5">
      <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>PLM</h2>
      <div className="space-y-3 animate-pulse">
        <div className="h-3 w-[60%] rounded" style={{ background: 'var(--text-primary)', opacity: 0.05 }} />
        <div className="h-3 w-[45%] rounded" style={{ background: 'var(--text-primary)', opacity: 0.04 }} />
        <div className="h-3 w-[55%] rounded" style={{ background: 'var(--text-primary)', opacity: 0.03 }} />
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>PLM</h2>

      {summary ? (
        <div className="space-y-1">
          {/* Active model */}
          <div className="flex items-center justify-between py-2.5 px-1">
            <div>
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                {cleanModelName(summary.active_model)}
              </span>
              {summary.version > 0 ? (
                <span className="text-[0.6rem] ml-2" style={{ color: 'var(--text-subtle)' }}>
                  v{summary.version}{summary.last_trained_at ? ` · ${new Date(summary.last_trained_at).toLocaleDateString()}` : ''}
                </span>
              ) : (
                <span className="text-[0.6rem] ml-2" style={{ color: 'var(--text-subtle)' }}>untrained</span>
              )}
            </div>
            <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>active</span>
          </div>

          {/* Previous exports as history */}
          {summary.recent_exports
            .filter(e => e.resulting_model_id && e.status === 'active' && e.resulting_model_id !== summary.active_model)
            .map((e, i) => (
              <div key={e.id} className="flex items-center justify-between py-2.5 px-1">
                <div>
                  <span className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.5 }}>
                    {cleanModelName(e.resulting_model_id!)}
                  </span>
                  <span className="text-[0.6rem] ml-2" style={{ color: 'var(--text-subtle)', opacity: 0.5 }}>
                    v{summary.version - (i + 1)} · {new Date(e.created_at).toLocaleDateString()}
                  </span>
                </div>
                <button className="text-xs bg-transparent border-none cursor-pointer hover:opacity-70 p-0" style={{ color: 'var(--text-subtle)' }}>restore</button>
              </div>
            ))
          }

        </div>
      ) : (
        <div className="text-xs" style={{ color: 'var(--text-subtle)' }}>no training data yet.</div>
      )}
    </div>
  );
}

interface AuthoredWork { id: string; title: string; medium: string; content?: string; summary?: string; published_at: string; metadata?: { pdf_url?: string; storage_path?: string } }
interface AuthorProfile { user_id?: string; display_name?: string; handle?: string; bio?: string; works_count?: number; }

function PersonaModal({ persona, onClose, works, loading }: {
  persona: AuthorProfile;
  onClose: () => void;
  works: AuthoredWork[];
  loading: boolean;
}) {
  const name = persona.display_name || persona.handle || 'unnamed';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} />
      <div
        className="relative w-full max-w-[560px] max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-6"
        style={{ background: 'var(--bg-primary)' }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-5 bg-transparent border-none cursor-pointer text-lg" style={{ color: 'var(--text-subtle)' }}>×</button>

        {loading ? (
          <div className="py-16 text-center"><span className="text-[0.7rem] italic thinking-pulse" style={{ color: 'var(--text-primary)', opacity: 0.3 }}>loading</span></div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-extralight" style={{ color: 'var(--text-primary)' }}>{name}</h2>

            {works.length > 0 && (
              <div className="space-y-2">
                <div className="text-[0.68rem] tracking-wider uppercase" style={{ color: 'var(--text-primary)', opacity: 0.4 }}>Works</div>
                {works.map(w => {
                  const pdfUrl = (w.metadata as Record<string, string> | undefined)?.pdf_url;
                  return pdfUrl ? (
                    <a key={w.id} href={pdfUrl} target="_blank" rel="noopener noreferrer" className="block text-sm py-1 no-underline" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                      {w.title} <span className="text-[0.55rem]" style={{ color: 'var(--text-subtle)' }}>↗</span>
                    </a>
                  ) : (
                    <div key={w.id} className="text-sm py-1" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>{w.title}</div>
                  );
                })}
              </div>
            )}

            {works.length === 0 && (
              <div className="py-6 text-center"><div className="text-xs italic" style={{ color: 'var(--text-subtle)' }}>no works yet</div></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LibrarySection({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [personas, setPersonas] = useState<AuthorProfile[]>([]);
  const [myProfile, setMyProfile] = useState<AuthorProfile>({});
  const [myWorks, setMyWorks] = useState<AuthoredWork[]>([]);
  const [saving, setSaving] = useState(false);

  const [showMyModal, setShowMyModal] = useState(false);
  const [modalPersona, setModalPersona] = useState<AuthorProfile | null>(null);
  const [modalWorks, setModalWorks] = useState<AuthoredWork[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  const [workTitle, setWorkTitle] = useState('');
  const [showWorkTitle, setShowWorkTitle] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const pendingFileRef = useRef<File | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [browseRes, myRes] = await Promise.all([
          fetch('/api/neo-biography?browse=true'),
          fetch(`/api/neo-biography?userId=${userId}`)
        ]);
        if (browseRes.ok) {
          const d = await browseRes.json();
          setPersonas((d.personas || []).filter((p: AuthorProfile) => p.user_id !== userId));
        }
        if (myRes.ok) {
          const d = await myRes.json();
          setMyProfile(d.profile || {});
          setMyWorks(d.works || []);
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [userId]);

  const openOtherModal = async (targetId: string) => {
    const p = personas.find(x => x.user_id === targetId);
    if (p) setModalPersona(p);
    setModalLoading(true);
    try {
      const res = await fetch(`/api/neo-biography?userId=${targetId}`);
      if (res.ok) {
        const data = await res.json();
        setModalPersona(data.profile || p);
        setModalWorks(data.works || []);
      }
    } catch {}
    setModalLoading(false);
  };

  const handleFileSelected = (file: File) => {
    pendingFileRef.current = file;
    setWorkTitle(file.name.replace(/\.[^/.]+$/, ''));
    setShowWorkTitle(true);
  };

  const submitWork = async () => {
    const file = pendingFileRef.current;
    if (!file) return;
    setSaving(true);
    const title = workTitle.trim() || file.name;
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);
      formData.append('title', title);

      const res = await fetch('/api/neo-biography/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setMyWorks(prev => [data.work, ...prev]);
        setShowWorkTitle(false);
        setWorkTitle('');
        pendingFileRef.current = null;
      }
    } catch {}
    setSaving(false);
  };

  const deleteWork = async (id: string) => {
    try {
      const res = await fetch('/api/neo-biography', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_work', id, userId })
      });
      if (res.ok) setMyWorks(prev => prev.filter(w => w.id !== id));
    } catch {}
  };

  const renameWork = async (id: string, title: string) => {
    try {
      const res = await fetch('/api/neo-biography', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename_work', id, userId, title })
      });
      if (res.ok) {
        setMyWorks(prev => prev.map(w => w.id === id ? { ...w, title } : w));
        setEditingId(null);
      }
    } catch {}
  };

  if (loading) return (
    <div className="space-y-5">
      <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>Library</h2>
      <div className="space-y-3 animate-pulse">
        <div className="h-3 w-[50%] rounded" style={{ background: 'var(--text-primary)', opacity: 0.04 }} />
        <div className="h-3 w-[35%] rounded" style={{ background: 'var(--text-primary)', opacity: 0.03 }} />
      </div>
    </div>
  );

  const myName = myProfile.display_name || myProfile.handle || 'you';

  return (
    <div className="space-y-5">
      <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>Library</h2>

      {/* Quote */}
      <div className="pb-2 text-center">
        <div className="text-[0.82rem] italic leading-relaxed font-light" style={{ color: 'var(--text-primary)', opacity: 0.45 }}>
          &ldquo;Make something wonderful.&rdquo;
        </div>
        <div className="text-[0.62rem] mt-2 tracking-widest uppercase" style={{ color: 'var(--text-primary)', opacity: 0.3 }}>Steve Jobs</div>
      </div>

      {/* Your name — click to open editing modal */}
      <button
        onClick={() => setShowMyModal(true)}
        className="w-full text-left bg-transparent border-none cursor-pointer p-0"
      >
        <div className="text-lg font-extralight" style={{ color: 'var(--text-primary)' }}>
          {myName}
          {myWorks.length > 0 && <span className="text-[0.62rem] font-light ml-2" style={{ color: 'var(--text-primary)', opacity: 0.35 }}>{myWorks.length}</span>}
        </div>
      </button>

      {/* Separator + other personas */}
      {personas.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: 'var(--border-light)' }} />
            <span className="text-[0.62rem] tracking-widest uppercase" style={{ color: 'var(--text-primary)', opacity: 0.3 }}>others</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border-light)' }} />
          </div>
          <div className="space-y-1">
            {personas.map(p => {
              const pName = p.display_name || p.handle || 'unnamed';
              return (
                <button
                  key={p.user_id}
                  onClick={() => openOtherModal(p.user_id!)}
                  className="w-full text-left py-2 px-0 border-none cursor-pointer bg-transparent flex items-center gap-3 transition-opacity hover:opacity-80"
                >
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[0.6rem] font-light" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', opacity: 0.6 }}>
                    {pName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.55 }}>{pName}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* My editing modal */}
      {showMyModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" onClick={() => setShowMyModal(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} />
          <div
            className="relative w-full max-w-[560px] max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-6"
            style={{ background: 'var(--bg-primary)' }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setShowMyModal(false)} className="absolute top-4 right-5 bg-transparent border-none cursor-pointer text-lg" style={{ color: 'var(--text-subtle)' }}>×</button>

            <div className="space-y-6">
              <div className="text-lg font-extralight" style={{ color: 'var(--text-primary)' }}>{myName}</div>

              {/* Works section */}
              <div className="space-y-2">
                <div className="text-[0.68rem] tracking-wider uppercase" style={{ color: 'var(--text-primary)', opacity: 0.4 }}>Works</div>

                {showWorkTitle && (
                  <div className="flex gap-2 items-center">
                    <input value={workTitle} onChange={e => setWorkTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submitWork(); }} placeholder="title" autoFocus className="flex-1 rounded-lg px-3 py-2 text-sm border-none outline-none" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                    <button onClick={submitWork} disabled={saving} className="text-xs bg-transparent border-none cursor-pointer disabled:opacity-50" style={{ color: 'var(--text-primary)' }}>{saving ? <span className="italic thinking-pulse">saving</span> : 'add'}</button>
                    <button onClick={() => { setShowWorkTitle(false); pendingFileRef.current = null; }} className="text-xs bg-transparent border-none cursor-pointer" style={{ color: 'var(--text-subtle)' }}>cancel</button>
                  </div>
                )}

                {myWorks.map(w => {
                  const pdfUrl = (w.metadata as Record<string, string> | undefined)?.pdf_url;
                  return (
                    <div key={w.id} className="flex items-center gap-3 py-2 group">
                    {editingId === w.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          value={editingTitle}
                          onChange={e => setEditingTitle(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') renameWork(w.id, editingTitle); if (e.key === 'Escape') setEditingId(null); }}
                          autoFocus
                          className="flex-1 text-sm border-none outline-none bg-transparent"
                          style={{ color: 'var(--text-primary)' }}
                        />
                        <button onClick={() => renameWork(w.id, editingTitle)} className="text-[0.65rem] bg-transparent border-none cursor-pointer opacity-50 hover:opacity-80 transition-opacity p-0" style={{ color: 'var(--text-primary)' }}>save</button>
                        <button onClick={() => setEditingId(null)} className="text-[0.65rem] bg-transparent border-none cursor-pointer opacity-30 hover:opacity-50 transition-opacity p-0" style={{ color: 'var(--text-primary)' }}>cancel</button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>
                          {pdfUrl ? (
                            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="no-underline hover:opacity-70 transition-opacity" style={{ color: 'var(--text-primary)' }}>
                              {w.title}
                            </a>
                          ) : w.title}
                        </span>
                        <span className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingId(w.id); setEditingTitle(w.title); }} className="text-[0.7rem] bg-transparent border-none cursor-pointer opacity-50 hover:opacity-80 transition-opacity p-0" style={{ color: 'var(--text-primary)' }}>edit</button>
                          <button onClick={() => deleteWork(w.id)} className="text-[0.7rem] bg-transparent border-none cursor-pointer opacity-50 hover:opacity-80 transition-opacity p-0" style={{ color: 'var(--text-primary)' }}>delete</button>
                        </span>
                      </>
                    )}
                    </div>
                  );
                })}

                <label className="inline-flex items-center gap-1 cursor-pointer text-[0.7rem] py-1 opacity-40 hover:opacity-70 transition-opacity" style={{ color: 'var(--text-primary)' }}>
                  {saving ? <span className="italic thinking-pulse">saving</span> : '+ add work'}
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={e => { if (e.target.files?.[0]) handleFileSelected(e.target.files[0]); e.currentTarget.value = ''; }}
                  />
                </label>

                {myWorks.length === 0 && !showWorkTitle && (
                  <div className="text-xs italic py-1" style={{ color: 'var(--text-subtle)' }}>no works yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other persona modal */}
      {modalPersona && (
        <PersonaModal
          persona={modalPersona}
          onClose={() => { setModalPersona(null); setModalWorks([]); }}
          works={modalWorks}
          loading={modalLoading}
        />
      )}
    </div>
  );
}

// ============================================================================

export default function Alexandria() {
  const { theme, toggleTheme } = useTheme();
  const [showLanding, setShowLanding] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  const [mode, setMode] = useState<'input' | 'training' | 'output'>('input');
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [trainingMessages, setTrainingMessages] = useState<Message[]>([]);
  const [inputMessages, setInputMessages] = useState<Message[]>([]);
  const [outputMessages, setOutputMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [outputContent, setOutputContent] = useState('');
  const [feedbackPhase, setFeedbackPhase] = useState<'none' | 'binary' | 'comment' | 'regenerate' | 'wrap_up'>('none');
  const [currentRating, setCurrentRating] = useState<number>(0);
  const [lastPLMMessage, setLastPLMMessage] = useState<{ prompt: string; response: string; id: string } | null>(null);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [regenerationVersion, setRegenerationVersion] = useState(1);
  const [privacyMode, setPrivacyMode] = useState<'private' | 'personal' | 'professional'>('personal');
  
  // Carbon conversation state
  const [carbonState, setCarbonState] = useState<{
    phase: string;
    currentQuestionId?: string;
    currentTopic?: string;
  }>({ phase: 'collecting' });
  const [carbonLockYN, setCarbonLockYN] = useState(false);
  const [editorFollowUps, setEditorFollowUps] = useState<string[]>([]);
  const [editorQuestions, setEditorQuestions] = useState<Array<{ id: string; title: string; opener?: string; criteria?: string[] }>>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [selectedQIndex, setSelectedQIndex] = useState(0);
  const [pausedConversations, setPausedConversations] = useState<Array<{ topic: string; messages: Message[]; aims?: string[]; completedAims?: string[] }>>([]);
  
  const [orchestratorTab, setOrchestratorTab] = useState<'activity' | 'questions' | 'chat'>('activity');
  

  const [showRlaifReview, setShowRlaifReview] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [rlaifReviewCount, setRlaifReviewCount] = useState(0);
  const [activeSection, setActiveSectionRaw] = useState<'vault' | 'constitution' | 'plm' | 'library' | null>(null);
  const setActiveSection = useCallback((s: 'vault' | 'constitution' | 'plm' | 'library' | null) => {
    setActiveSectionRaw(s);
    if (s === null) setTimeout(() => inputRef.current?.focus(), 50);
  }, []);
  const [agentsPaused, setAgentsPaused] = useState(false);
  const seenEditorMessageIds = useRef<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const outputScrollRef = useRef<HTMLDivElement>(null);

  // Check for existing session on load
  useEffect(() => {
    const storedToken = localStorage.getItem('alexandria_token');
    const storedUserId = localStorage.getItem('alexandria_user_id');
    const storedUsername = localStorage.getItem('alexandria_username');
    
    if (storedToken && storedUserId) {
      setUserId(storedUserId);
      setUsername(storedUsername || storedUserId);
      setIsAuthenticated(true);
      setShowLanding(false);
    }
    setIsCheckingAuth(false);
  }, []);

  useEffect(() => { 
    if (isAuthenticated) {
      setSessionId(uuidv4()); 
      setMode('input');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = () => setShowNav(false);
    if (showNav) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showNav]);

  // Build unified list of selectable items for the editor landing
  const pausedTopics = pausedConversations.map(p => p.topic);
  const visibleQuestions = editorQuestions
    .filter(q => !pausedTopics.includes(q.title))
    .slice(0, Math.max(0, 5 - pausedConversations.length));
  const editorItems: Array<{ type: 'paused' | 'new'; title: string }> = [
    ...pausedConversations.map(p => ({ type: 'paused' as const, title: p.topic })),
    ...visibleQuestions.map(q => ({ type: 'new' as const, title: q.title })),
  ];

  // Global keyboard handler for when the input box is hidden (landing pages)
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (activeSection) return;
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        setMode(prev => prev === 'input' ? 'output' : 'input');
        return;
      }

      if (mode === 'input' && editorItems.length > 0) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedQIndex(prev => Math.max(0, prev - 1));
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedQIndex(prev => Math.min(editorItems.length - 1, prev + 1));
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          const item = editorItems[selectedQIndex];
          if (item) {
            if (item.type === 'paused') resumeConversation(item.title);
            else handlePickQuestion(item.title);
          }
          return;
        }
      }

      if (mode === 'output') {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          setOrchestratorTab(prev => {
            const tabs: Array<'activity' | 'questions' | 'chat'> = ['activity', 'questions', 'chat'];
            const idx = tabs.indexOf(prev);
            if (e.key === 'ArrowUp') return tabs[Math.max(0, idx - 1)];
            return tabs[Math.min(tabs.length - 1, idx + 1)];
          });
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          if (orchestratorTab === 'chat') startOrchestratorChat();
          return;
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeSection, mode, editorItems, selectedQIndex, orchestratorTab]);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    fetch(`/api/system-config?userId=${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.config?.paused) setAgentsPaused(true); })
      .catch(() => {});
  }, [isAuthenticated, userId]);

  const toggleAgentsPaused = async () => {
    const newState = !agentsPaused;
    setAgentsPaused(newState);
    try {
      await fetch('/api/system-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, config: { paused: newState } })
      });
    } catch {
      setAgentsPaused(!newState);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    const loadPrivacyMode = async () => {
      try {
        const res = await fetch(`/api/privacy?userId=${userId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.defaultMode && ['private', 'personal', 'professional'].includes(data.defaultMode)) {
          setPrivacyMode(data.defaultMode);
        }
      } catch {
        // ignore
      }
    };
    void loadPrivacyMode();
  }, [isAuthenticated, userId]);

  const fetchEditorQuestions = useCallback(async (clearFirst = false) => {
    if (!userId) return;
    if (clearFirst) setEditorQuestions([]);
    setLoadingQuestions(true);
    try {
      const res = await fetch(`/api/editor-questions?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setEditorQuestions(data.questions || []);
        setSelectedQIndex(0);
      }
    } catch { /* ignore */ }
    setLoadingQuestions(false);
  }, [userId]);

  // Pre-load questions as soon as we have a userId
  useEffect(() => {
    if (userId && editorQuestions.length === 0 && !loadingQuestions) {
      fetchEditorQuestions();
    }
  }, [userId]);



  // Auto-trigger post_upload phase to ask questions about uploaded content
  useEffect(() => {
    if (carbonState.phase === 'post_upload' && userId) {
      const triggerPostUpload = async () => {
        setShowThinking(true);
        try {
          const response = await fetch('/api/input-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{ role: 'user', content: 'processed upload' }],
              userId,
              state: carbonState
            })
          });
          
          if (response.ok) {
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let assistantContent = '';
            
            if (reader) {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    try {
                      const data = JSON.parse(line.slice(6));
                      if (data.delta) assistantContent += data.delta;
                      if (data.state) setCarbonState(data.state);
                    } catch {}
                  }
                }
              }
            }
            
            if (assistantContent) {
              setInputMessages(prev => [...prev, {
                id: uuidv4(),
                role: 'assistant',
                content: assistantContent
              }]);
            }
          }
        } catch (e) {
          console.error('Post-upload trigger failed:', e);
        }
        setShowThinking(false);
      };
      triggerPostUpload();
    }
  }, [carbonState.phase, userId]);

  const handleAuthSuccess = (newUsername: string, token: string, newUserId: string) => {
    localStorage.setItem('alexandria_token', token);
    localStorage.setItem('alexandria_user_id', newUserId);
    localStorage.setItem('alexandria_username', newUsername);
    setUserId(newUserId);
    setUsername(newUsername);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('alexandria_token');
    localStorage.removeItem('alexandria_user_id');
    localStorage.removeItem('alexandria_username');
    setUserId('');
    setUsername('');
    setIsAuthenticated(false);
    setTrainingMessages([]);
    setOutputMessages([]);
    setInputMessages([]);
    setPrivacyMode('personal');
    seenEditorMessageIds.current.clear();
  };

  const updatePrivacyMode = async (nextMode: 'private' | 'personal' | 'professional') => {
    setPrivacyMode(nextMode);
    if (!userId) return;
    try {
      await fetch('/api/privacy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, defaultMode: nextMode })
      });
    } catch {
      // keep local mode even if persistence fails
    }
  };

  // Poll proactive Editor messages and surface them in Input chat.
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/editor-messages?userId=${userId}&limit=20`);
        if (!res.ok) return;
        const data = await res.json();
        const messages: Array<{ id: string; content: string; priority: string; created_at: string }> = data.messages || [];
        if (!messages.length) return;

        const fresh = messages.filter((m) => !seenEditorMessageIds.current.has(m.id));
        if (!fresh.length) return;

        setInputMessages((prev) => [
          ...prev,
          ...fresh
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map((m) => ({
              id: `editor-${m.id}`,
              role: 'assistant' as const,
              content: `[editor${m.priority === 'high' ? ' !' : ''}] ${m.content}`
            }))
        ]);

        for (const m of fresh) {
          seenEditorMessageIds.current.add(m.id);
        }

        await fetch('/api/editor-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'ack',
            userId,
            ids: fresh.map((m) => m.id)
          })
        });
      } catch {
        // ignore polling errors
      }
    };

    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, userId]);

  const refreshRlaifReviewCount = async () => {
    try {
      const res = await fetch(`/api/rlaif/review?userId=${userId}&limit=1`);
      if (!res.ok) return;
      const data = await res.json();
      setRlaifReviewCount(data.count || 0);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    refreshRlaifReviewCount();
    const interval = setInterval(refreshRlaifReviewCount, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, userId]);

  // Auto-scroll for all conversation modes — instant to prevent jitter
  useEffect(() => {
    if (outputScrollRef.current) {
      requestAnimationFrame(() => {
        outputScrollRef.current?.scrollTo({ top: outputScrollRef.current.scrollHeight });
      });
    }
  }, [trainingMessages, outputMessages, inputMessages, showThinking]);

  // Auto-scroll during streaming — instant to prevent jitter
  useEffect(() => {
    if (outputContent && outputScrollRef.current) {
      outputScrollRef.current.scrollTop = outputScrollRef.current.scrollHeight;
    }
  }, [outputContent]);

  const showStatus = (message: string, isThinking = false) => {
    if (isThinking) {
      setStatusMessage('thinking');
    } else {
      setStatusMessage(message);
    }
  };

  const clearStatus = () => {
    setTimeout(() => setStatusMessage(''), 2000);
  };

  const startOrchestratorChat = useCallback(() => {
    const greetingId = uuidv4();
    setOutputMessages([{ id: greetingId, role: 'assistant', content: 'how can I help?' }]);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const exitOrchestratorChat = useCallback(() => {
    setOutputMessages([]);
    setOutputContent('');
    setOrchestratorTab('activity');
  }, []);

  const handleEditorContinue = () => {
    setCarbonLockYN(false);
    setInputMessages([]);
    setOutputContent('');
    fetchEditorQuestions(true);
  };

  const handleEditorDone = () => {
    setCarbonLockYN(false);
    setInputMessages([]);
    setOutputContent('');
    fetchEditorQuestions(true);
  };

  const handlePickQuestion = async (title: string) => {
    const question = editorQuestions.find(q => q.title === title);
    const opener = question?.opener;
    const criteria = question?.criteria || [];
    setEditorQuestions([]);
    setCarbonState(prev => ({ ...prev, currentTopic: title }));

    if (opener) {
      const assistantId = uuidv4();
      setInputMessages([{ id: assistantId, role: 'assistant', content: opener }]);
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    setIsProcessing(true);
    setShowThinking(true);

    const topicMsg = criteria.length > 0
      ? `[TOPIC: ${title}]\n[CRITERIA: ${criteria.join(' | ')}]`
      : `[TOPIC: ${title}]`;

    try {
      const response = await fetch('/api/input-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: topicMsg }],
          userId,
          state: carbonState
        })
      });

      if (!response.ok) throw new Error(`http ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantId = uuidv4();

      setShowThinking(false);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'text-delta' && data.delta) {
                  assistantContent += data.delta;
                  setOutputContent(assistantContent);
                }
                if (data.state) setCarbonState(data.state);
              } catch { /* ignore */ }
            }
          }
        }
      }

      setInputMessages([{ id: assistantId, role: 'assistant', content: assistantContent }]);
      setOutputContent('');
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (e) {
      console.error('Pick question error:', e);
      setShowThinking(false);
    } finally {
      setIsProcessing(false);
      setShowThinking(false);
    }
  };

  const exitEditorChat = useCallback(() => {
    // Pause conversation — save it so author can resume later
    if (inputMessages.length > 0 && carbonState.currentTopic) {
      setPausedConversations(prev => {
        const existing = prev.findIndex(p => p.topic === carbonState.currentTopic);
        const entry = { topic: carbonState.currentTopic!, messages: [...inputMessages] };
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = entry;
          return updated;
        }
        return [...prev, entry];
      });
    }
    setInputMessages([]);
    setOutputContent('');
    setCarbonLockYN(false);
    setCarbonState(prev => ({ ...prev, currentTopic: undefined }));
    fetchEditorQuestions(true);
  }, [fetchEditorQuestions, inputMessages, carbonState.currentTopic]);

  const resumeConversation = useCallback((topic: string) => {
    const paused = pausedConversations.find(p => p.topic === topic);
    if (!paused) return;
    setInputMessages(paused.messages);
    setCarbonState(prev => ({ ...prev, currentTopic: topic }));
    setEditorQuestions([]);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [pausedConversations]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Esc to exit conversation back to landing
    if (e.key === 'Escape' && !isProcessing) {
      if (mode === 'input' && inputMessages.length > 0) {
        e.preventDefault();
        exitEditorChat();
        return;
      }
      if (mode === 'output' && outputMessages.length > 0) {
        e.preventDefault();
        exitOrchestratorChat();
        return;
      }
    }

    // Left/right arrow to toggle editor/orchestrator (when input is empty)
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !inputValue && !activeSection) {
      e.preventDefault();
      setMode(prev => prev === 'input' ? 'output' : 'input');
      return;
    }

    // Arrow up/down + Enter for editor questions (unified list)
    if (mode === 'input' && editorItems.length > 0 && !isProcessing) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedQIndex(prev => Math.max(0, prev - 1));
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedQIndex(prev => Math.min(editorItems.length - 1, prev + 1));
        return;
      }
      if (e.key === 'Enter' && !inputValue) {
        e.preventDefault();
        const item = editorItems[selectedQIndex];
        if (item) {
          if (item.type === 'paused') resumeConversation(item.title);
          else handlePickQuestion(item.title);
        }
        return;
      }
    }

    // Phase 1: Binary y/n - instant response
    if (feedbackPhase === 'binary') {
      if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        setCurrentRating(1);
        setInputValue('');
        setTimeout(() => setFeedbackPhase('comment'), 150);
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setCurrentRating(-1);
        setInputValue('');
        setTimeout(() => setFeedbackPhase('comment'), 150);
        return;
      }
      // Block and shake on other keys
      if (e.key.length === 1) {
        e.preventDefault();
        shakeInput();
      }
      return;
    }
    
    // Phase 3: Regenerate y/n - instant response
    if (feedbackPhase === 'regenerate') {
      if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        setInputValue('');
        handleRegenerate();
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setInputValue('');
        // Ask if there's anything else
        const wrapUpMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: "anything else?"
        };
        setTrainingMessages(prev => [...prev, wrapUpMessage]);
        setLastPLMMessage(null);
        setTimeout(() => setFeedbackPhase('wrap_up'), 150);
        return;
      }
      // Block and shake on other keys
      if (e.key.length === 1) {
        e.preventDefault();
        shakeInput();
      }
      return;
    }
    
    // Phase 4: Wrap up y/n - anything else?
    if (feedbackPhase === 'wrap_up') {
      if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        setInputValue('');
        setFeedbackPhase('none');
        inputRef.current?.focus();
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setInputValue('');
        // PLM says goodbye
        const goodbyeMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: "sounds good, bye for now!"
        };
        setTrainingMessages(prev => [...prev, goodbyeMessage]);
        setFeedbackPhase('none');
        return;
      }
      // Block and shake on other keys
      if (e.key.length === 1) {
        e.preventDefault();
        shakeInput();
      }
      return;
    }
    
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'ArrowUp' && feedbackPhase === 'none') {
      e.preventDefault();
      setMode(mode === 'input' ? 'output' : 'input');
    }
  };

  const [isRegenerationFeedback, setIsRegenerationFeedback] = useState(false);

  const submitFeedback = async (rating: number, comment: string): Promise<boolean> => {
    if (!lastPLMMessage) return false;
    
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          messageId: lastPLMMessage.id,
          sessionId,
          feedback: rating,
          comment: comment.trim(),
          prompt: lastPLMMessage.prompt,
          response: lastPLMMessage.response,
          isRegeneration: isRegenerationFeedback
        })
      });
      return res.ok;
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      return false;
    }
  };

  const handleRegenerate = async () => {
    if (!lastPLMMessage) return;
    
    // Store prompt before any state changes
    const promptToRegenerate = lastPLMMessage.prompt;
    const nextVersion = regenerationVersion + 1;
    
    // Re-run ghost with same prompt
    setFeedbackPhase('none');
    setRegenerationVersion(nextVersion);
    setIsProcessing(true);
    setOutputContent('');  // Clear immediately to prevent glitch
    setShowThinking(true);
    
    try {
      // Build messages: keep all messages, ask for a different response
      const allMessages = trainingMessages.map(m => ({ role: m.role, content: m.content }));
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...allMessages,
            { role: 'user', content: `Please give me a different response to my previous question: "${promptToRegenerate}"` }
          ],
          userId,
          sessionId,
          temperature: 0.9  // Higher temperature for variation
        })
      });

      if (!response.ok) throw new Error(`http ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantId = uuidv4();

      if (reader) {
        let firstChunk = true;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Hide thinking on first content
          if (firstChunk) {
            setShowThinking(false);
            firstChunk = false;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'text-delta' && data.delta) {
                  assistantContent += data.delta;
                  setOutputContent(assistantContent);
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }

      // Only proceed if we got actual content
      if (!assistantContent.trim()) {
        console.error('Regenerate returned empty content');
        setFeedbackPhase('none');
        setLastPLMMessage(null);
        setOutputContent('');
        return;
      }

      // ADD new message below the previous one (don't replace - keep both for A/B comparison)
      setTrainingMessages(prev => [...prev, { 
        id: assistantId, 
        role: 'assistant', 
        content: assistantContent,
        prompt: promptToRegenerate,
        version: nextVersion
      }]);
      
      // Update for next potential regeneration
      setLastPLMMessage({ prompt: promptToRegenerate, response: assistantContent, id: assistantId });
      setIsRegenerationFeedback(true);  // This IS a regeneration - enables DPO pair detection
      
      // Wait for message to render, then clear streaming content and start feedback
      await new Promise(resolve => setTimeout(resolve, 100));
      setOutputContent('');
      
      // Start feedback loop again
      setTimeout(() => setFeedbackPhase('binary'), 200);
      
    } catch (error) {
      console.error('Regenerate error:', error);
      setFeedbackPhase('none');
      setLastPLMMessage(null);
    } finally {
      setIsProcessing(false);
      setShowThinking(false);
    }
  };

  const shakeInput = () => {
    const input = inputRef.current;
    if (input) {
      input.classList.add('animate-shake');
      setTimeout(() => input.classList.remove('animate-shake'), 500);
    }
  };

  const handleSubmit = async () => {
    const text = inputValue.trim();
    
    // Allow empty submit only in comment phase (to skip)
    if (!text && feedbackPhase !== 'comment') return;

    // Prevent double submission
    if (isProcessing) {
      shakeInput();
      return;
    }

    // Phase 2: Comment submission (Enter with empty = skip)
    if (feedbackPhase === 'comment') {
      const comment = text;
      setInputValue('');
      setFeedbackPhase('regenerate');
      inputRef.current?.focus();
      
      // Process feedback in background (don't block UI)
      (async () => {
        const saved = await submitFeedback(currentRating, comment.trim() || '');
        if (saved && comment.trim()) {
          setFeedbackSaved(true);
          setTimeout(() => setFeedbackSaved(false), 1500);
        }
      })();
      return;
    }

    setInputValue('');
    setIsProcessing(true);
    
    // Collapse keyboard on mobile
    inputRef.current?.blur();

    try {
      if (mode === 'input') {
        await handleCarbon(text);
      } else if (mode === 'training') {
        await handleTraining(text);
      } else {
        await handleOutput(text);
      }
    } finally {
      setIsProcessing(false);
      // Only refocus on desktop
      if (typeof window !== 'undefined' && window.innerWidth > 768) {
        inputRef.current?.focus();
      }
    }
  };

  // Direct y/n handler for carbon mode (bypasses state update delay)
  const handleCarbonYN = async (answer: 'y' | 'n') => {
    setIsProcessing(true);
    setShowThinking(true);
    
    // Display "yes" or "no" in chat for nicer appearance
    const displayText = answer === 'y' ? 'yes' : 'no';
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: displayText
    };
    const newMessages = [...inputMessages, userMessage];
    setInputMessages(newMessages);

    try {
      const response = await fetch('/api/input-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          userId,
          state: carbonState
        })
      });

      if (!response.ok) throw new Error(`http ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantId = uuidv4();
      let newState = carbonState;
      let shouldLockYN = false;

      setShowThinking(false);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'text-delta' && data.delta) {
                  assistantContent += data.delta;
                  setOutputContent(assistantContent);
                }
                if (data.state) newState = data.state;
                if (data.lockYN !== undefined) shouldLockYN = data.lockYN;
              } catch { /* ignore */ }
            }
          }
        }
      }

      setCarbonState(newState);
      setCarbonLockYN(shouldLockYN);
      setEditorFollowUps([]);
      setInputMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: assistantContent }]);
      setOutputContent('');

      if (newState.phase === 'goodbye') {
        setTimeout(() => {
          setCarbonState({ phase: 'collecting' });
          setCarbonLockYN(false);
          setInputMessages([]);
          setOutputContent('');
          fetchEditorQuestions(true);
        }, 2500);
      }
    } catch (error) {
      console.error('Carbon YN error:', error);
      setShowThinking(false);
    } finally {
      setIsProcessing(false);
      setShowThinking(false);
    }
  };

  const handleCarbon = async (text: string) => {
    try {
      setOutputContent('');
      setShowThinking(true);

      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: text
      };

      // Delay showing user message
      await new Promise(resolve => setTimeout(resolve, 300));
      const newMessages = [...inputMessages, userMessage];
      setInputMessages(newMessages);

      const response = await fetch('/api/input-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          userId,
          state: carbonState
        })
      });

      if (!response.ok) {
        throw new Error(`http ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantId = uuidv4();
      let newState = carbonState;
      let shouldLockYN = false;
      let followUps: string[] = [];

      if (reader) {
        let firstChunk = true;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          if (firstChunk) {
            setShowThinking(false);
            firstChunk = false;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'text-delta' && data.delta) {
                  assistantContent += data.delta;
                  setOutputContent(assistantContent);
                }
                if (data.state) newState = data.state;
                if (data.lockYN !== undefined) shouldLockYN = data.lockYN;
                if (data.followUpOptions?.length) followUps = data.followUpOptions;
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }

      setCarbonState(newState);
      setCarbonLockYN(shouldLockYN);
      setEditorFollowUps(followUps);

      setInputMessages(prev => [...prev, { 
        id: assistantId, 
        role: 'assistant', 
        content: assistantContent 
      }]);
      
      setOutputContent('');
      
      // Return to question bank when conversation ends
      if (newState.phase === 'goodbye') {
        setTimeout(() => {
          setCarbonState({ phase: 'collecting' });
          setCarbonLockYN(false);
          setInputMessages([]);
          setOutputContent('');
          fetchEditorQuestions(true);
        }, 2500);
      }

      // Show "saved." if data was ingested
      if (assistantContent.includes("I've saved it")) {
        setTimeout(() => {
          setFeedbackSaved(true);
          setTimeout(() => setFeedbackSaved(false), 1500);
        }, 200);
      }

    } catch (error) {
      setShowThinking(false);
      const errorMsg = error instanceof Error ? error.message : 'unknown error';
      setOutputContent(`error: ${errorMsg.toLowerCase()}`);
    }
  };

  const handleTraining = async (query: string) => {
    try {
      setOutputContent('');
      setShowThinking(false);
      setRegenerationVersion(1);  // Reset version for new prompt

      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: query
      };

      // Delay showing user message
      await new Promise(resolve => setTimeout(resolve, 300));
      const newMessages = [...trainingMessages, userMessage];
      setTrainingMessages(newMessages);

      // Delay showing thinking indicator
      setTimeout(() => setShowThinking(true), 700);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          userId,
          sessionId,
          privacyMode
        })
      });

      if (!response.ok) {
        throw new Error(`http ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantId = uuidv4();

      // Hide thinking when streaming starts
      setShowThinking(false);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'text-delta' && data.delta) {
                  assistantContent += data.delta;
                  setOutputContent(assistantContent);
                }
              } catch {
                // Ignore parse errors for non-JSON lines
              }
            }
          }
        }
      }

      // Add to training messages history with the prompt for RLHF tracking
      setTrainingMessages(prev => [...prev, { 
        id: assistantId, 
        role: 'assistant', 
        content: assistantContent,
        prompt: query  // Store the user query that generated this response
      }]);
      
      // Clear output content to avoid duplicate display
      setOutputContent('');
      
      // Enter feedback mode - user must provide feedback before next query
      setLastPLMMessage({ prompt: query, response: assistantContent, id: assistantId });
      setIsRegenerationFeedback(false);  // First response, not a regeneration
      setTimeout(() => setFeedbackPhase('binary'), 300);

    } catch (error) {
      setShowThinking(false);
      const errorMsg = error instanceof Error ? error.message : 'unknown error';
      setOutputContent(`error: ${errorMsg.toLowerCase()}`);
    }
  };

  const handleOutput = async (query: string) => {
    try {
      setOutputContent('');
      setShowThinking(false);

      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: query
      };

      // Delay showing user message
      await new Promise(resolve => setTimeout(resolve, 300));
      const newMessages = [...outputMessages, userMessage];
      setOutputMessages(newMessages);

      // Delay showing thinking indicator
      setTimeout(() => setShowThinking(true), 700);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          userId,
          sessionId,
          privacyMode
        })
      });

      if (!response.ok) {
        throw new Error(`http ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantId = uuidv4();

      // Hide thinking when streaming starts
      setShowThinking(false);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'text-delta' && data.delta) {
                  assistantContent += data.delta;
                  setOutputContent(assistantContent);
                }
              } catch {
                // Ignore parse errors for non-JSON lines
              }
            }
          }
        }
      }

      // Add to output messages history (no RLHF tracking needed)
      setOutputMessages(prev => [...prev, { 
        id: assistantId, 
        role: 'assistant', 
        content: assistantContent
      }]);
      
      // Clear output content to avoid duplicate display
      setOutputContent('');
      
      // No feedback loop - pure conversation mode

    } catch (error) {
      setShowThinking(false);
      const errorMsg = error instanceof Error ? error.message : 'unknown error';
      setOutputContent(`error: ${errorMsg.toLowerCase()}`);
    }
  };


  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <span className="opacity-50 animate-pulse" style={{ color: 'var(--text-primary)' }}>loading</span>
      </div>
    );
  }

  // Show landing page first if not authenticated
  if (!isAuthenticated && showLanding) {
    return <LandingPage onGetStarted={() => setShowLanding(false)} />;
  }

  // Show auth screen if not authenticated and landing dismissed
  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} onBack={() => setShowLanding(true)} />;
  }

  const currentMessages = mode === 'input' ? inputMessages : outputMessages;
  const isEmpty = currentMessages.length === 0 && !outputContent && !showThinking;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <div className="z-50 relative py-4">
        {/* Navigation — fixed left */}
        <div className="fixed left-3 top-4 z-[200]" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setShowNav(prev => !prev)}
            className="bg-transparent border-none text-[0.75rem] cursor-pointer opacity-40 hover:opacity-60 transition-opacity flex items-center gap-1"
            style={{ color: 'var(--text-primary)' }}
          >
            {username}
            <ChevronDown size={10} strokeWidth={1.5} className={`transition-transform ${showNav ? 'rotate-180' : ''}`} />
          </button>
          {showNav && (
            <div
              className="absolute top-8 left-0 rounded-xl py-2 w-[120px] shadow-lg"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
            >
              <button
                onClick={() => { setActiveSection(null); setShowNav(false); }}
                className="block w-full text-left px-4 py-1.5 text-[0.7rem] bg-transparent border-none cursor-pointer transition-opacity"
                style={{ color: 'var(--text-primary)', opacity: activeSection === null ? 0.9 : 0.55 }}
              >
                Agents
              </button>
              {(['vault', 'constitution', 'plm', 'library'] as const).map(section => (
                <button
                  key={section}
                  onClick={() => { setActiveSection(section); setShowNav(false); }}
                  className="block w-full text-left px-4 py-1.5 text-[0.7rem] bg-transparent border-none cursor-pointer transition-opacity"
                  style={{
                    color: 'var(--text-primary)',
                    opacity: activeSection === section ? 0.9 : 0.55,
                  }}
                >
                  {section === 'plm' ? 'PLM' : section.charAt(0).toUpperCase() + section.slice(1)}{section === 'constitution' && rlaifReviewCount > 0 ? ` · ${rlaifReviewCount}` : ''}
                </button>
              ))}
              <div className="my-1.5 mx-3" style={{ borderTop: '1px solid var(--border-light)' }} />
              <button
                onClick={e => { e.stopPropagation(); toggleAgentsPaused(); }}
                className="block w-full text-left px-4 py-1.5 text-[0.7rem] bg-transparent border-none cursor-pointer opacity-35 hover:opacity-60 transition-opacity"
                style={{ color: 'var(--text-primary)' }}
              >
                {agentsPaused ? 'resume agents' : 'pause agents'}
              </button>
              <button
                onClick={() => { handleLogout(); setShowNav(false); }}
                className="block w-full text-left px-4 py-1.5 text-[0.7rem] bg-transparent border-none cursor-pointer opacity-35 hover:opacity-60 transition-opacity"
                style={{ color: 'var(--text-primary)' }}
              >
                sign out
              </button>
            </div>
          )}
        </div>
        {/* Theme toggle — fixed right, symmetrical with nav on left */}
        <div className="fixed right-3 top-4 z-[200]">
          <button
            onClick={toggleTheme}
            className="bg-transparent border-none cursor-pointer opacity-40 hover:opacity-60 transition-opacity p-0"
            style={{ color: 'var(--text-primary)' }}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
        {/* Center logo */}
        <div className="flex justify-center">
          <button
            onClick={() => setActiveSection(null)}
            className="text-center bg-transparent border-none cursor-pointer select-none opacity-65 hover:opacity-80 transition-opacity p-0"
          >
            <div className="text-[0.85rem] tracking-wide" style={{ color: 'var(--text-primary)' }}>alexandria.</div>
            <div className="text-[0.7rem] italic opacity-70" style={{ color: 'var(--text-primary)' }}>mentes aeternae</div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div ref={outputScrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {activeSection ? (
          <div className="max-w-[640px] mx-auto px-5 pt-6 pb-8">
            {activeSection === 'vault' && <VaultSection userId={userId} />}
            {activeSection === 'constitution' && (
              <ConstitutionPanel userId={userId} isOpen={true} onClose={() => setActiveSection(null)} inline />
            )}
            {activeSection === 'plm' && <PLMSection userId={userId} />}
            {activeSection === 'library' && <LibrarySection userId={userId} />}
          </div>
        ) : (
          <div className={`max-w-[640px] mx-auto px-5 pt-6 ${isEmpty ? 'h-full flex flex-col' : 'pb-8'}`}>
            <div className="space-y-5">
              <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>Agents</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMode('input')}
                  className={`bg-transparent border-none text-[0.7rem] cursor-pointer transition-opacity duration-300 p-0 ${mode === 'input' ? 'opacity-65' : 'opacity-25 hover:opacity-40'}`}
                  style={{ color: 'var(--text-primary)' }}
                >
                  editor
                </button>
                <span className="text-[0.4rem]" style={{ color: 'var(--text-primary)', opacity: 0.15 }}>·</span>
                <button
                  onClick={() => setMode('output')}
                  className={`bg-transparent border-none text-[0.7rem] cursor-pointer transition-opacity duration-300 p-0 ${mode === 'output' ? 'opacity-65' : 'opacity-25 hover:opacity-40'}`}
                  style={{ color: 'var(--text-primary)' }}
                >
                  orchestrator
                </button>
              </div>
            </div>

            {/* ── EDITOR LANDING ── */}
            {isEmpty && mode === 'input' && (
              <div className="mt-8">
                {pausedConversations.length > 0 && (
                  <div className="mb-5">
                    <div className="text-[0.62rem] tracking-wider uppercase mb-2.5" style={{ color: 'var(--text-primary)', opacity: 0.35 }}>
                      in progress
                    </div>
                    {pausedConversations.map((p, pIdx) => (
                      <button
                        key={`paused-${pIdx}`}
                        onClick={() => resumeConversation(p.topic)}
                        className="block w-full text-left text-[0.85rem] leading-relaxed bg-transparent border-none cursor-pointer py-2.5 px-0 transition-all duration-150"
                        style={{ color: 'var(--text-primary)', opacity: selectedQIndex === pIdx ? 0.75 : 0.4 }}
                      >
                        {p.topic}
                      </button>
                    ))}
                  </div>
                )}

                <div>
                  <div className="text-[0.62rem] tracking-wider uppercase mb-2.5" style={{ color: 'var(--text-primary)', opacity: 0.35 }}>
                    new questions
                  </div>
                  {visibleQuestions.length > 0 ? (
                    visibleQuestions.map((q, qIdx) => {
                      const globalIdx = pausedConversations.length + qIdx;
                      return (
                        <button
                          key={q.id}
                          onClick={() => handlePickQuestion(q.title)}
                          className="block w-full text-left text-[0.85rem] leading-relaxed bg-transparent border-none cursor-pointer py-2.5 px-0 transition-all duration-150"
                          style={{ color: 'var(--text-primary)', opacity: selectedQIndex === globalIdx ? 0.75 : 0.4 }}
                        >
                          {q.title}
                        </button>
                      );
                    })
                  ) : (
                    <div className="space-y-4 animate-pulse">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-3 rounded" style={{ width: `${35 + i * 12}%`, background: 'var(--text-primary)', opacity: 0.06 }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── ORCHESTRATOR LANDING ── */}
            {isEmpty && mode === 'output' && (
              <div className="mt-8">
                {(['activity', 'questions', 'chat'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setOrchestratorTab(tab);
                      if (tab === 'chat') startOrchestratorChat();
                    }}
                    className="block w-full text-left text-[0.85rem] leading-relaxed bg-transparent border-none cursor-pointer py-2.5 px-0 transition-all duration-150"
                    style={{ color: 'var(--text-primary)', opacity: orchestratorTab === tab ? 0.75 : 0.35 }}
                  >
                    {tab}
                  </button>
                ))}

                {orchestratorTab === 'activity' && (
                  <div className="mt-5">
                    <div className="text-[0.8rem] italic" style={{ color: 'var(--text-primary)', opacity: 0.35 }}>
                      coming soon
                    </div>
                  </div>
                )}

                {orchestratorTab === 'questions' && (
                  <div className="mt-5">
                    <div className="text-[0.8rem] italic" style={{ color: 'var(--text-primary)', opacity: 0.35 }}>
                      coming soon
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── ACTIVE CONVERSATION ── */}
            {!isEmpty && (
              <div className="space-y-4">
                {/* Back button — works for both editor and orchestrator chats */}
                <div className="flex justify-end">
                  <button
                    onClick={mode === 'input' ? exitEditorChat : exitOrchestratorChat}
                    className="text-[0.68rem] bg-transparent border-none cursor-pointer opacity-40 hover:opacity-65 transition-opacity flex items-center gap-1.5"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    back
                    <span className="hidden sm:inline text-[0.52rem] px-1.5 py-0.5 rounded ml-0.5" style={{ border: '1px solid var(--border-light)', opacity: 0.6 }}>esc</span>
                  </button>
                </div>
                {currentMessages.map((message) => (
                  <div
                    key={message.id}
                    className={message.role === 'user' ? 'text-right' : 'text-left'}
                  >
                    <div
                      className="text-[0.88rem] leading-[1.8] whitespace-pre-wrap inline-block text-left max-w-[85%]"
                      style={{
                        color: message.role === 'user' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        opacity: message.role === 'user' ? 0.65 : 0.9
                      }}
                    >
                      {message.version && message.version > 1 && (
                        <span className="text-[0.68rem] mr-1" style={{ color: 'var(--text-subtle)' }}>/{message.version}</span>
                      )}
                      {message.content}
                    </div>
                  </div>
                ))}
                <div className="min-h-[2rem]">
                  {showThinking && !outputContent && (
                    <div className="text-left">
                      <span className="text-[0.78rem] italic thinking-pulse" style={{ color: 'var(--text-primary)', opacity: 0.4 }}>thinking</span>
                    </div>
                  )}
                  {outputContent && (
                    <div className="text-left">
                      <div className="text-[0.88rem] leading-[1.8] whitespace-pre-wrap inline-block text-left max-w-[85%]" style={{ color: 'var(--text-secondary)', opacity: 0.9 }}>{outputContent}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input — only shown when in active conversation */}
      {!activeSection && !isEmpty && (
        <div className="px-4 pb-5 pt-1">
          <div className="max-w-[640px] mx-auto">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  feedbackPhase === 'binary' ? 'good? y / n' :
                  feedbackPhase === 'comment' ? 'feedback' :
                  feedbackPhase === 'regenerate' ? 'regenerate? y / n' :
                  feedbackPhase === 'wrap_up' ? 'y / n' : ''
                }
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                enterKeyHint="send"
                data-form-type="other"
                className={`w-full border-none rounded-2xl text-[0.88rem] py-3.5 pr-12 pl-5 outline-none ${feedbackPhase !== 'none' ? 'placeholder-italic' : ''}`}
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  caretColor: 'var(--caret-color)'
                }}
              />
              <button
                onClick={handleSubmit}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-none text-lg cursor-pointer opacity-20 hover:opacity-40 transition-opacity scale-y-[0.8]"
                style={{ color: 'var(--text-primary)' }}
              >
                →
              </button>
            </div>
            <div className="h-3 mt-1 flex justify-center">
              {feedbackSaved && (
                <span className="text-[0.7rem] italic thinking-pulse" style={{ color: 'var(--text-primary)', opacity: 0.3 }}>noted</span>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out; }
        @keyframes thinkingPulse {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.5; }
        }
        .thinking-pulse { animation: thinkingPulse 1.8s ease-in-out infinite; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 2px; }
      `}</style>

      <RlaifReviewPanel
        userId={userId}
        isOpen={showRlaifReview}
        onClose={() => setShowRlaifReview(false)}
        onReviewed={refreshRlaifReviewCount}
      />

    </div>
  );
}
