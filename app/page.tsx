'use client';
import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';
import AuthScreen from './components/AuthScreen';
import LandingPage from './components/LandingPage';
import ConstitutionPanel from './components/ConstitutionPanel';
import RlaifReviewPanel from './components/RlaifReviewPanel';
import { useTheme } from './components/ThemeProvider';
import { Sun, Moon, ChevronDown } from 'lucide-react';


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

function VaultSection({ userId }: { userId: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [reprocessing, setReprocessing] = useState(false);
  const [pasteText, setPasteText] = useState('');

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
  };

  return (
    <div className="space-y-5">
      <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>Vault</h2>
      <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>upload data. the editor processes it gradually in the background.</p>

      <div
        className="rounded-xl border-2 border-dashed p-6 text-center"
        style={{ borderColor: 'var(--border-light)' }}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
      >
        <div className="text-sm opacity-60">drag files here</div>
        <label className="inline-block mt-2 cursor-pointer rounded-lg px-3 py-1 text-xs" style={{ background: 'var(--bg-secondary)' }}>
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

      <div className="pt-3 border-t" style={{ borderColor: 'var(--border-light)' }}>
        <div className="text-xs mb-2" style={{ color: 'var(--text-subtle)' }}>re-process all data — useful when models improve</div>
        <button onClick={reprocess} disabled={reprocessing} className="rounded-lg px-3 py-2 text-xs disabled:opacity-50 border-none cursor-pointer" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
          {reprocessing ? 'resetting...' : 're-process everything'}
        </button>
      </div>

      {message && <div className="text-xs" style={{ color: 'var(--text-subtle)' }}>{message}</div>}
    </div>
  );
}

function PLMSection({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{ total: number; available: number; high_quality: number; tier: string; active_model: string } | null>(null);
  const [training, setTraining] = useState(false);
  const [message, setMessage] = useState('');

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

  const startTraining = async () => {
    setTraining(true);
    setMessage('');
    try {
      const expRes = await fetch('/api/training/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (!expRes.ok) { setMessage('export failed.'); setTraining(false); return; }
      const exp = await expRes.json();
      const trainRes = await fetch('/api/training/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, exportId: exp.exportId })
      });
      if (trainRes.ok) {
        setMessage('training started.');
      } else {
        setMessage('training failed.');
      }
    } catch { setMessage('error.'); }
    setTraining(false);
  };

  if (loading) return <div className="py-12 text-center"><span className="text-[0.7rem] italic thinking-pulse" style={{ color: 'var(--text-primary)', opacity: 0.3 }}>loading</span></div>;

  return (
    <div className="space-y-5">
      <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>PLM</h2>
      <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>personal language model — fine-tuned on your cognition.</p>

      {summary ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)' }}>
              <div className="text-xs opacity-50">training pairs</div>
              <div className="text-lg">{summary.available}</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)' }}>
              <div className="text-xs opacity-50">tier</div>
              <div className="text-lg">{summary.tier}</div>
            </div>
          </div>
          {summary.active_model && summary.active_model !== 'none' && (
            <div className="text-xs" style={{ color: 'var(--text-subtle)' }}>active model: {summary.active_model}</div>
          )}
          <button
            onClick={startTraining}
            disabled={training || summary.available < 10}
            className="rounded-lg px-3 py-2 text-xs disabled:opacity-50 border-none cursor-pointer"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            {training ? 'starting...' : 'train plm'}
          </button>
          {message && <div className="text-xs" style={{ color: 'var(--text-subtle)' }}>{message}</div>}
        </div>
      ) : (
        <div className="text-xs" style={{ color: 'var(--text-subtle)' }}>no training data yet. chat with the editor to generate training pairs.</div>
      )}
    </div>
  );
}

type LibraryTab = 'profile' | 'works' | 'influences';

interface AuthoredWork { id: string; title: string; medium: string; summary?: string; published_at: string; }
interface CuratedInfluence { id: string; title: string; medium: string; annotation?: string; url?: string; }
interface AuthorProfile { display_name?: string; handle?: string; bio?: string; }

