'use client';
import { useState, useEffect, useRef, KeyboardEvent } from 'react';
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
  const [pasteText, setPasteText] = useState('');
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

  const uploadPaste = async () => {
    const text = pasteText.trim();
    if (!text) return;
    setUploading(true);
    try {
      const res = await fetch('/api/bulk-ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, userId, source: 'paste' })
      });
      if (res.ok) { setPasteText(''); setMessage('stored. editor will process gradually.'); }
    } catch {}
    setUploading(false);
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

      <div
        className="rounded-xl p-4"
        style={{ background: 'var(--bg-secondary)' }}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
      >
        <label className="inline-block cursor-pointer text-xs" style={{ color: 'var(--text-primary)', opacity: 0.6 }}>
          choose files
          <input type="file" multiple accept=".md,.txt" className="hidden" onChange={e => { if (e.target.files) addFiles(e.target.files); e.currentTarget.value = ''; }} />
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="text-xs opacity-60">{f.name} ({(f.size / 1024).toFixed(0)} KB)</div>
          ))}
          <button onClick={uploadAll} disabled={uploading} className="rounded-lg px-3 py-2 text-xs disabled:opacity-50 border-none cursor-pointer" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
            {uploading ? 'uploading...' : `upload ${files.length} file${files.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      <div className="space-y-2">
        <textarea
          value={pasteText}
          onChange={e => setPasteText(e.target.value)}
          placeholder="or paste text here..."
          className="w-full min-h-[80px] rounded-lg px-3 py-2 text-xs border-none outline-none"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        />
        {pasteText.trim() && (
          <button onClick={uploadPaste} disabled={uploading} className="rounded-lg px-3 py-2 text-xs disabled:opacity-50 border-none cursor-pointer" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
            upload text
          </button>
        )}
      </div>

      {message && <div className="text-xs" style={{ color: 'var(--text-subtle)' }}>{message}</div>}

      {/* Editor progress — compact */}
      {status && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[0.65rem]" style={{ color: 'var(--text-subtle)' }}>
            <span>{status.processed} / {status.total}</span>
            {status.remaining > 0 && <span className="thinking-pulse">{status.remaining} remaining</span>}
          </div>
          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-light)' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${status.percentComplete}%`, background: 'var(--text-subtle)', opacity: status.remaining > 0 ? 0.5 : 0.3 }} />
          </div>
          <button onClick={reprocess} disabled={reprocessing} className="text-[0.65rem] bg-transparent border-none cursor-pointer disabled:opacity-50 p-0" style={{ color: 'var(--text-subtle)' }}>
            {reprocessing ? 'resetting...' : 're-process everything'}
          </button>
        </div>
      )}
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

  if (loading) return <div className="py-12 text-center"><span className="text-[0.7rem] italic thinking-pulse" style={{ color: 'var(--text-primary)', opacity: 0.3 }}>loading</span></div>;

  return (
    <div className="space-y-5">
      <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>PLM</h2>

      {summary ? (
        <div className="space-y-1">
          {/* Active model */}
          <div className="flex items-center justify-between py-2.5 px-1">
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
              {cleanModelName(summary.active_model)}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>active</span>
          </div>

          {/* Previous exports as history */}
          {summary.recent_exports
            .filter(e => e.resulting_model_id && e.status === 'active' && e.resulting_model_id !== summary.active_model)
            .map(e => (
              <div key={e.id} className="flex items-center justify-between py-2.5 px-1">
                <span className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.5 }}>
                  {cleanModelName(e.resulting_model_id!)}
                </span>
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

interface AuthoredWork { id: string; title: string; medium: string; content?: string; summary?: string; published_at: string; }
interface CuratedInfluence { id: string; title: string; medium: string; annotation?: string; url?: string; }
interface AuthorProfile { user_id?: string; display_name?: string; handle?: string; bio?: string; works_count?: number; influences_count?: number; }

function PersonaModal({ persona, onClose, works, influences, loading }: {
  persona: AuthorProfile;
  onClose: () => void;
  works: AuthoredWork[];
  influences: CuratedInfluence[];
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
                <div className="text-[0.65rem] tracking-wider uppercase" style={{ color: 'var(--text-subtle)' }}>Works</div>
                {works.map(w => (
                  <div key={w.id} className="text-sm py-1" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>{w.title}</div>
                ))}
              </div>
            )}

            {influences.length > 0 && (
              <div className="space-y-2">
                <div className="text-[0.65rem] tracking-wider uppercase" style={{ color: 'var(--text-subtle)' }}>Influences</div>
                {influences.map(inf => (
                  inf.url ? (
                    <a key={inf.id} href={inf.url} target="_blank" rel="noopener noreferrer" className="block text-sm py-1 no-underline truncate" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                      {inf.title || inf.url} <span style={{ color: 'var(--text-subtle)', fontSize: '0.6rem' }}>↗</span>
                    </a>
                  ) : (
                    <div key={inf.id} className="text-sm py-1" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>{inf.title}</div>
                  )
                ))}
              </div>
            )}

            {works.length === 0 && influences.length === 0 && (
              <div className="py-6 text-center"><div className="text-xs italic" style={{ color: 'var(--text-subtle)' }}>nothing yet</div></div>
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
  const [myInfluences, setMyInfluences] = useState<CuratedInfluence[]>([]);
  const [saving, setSaving] = useState(false);

  const [showMyModal, setShowMyModal] = useState(false);
  const [modalPersona, setModalPersona] = useState<AuthorProfile | null>(null);
  const [modalWorks, setModalWorks] = useState<AuthoredWork[]>([]);
  const [modalInfluences, setModalInfluences] = useState<CuratedInfluence[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [workTitle, setWorkTitle] = useState('');
  const [showWorkTitle, setShowWorkTitle] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
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
          setMyInfluences(d.influences || []);
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
        setModalInfluences(data.influences || []);
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
    const text = await file.text();
    const title = workTitle.trim() || file.name;
    try {
      const res = await fetch('/api/neo-biography', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish', userId, title, content: text, medium: 'other' })
      });
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

  const addLink = async () => {
    const url = linkInput.trim();
    if (!url) return;
    setSaving(true);
    const title = linkTitle.trim() || url;
    try {
      const res = await fetch('/api/neo-biography', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_influence', userId, title, medium: 'other', url })
      });
      if (res.ok) {
        const data = await res.json();
        setMyInfluences(prev => [data.influence, ...prev]);
        setLinkInput('');
        setLinkTitle('');
        setShowLinkInput(false);
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

  const deleteInfluence = async (id: string) => {
    try {
      const res = await fetch('/api/neo-biography', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_influence', id, userId })
      });
      if (res.ok) setMyInfluences(prev => prev.filter(i => i.id !== id));
    } catch {}
  };

  const renameItem = async (id: string, type: 'work' | 'influence', title: string) => {
    const action = type === 'work' ? 'rename_work' : 'rename_influence';
    try {
      const res = await fetch('/api/neo-biography', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id, userId, title })
      });
      if (res.ok) {
        if (type === 'work') setMyWorks(prev => prev.map(w => w.id === id ? { ...w, title } : w));
        else setMyInfluences(prev => prev.map(i => i.id === id ? { ...i, title } : i));
        setEditingId(null);
      }
    } catch {}
  };

  if (loading) return <div className="py-16 text-center"><span className="text-[0.7rem] italic thinking-pulse" style={{ color: 'var(--text-primary)', opacity: 0.3 }}>loading</span></div>;

  const myName = myProfile.display_name || myProfile.handle || 'you';

  return (
    <div className="space-y-6">
      {/* Quote */}
      <div className="pt-6 pb-2 text-center">
        <div className="text-[0.82rem] italic leading-relaxed font-light" style={{ color: 'var(--text-primary)', opacity: 0.4 }}>
          &ldquo;Make something wonderful and put it out there.&rdquo;
        </div>
        <div className="text-[0.6rem] mt-2 tracking-widest uppercase" style={{ color: 'var(--text-subtle)' }}>Steve Jobs</div>
      </div>

      {/* Your name — click to open editing modal */}
      <button
        onClick={() => setShowMyModal(true)}
        className="w-full text-left bg-transparent border-none cursor-pointer p-0"
      >
        <div className="text-lg font-extralight" style={{ color: 'var(--text-primary)' }}>{myName}</div>
        <div className="text-[0.6rem] mt-0.5 flex gap-3" style={{ color: 'var(--text-subtle)' }}>
          {myWorks.length > 0 && <span>{myWorks.length} work{myWorks.length !== 1 ? 's' : ''}</span>}
          {myInfluences.length > 0 && <span>{myInfluences.length} influence{myInfluences.length !== 1 ? 's' : ''}</span>}
          {myWorks.length === 0 && myInfluences.length === 0 && <span>tap to add works &amp; influences</span>}
        </div>
      </button>

      {/* Separator + other personas */}
      {personas.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: 'var(--border-light)' }} />
            <span className="text-[0.6rem] tracking-widest uppercase" style={{ color: 'var(--text-subtle)' }}>others</span>
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
                  <span className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.5 }}>{pName}</span>
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
                <div className="flex items-center justify-between">
                  <div className="text-[0.65rem] tracking-wider uppercase" style={{ color: 'var(--text-subtle)' }}>Works</div>
                  <label className="text-[0.65rem] cursor-pointer" style={{ color: 'var(--text-subtle)' }}>
                    {saving ? '...' : '+'}
                    <input
                      type="file"
                      accept=".pdf,.md,.txt,.doc,.docx"
                      className="hidden"
                      onChange={e => { if (e.target.files?.[0]) handleFileSelected(e.target.files[0]); e.currentTarget.value = ''; }}
                    />
                  </label>
                </div>

                {showWorkTitle && (
                  <div className="flex gap-2 items-center">
                    <input value={workTitle} onChange={e => setWorkTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submitWork(); }} placeholder="title" autoFocus className="flex-1 rounded-lg px-3 py-2 text-sm border-none outline-none" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                    <button onClick={submitWork} disabled={saving} className="text-xs bg-transparent border-none cursor-pointer disabled:opacity-50" style={{ color: 'var(--text-primary)' }}>{saving ? '...' : 'add'}</button>
                    <button onClick={() => { setShowWorkTitle(false); pendingFileRef.current = null; }} className="text-xs bg-transparent border-none cursor-pointer" style={{ color: 'var(--text-subtle)' }}>×</button>
                  </div>
                )}

                {myWorks.map(w => (
                  <div key={w.id} className="flex items-center justify-between py-2 group">
                    {editingId === w.id ? (
                      <input
                        value={editingTitle}
                        onChange={e => setEditingTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') renameItem(w.id, 'work', editingTitle); if (e.key === 'Escape') setEditingId(null); }}
                        onBlur={() => renameItem(w.id, 'work', editingTitle)}
                        autoFocus
                        className="flex-1 text-sm border-none outline-none bg-transparent"
                        style={{ color: 'var(--text-primary)' }}
                      />
                    ) : (
                      <button onClick={() => { setEditingId(w.id); setEditingTitle(w.title); }} className="text-sm bg-transparent border-none cursor-pointer text-left p-0 flex-1" style={{ color: 'var(--text-primary)' }}>
                        {w.title}
                      </button>
                    )}
                    <button onClick={() => deleteWork(w.id)} className="text-[0.6rem] bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-40 transition-opacity ml-3" style={{ color: 'var(--text-primary)' }}>×</button>
                  </div>
                ))}

                {myWorks.length === 0 && !showWorkTitle && (
                  <div className="text-xs italic py-2" style={{ color: 'var(--text-subtle)' }}>no works yet</div>
                )}
              </div>

              {/* Influences section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[0.65rem] tracking-wider uppercase" style={{ color: 'var(--text-subtle)' }}>Influences</div>
                  <button onClick={() => setShowLinkInput(!showLinkInput)} className="text-[0.65rem] bg-transparent border-none cursor-pointer p-0" style={{ color: 'var(--text-subtle)' }}>+</button>
                </div>

                {showLinkInput && (
                  <div className="space-y-2">
                    <input value={linkInput} onChange={e => setLinkInput(e.target.value)} placeholder="paste a link" autoFocus className="w-full rounded-lg px-3 py-2 text-sm border-none outline-none" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                    <div className="flex gap-2 items-center">
                      <input value={linkTitle} onChange={e => setLinkTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addLink(); }} placeholder="title (optional)" className="flex-1 rounded-lg px-3 py-2 text-sm border-none outline-none" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                      <button onClick={addLink} disabled={saving || !linkInput.trim()} className="text-xs bg-transparent border-none cursor-pointer disabled:opacity-50" style={{ color: 'var(--text-primary)' }}>{saving ? '...' : 'add'}</button>
                    </div>
                  </div>
                )}

                {myInfluences.map(inf => (
                  <div key={inf.id} className="flex items-center justify-between py-2 group">
                    {editingId === inf.id ? (
                      <input
                        value={editingTitle}
                        onChange={e => setEditingTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') renameItem(inf.id, 'influence', editingTitle); if (e.key === 'Escape') setEditingId(null); }}
                        onBlur={() => renameItem(inf.id, 'influence', editingTitle)}
                        autoFocus
                        className="flex-1 text-sm border-none outline-none bg-transparent"
                        style={{ color: 'var(--text-primary)' }}
                      />
                    ) : (
                      <div className="flex-1 min-w-0">
                        <button onClick={() => { setEditingId(inf.id); setEditingTitle(inf.title); }} className="text-sm bg-transparent border-none cursor-pointer text-left p-0 block" style={{ color: 'var(--text-primary)' }}>
                          {inf.title !== inf.url ? inf.title : ''}
                        </button>
                        {inf.url && (
                          <a href={inf.url} target="_blank" rel="noopener noreferrer" className="text-[0.6rem] truncate block no-underline" style={{ color: 'var(--text-subtle)' }}>
                            {inf.url} ↗
                          </a>
                        )}
                      </div>
                    )}
                    <button onClick={() => deleteInfluence(inf.id)} className="text-[0.6rem] bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-40 transition-opacity ml-3 flex-shrink-0" style={{ color: 'var(--text-primary)' }}>×</button>
                  </div>
                ))}

                {myInfluences.length === 0 && !showLinkInput && (
                  <div className="text-xs italic py-2" style={{ color: 'var(--text-subtle)' }}>no influences yet</div>
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
          onClose={() => { setModalPersona(null); setModalWorks([]); setModalInfluences([]); }}
          works={modalWorks}
          influences={modalInfluences}
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
  
  const [showRlaifReview, setShowRlaifReview] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [rlaifReviewCount, setRlaifReviewCount] = useState(0);
  const [activeSection, setActiveSection] = useState<'vault' | 'constitution' | 'plm' | 'library' | null>(null);
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
      setMode('output');
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

  // Auto-scroll for all conversation modes
  useEffect(() => {
    if (outputScrollRef.current) {
      setTimeout(() => {
        outputScrollRef.current?.scrollTo({
          top: outputScrollRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [trainingMessages, outputMessages, inputMessages, mode]);

  // Auto-scroll during streaming
  useEffect(() => {
    if (outputContent && outputScrollRef.current) {
      outputScrollRef.current.scrollTo({
        top: outputScrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
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

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Carbon y/n lock (wrap_up, offer_questions, topic_continue phases)
    if (carbonLockYN && mode === 'input') {
      if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        setCarbonLockYN(false);
        handleCarbonYN('y');
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setCarbonLockYN(false);
        handleCarbonYN('n');
        return;
      }
      // Block and shake on other keys
      if (e.key.length === 1) {
        e.preventDefault();
        shakeInput();
      }
      return;
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
      setInputMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: assistantContent }]);
      setOutputContent('');

      if (newState.phase === 'goodbye') {
        setTimeout(() => {
          setCarbonState({ phase: 'collecting' });
          setCarbonLockYN(false);
        }, 2000);
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
                // Handle state updates from server
                if (data.state) {
                  newState = data.state;
                }
                if (data.lockYN !== undefined) {
                  shouldLockYN = data.lockYN;
                }
              } catch {
                // Ignore parse errors for non-JSON lines
              }
            }
          }
        }
      }

      // Update conversation state
      setCarbonState(newState);
      setCarbonLockYN(shouldLockYN);

      // Add to input messages history
      setInputMessages(prev => [...prev, { 
        id: assistantId, 
        role: 'assistant', 
        content: assistantContent 
      }]);
      
      // Clear output content to avoid duplicate display
      setOutputContent('');
      
      // Reset state if conversation ended
      if (newState.phase === 'goodbye') {
        setTimeout(() => {
          setCarbonState({ phase: 'collecting' });
          setCarbonLockYN(false);
        }, 2000);
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
      <div className="z-50 relative px-5 py-4">
        <div className="max-w-[740px] mx-auto flex items-center justify-between relative">
          <div className="relative min-w-[60px]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowNav(prev => !prev)}
              className="bg-transparent border-none text-[0.75rem] cursor-pointer opacity-35 hover:opacity-55 transition-opacity flex items-center gap-1"
              style={{ color: 'var(--text-primary)' }}
            >
              {username}
              <ChevronDown size={10} strokeWidth={1.5} className={`transition-transform ${showNav ? 'rotate-180' : ''}`} />
            </button>
            {showNav && (
              <div
                className="absolute top-7 left-0 z-50 rounded-xl py-2 min-w-[140px] shadow-lg"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
              >
                <button
                  onClick={() => { setActiveSection(null); setShowNav(false); }}
                  className="block w-full text-left px-4 py-1.5 text-[0.7rem] bg-transparent border-none cursor-pointer transition-opacity"
                  style={{ color: 'var(--text-primary)', opacity: activeSection === null ? 0.9 : 0.5 }}
                >
                  Chat
                </button>
                {(['vault', 'constitution', 'plm', 'library'] as const).map(section => (
                  <button
                    key={section}
                    onClick={() => { setActiveSection(section); setShowNav(false); }}
                    className="block w-full text-left px-4 py-1.5 text-[0.7rem] bg-transparent border-none cursor-pointer transition-opacity"
                    style={{
                      color: 'var(--text-primary)',
                      opacity: activeSection === section ? 0.9 : 0.5,
                    }}
                  >
                    {section.charAt(0).toUpperCase() + section.slice(1)}{section === 'constitution' && rlaifReviewCount > 0 ? ` · ${rlaifReviewCount}` : ''}
                  </button>
                ))}
                <div className="my-1.5 mx-3" style={{ borderTop: '1px solid var(--border-light)' }} />
                <button
                  onClick={() => { handleLogout(); setShowNav(false); }}
                  className="block w-full text-left px-4 py-1.5 text-[0.7rem] bg-transparent border-none cursor-pointer opacity-30 hover:opacity-60 transition-opacity"
                  style={{ color: 'var(--text-primary)' }}
                >
                  sign out
                </button>
              </div>
            )}
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none select-none opacity-65">
            <div className="text-[0.85rem] tracking-wide" style={{ color: 'var(--text-primary)' }}>alexandria.</div>
            <div className="text-[0.7rem] italic opacity-70" style={{ color: 'var(--text-primary)' }}>mentes aeternae</div>
          </div>
          <button
            onClick={toggleTheme}
            className="bg-transparent border-none cursor-pointer opacity-35 hover:opacity-55 transition-opacity p-1"
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
      </div>

      {/* Content */}
      <div ref={outputScrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {activeSection ? (
          <div className="max-w-[640px] mx-auto px-5 pt-2 pb-8">
            {activeSection === 'vault' && <VaultSection userId={userId} />}
            {activeSection === 'constitution' && (
              <ConstitutionPanel userId={userId} isOpen={true} onClose={() => setActiveSection(null)} inline />
            )}
            {activeSection === 'plm' && <PLMSection userId={userId} />}
            {activeSection === 'library' && <LibrarySection userId={userId} />}
          </div>
        ) : (
          <div className={`max-w-[640px] mx-auto px-5 ${isEmpty ? 'h-full' : 'pt-1 pb-8'}`}>
            {!isEmpty && (
              <div className="space-y-4">
                {currentMessages.map((message) => (
                  <div
                    key={message.id}
                    className={message.role === 'user' ? 'text-right' : 'text-left'}
                  >
                    <div
                      className="text-[0.88rem] leading-[1.8] whitespace-pre-wrap inline-block text-left max-w-[85%]"
                      style={{
                        color: message.role === 'user' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        opacity: message.role === 'user' ? 0.55 : 0.85
                      }}
                    >
                      {message.version && message.version > 1 && (
                        <span className="text-[0.68rem] mr-1" style={{ color: 'var(--text-subtle)' }}>/{message.version}</span>
                      )}
                      {message.content}
                    </div>
                  </div>
                ))}
                {showThinking && !outputContent && (
                  <div className="text-left">
                    <span className="text-[0.75rem] italic thinking-pulse" style={{ color: 'var(--text-primary)', opacity: 0.35 }}>thinking</span>
                  </div>
                )}
                {outputContent && (
                  <div className="text-left">
                    <div className="text-[0.88rem] leading-[1.8] whitespace-pre-wrap inline-block text-left max-w-[85%]" style={{ color: 'var(--text-secondary)', opacity: 0.85 }}>{outputContent}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input — hidden when viewing a section */}
      {!activeSection && (
        <div className="px-4 pb-6 pt-2">
          <div className="max-w-[640px] mx-auto">
            <div className="flex items-center justify-center gap-3 mb-3">
              <button
                onClick={() => setMode('input')}
                className={`bg-transparent border-none text-[0.75rem] cursor-pointer transition-opacity duration-300 ${mode === 'input' ? 'opacity-60' : 'opacity-20 hover:opacity-35'}`}
                style={{ color: 'var(--text-primary)' }}
              >
                editor
              </button>
              <span className="text-[0.45rem]" style={{ color: 'var(--text-primary)', opacity: 0.12 }}>·</span>
              <button
                onClick={() => setMode('output')}
                className={`bg-transparent border-none text-[0.75rem] cursor-pointer transition-opacity duration-300 ${mode === 'output' ? 'opacity-60' : 'opacity-20 hover:opacity-35'}`}
                style={{ color: 'var(--text-primary)' }}
              >
                orchestrator
              </button>
            </div>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  carbonLockYN && mode === 'input' ? 'y / n' :
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
                className={`w-full border-none rounded-2xl text-[0.88rem] py-4 pr-12 pl-5 outline-none shadow-sm ${(feedbackPhase !== 'none' || carbonLockYN) ? 'placeholder-italic' : ''}`}
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
            <div className="h-4 mt-1.5 flex justify-center">
              {feedbackSaved && (
                <span className="text-[0.7rem] italic" style={{ color: 'var(--text-primary)', opacity: 0.3 }}>noted.</span>
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