function LibrarySection({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<LibraryTab>('profile');
  const [profile, setProfile] = useState<AuthorProfile>({});
  const [works, setWorks] = useState<AuthoredWork[]>([]);
  const [influences, setInfluences] = useState<CuratedInfluence[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Form states
  const [editName, setEditName] = useState('');
  const [editHandle, setEditHandle] = useState('');
  const [editBio, setEditBio] = useState('');
  const [workTitle, setWorkTitle] = useState('');
  const [workMedium, setWorkMedium] = useState('essay');
  const [workContent, setWorkContent] = useState('');
  const [infTitle, setInfTitle] = useState('');
  const [infMedium, setInfMedium] = useState('book');
  const [infAnnotation, setInfAnnotation] = useState('');
  const [infUrl, setInfUrl] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/neo-biography?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          const p = data.profile || {};
          setProfile(p);
          setEditName(p.display_name || '');
          setEditHandle(p.handle || '');
          setEditBio(p.bio || '');
          setWorks(data.works || []);
          setInfluences(data.influences || []);
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [userId]);

  const saveProfile = async () => {
    setSaving(true); setMessage('');
    try {
      const res = await fetch('/api/neo-biography', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_profile', userId, displayName: editName, handle: editHandle, bio: editBio })
      });
      if (res.ok) { setMessage('saved.'); setProfile({ display_name: editName, handle: editHandle, bio: editBio }); }
    } catch {} setSaving(false);
  };

  const publishWork = async () => {
    if (!workTitle.trim() || !workContent.trim()) return;
    setSaving(true); setMessage('');
    try {
      const res = await fetch('/api/neo-biography', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish', userId, title: workTitle, content: workContent, medium: workMedium })
      });
      if (res.ok) {
        const data = await res.json();
        setWorks(prev => [data.work, ...prev]);
        setWorkTitle(''); setWorkContent(''); setMessage('published.');
      }
    } catch {} setSaving(false);
  };

  const addInfluence = async () => {
    if (!infTitle.trim()) return;
    setSaving(true); setMessage('');
    try {
      const res = await fetch('/api/neo-biography', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_influence', userId, title: infTitle, medium: infMedium, annotation: infAnnotation, url: infUrl })
      });
      if (res.ok) {
        const data = await res.json();
        setInfluences(prev => [data.influence, ...prev]);
        setInfTitle(''); setInfAnnotation(''); setInfUrl(''); setMessage('added.');
      }
    } catch {} setSaving(false);
  };

  if (loading) return <div className="py-12 text-center"><span className="text-[0.7rem] italic thinking-pulse" style={{ color: 'var(--text-primary)', opacity: 0.3 }}>loading</span></div>;

  const tabs: { id: LibraryTab; label: string }[] = [
    { id: 'profile', label: 'profile' },
    { id: 'works', label: `works (${works.length})` },
    { id: 'influences', label: `influences (${influences.length})` },
  ];

  const inputStyle = { background: 'var(--bg-secondary)', color: 'var(--text-primary)' };
  const btnStyle = { background: 'var(--bg-secondary)', color: 'var(--text-primary)' };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>Library</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>your neo-biography — authored works, curated influences, interactive persona.</p>
      </div>

      <div className="flex gap-3 border-b" style={{ borderColor: 'var(--border-light)' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setMessage(''); }}
            className="pb-2 text-xs bg-transparent border-none cursor-pointer transition-opacity"
            style={{ color: 'var(--text-primary)', opacity: tab === t.id ? 1 : 0.4, borderBottom: tab === t.id ? '2px solid var(--text-primary)' : 'none' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="space-y-3">
          <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="display name" className="w-full rounded-lg px-3 py-2 text-sm border-none outline-none" style={inputStyle} />
          <input value={editHandle} onChange={e => setEditHandle(e.target.value)} placeholder="handle" className="w-full rounded-lg px-3 py-2 text-sm border-none outline-none" style={inputStyle} />
          <textarea value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="bio — who you are, in your own words" className="w-full min-h-[80px] rounded-lg px-3 py-2 text-sm border-none outline-none" style={inputStyle} />
          <button onClick={saveProfile} disabled={saving} className="rounded-lg px-3 py-2 text-xs disabled:opacity-50 border-none cursor-pointer" style={btnStyle}>
            {saving ? 'saving...' : 'save profile'}
          </button>
        </div>
      )}

      {tab === 'works' && (
        <div className="space-y-4">
          {works.length > 0 && (
            <div className="space-y-2">
              {works.map(w => (
                <div key={w.id} className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm">{w.title}</div>
                      <div className="text-xs opacity-40 mt-0.5">{w.medium}</div>
                    </div>
                    <div className="text-xs opacity-30">{new Date(w.published_at).toLocaleDateString()}</div>
                  </div>
                  {w.summary && <div className="text-xs opacity-50 mt-2 line-clamp-2">{w.summary}</div>}
                </div>
              ))}
            </div>
          )}
          <div className="pt-3 border-t space-y-2" style={{ borderColor: 'var(--border-light)' }}>
            <div className="text-xs" style={{ color: 'var(--text-subtle)' }}>publish a work — frozen on publication</div>
            <input value={workTitle} onChange={e => setWorkTitle(e.target.value)} placeholder="title" className="w-full rounded-lg px-3 py-2 text-sm border-none outline-none" style={inputStyle} />
            <select value={workMedium} onChange={e => setWorkMedium(e.target.value)} className="w-full rounded-lg px-3 py-2 text-xs border-none outline-none" style={inputStyle}>
              {['essay', 'poetry', 'note', 'letter', 'reflection', 'speech', 'other'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <textarea value={workContent} onChange={e => setWorkContent(e.target.value)} placeholder="content" className="w-full min-h-[120px] rounded-lg px-3 py-2 text-sm border-none outline-none" style={inputStyle} />
            <button onClick={publishWork} disabled={saving || !workTitle.trim() || !workContent.trim()} className="rounded-lg px-3 py-2 text-xs disabled:opacity-50 border-none cursor-pointer" style={btnStyle}>
              {saving ? 'publishing...' : 'publish'}
            </button>
          </div>
        </div>
      )}

      {tab === 'influences' && (
        <div className="space-y-4">
          {influences.length > 0 && (
            <div className="space-y-2">
              {influences.map(inf => (
                <div key={inf.id} className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm">{inf.title}</div>
                      <div className="text-xs opacity-40 mt-0.5">{inf.medium}</div>
                    </div>
                    {inf.url && <a href={inf.url} target="_blank" rel="noopener noreferrer" className="text-xs opacity-30 hover:opacity-60">link</a>}
                  </div>
                  {inf.annotation && <div className="text-xs opacity-50 mt-2 italic">{inf.annotation}</div>}
                </div>
              ))}
            </div>
          )}
          <div className="pt-3 border-t space-y-2" style={{ borderColor: 'var(--border-light)' }}>
            <div className="text-xs" style={{ color: 'var(--text-subtle)' }}>add an influence — what shaped you</div>
            <input value={infTitle} onChange={e => setInfTitle(e.target.value)} placeholder="title" className="w-full rounded-lg px-3 py-2 text-sm border-none outline-none" style={inputStyle} />
            <select value={infMedium} onChange={e => setInfMedium(e.target.value)} className="w-full rounded-lg px-3 py-2 text-xs border-none outline-none" style={inputStyle}>
              {['book', 'film', 'music', 'video', 'podcast', 'essay', 'art', 'lecture', 'other'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <textarea value={infAnnotation} onChange={e => setInfAnnotation(e.target.value)} placeholder="why this matters to you" className="w-full min-h-[60px] rounded-lg px-3 py-2 text-sm border-none outline-none" style={inputStyle} />
            <input value={infUrl} onChange={e => setInfUrl(e.target.value)} placeholder="link (optional)" className="w-full rounded-lg px-3 py-2 text-sm border-none outline-none" style={inputStyle} />
            <button onClick={addInfluence} disabled={saving || !infTitle.trim()} className="rounded-lg px-3 py-2 text-xs disabled:opacity-50 border-none cursor-pointer" style={btnStyle}>
              {saving ? 'adding...' : 'add influence'}
            </button>
          </div>
        </div>
      )}

      {message && <div className="text-xs" style={{ color: 'var(--text-subtle)' }}>{message}</div>}
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

  // Auto-scroll for training and output mode conversations
  useEffect(() => {
    if ((mode === 'training' || mode === 'output') && outputScrollRef.current) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        outputScrollRef.current?.scrollTo({
          top: outputScrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);
  }
  }, [trainingMessages, outputMessages, mode]);

  // Auto-scroll during streaming in training/output mode
  useEffect(() => {
    if ((mode === 'training' || mode === 'output') && outputContent && outputScrollRef.current) {
      outputScrollRef.current.scrollTo({
        top: outputScrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [outputContent, mode]);

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
      <div className="flex items-center justify-between px-5 py-4 z-50 relative">
        <div className="relative min-w-[60px]" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setShowNav(prev => !prev)}
            className="bg-transparent border-none text-[0.7rem] cursor-pointer opacity-25 hover:opacity-50 transition-opacity flex items-center gap-1"
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
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none select-none">
          <div className="text-[0.95rem] font-extralight tracking-[0.2em]" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Alexandria</div>
          <div className="text-[0.58rem] italic mt-0.5 tracking-[0.15em]" style={{ color: 'var(--text-primary)', opacity: 0.5 }}>mentes aeternae</div>
        </div>
        <button
          onClick={toggleTheme}
          className="bg-transparent border-none cursor-pointer opacity-25 hover:opacity-50 transition-opacity p-1"
          style={{ color: 'var(--text-primary)' }}
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
        </button>
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
              <div className="space-y-5">
                {currentMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className="max-w-[82%] rounded-2xl px-4 py-2.5"
                      style={{
                        background: message.role === 'user' ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                        color: message.role === 'user' ? 'var(--text-primary)' : 'var(--text-secondary)'
                      }}
                    >
                      <div className="text-[0.82rem] leading-[1.75] whitespace-pre-wrap">
                        {message.version && message.version > 1 && (
                          <span className="text-[0.68rem] mr-1" style={{ color: 'var(--text-subtle)' }}>/{message.version}</span>
                        )}
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}
                {showThinking && !outputContent && (
                  <div className="flex justify-start px-1">
                    <span className="text-[0.7rem] italic thinking-pulse" style={{ color: 'var(--text-primary)', opacity: 0.3 }}>thinking</span>
                  </div>
                )}
                {outputContent && (
                  <div className="flex justify-start">
                    <div className="max-w-[82%] rounded-2xl px-4 py-2.5" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                      <div className="text-[0.82rem] leading-[1.75] whitespace-pre-wrap">{outputContent}</div>
                    </div>
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
                className={`bg-transparent border-none text-[0.66rem] cursor-pointer transition-opacity duration-300 ${mode === 'input' ? 'opacity-45' : 'opacity-12 hover:opacity-25'}`}
                style={{ color: 'var(--text-primary)' }}
              >
                editor
              </button>
              <span className="text-[0.4rem]" style={{ color: 'var(--text-primary)', opacity: 0.08 }}>·</span>
              <button
                onClick={() => setMode('output')}
                className={`bg-transparent border-none text-[0.66rem] cursor-pointer transition-opacity duration-300 ${mode === 'output' ? 'opacity-45' : 'opacity-12 hover:opacity-25'}`}
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
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-none text-lg cursor-pointer opacity-12 hover:opacity-35 transition-opacity scale-y-[0.8]"
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
