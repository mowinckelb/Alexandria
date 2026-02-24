'use client';

import { useEffect, useState } from 'react';

type Tab = 'publish' | 'influences' | 'profile';

const MEDIUMS = ['essay', 'poetry', 'note', 'letter', 'reflection', 'speech', 'other'] as const;
const INFLUENCE_MEDIUMS = ['book', 'film', 'music', 'video', 'podcast', 'essay', 'art', 'lecture', 'other'] as const;

export default function PublishPage() {
  const [userId, setUserId] = useState('');
  const [tab, setTab] = useState<Tab>('publish');
  const [result, setResult] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Publish state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [medium, setMedium] = useState<string>('essay');

  // Influence state
  const [infTitle, setInfTitle] = useState('');
  const [infMedium, setInfMedium] = useState<string>('book');
  const [infUrl, setInfUrl] = useState('');
  const [infAnnotation, setInfAnnotation] = useState('');

  // Profile state
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    const id = localStorage.getItem('alexandria_user_id') || '';
    setUserId(id);
    if (id) {
      fetch(`/api/neo-biography?userId=${id}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.profile) {
            setDisplayName(data.profile.display_name || '');
            setHandle(data.profile.handle || '');
            setBio(data.profile.bio || '');
          }
        });
    }
  }, []);

  const publish = async () => {
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    setResult('');
    try {
      const res = await fetch('/api/neo-biography', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish', userId, title, content, medium })
      });
      const data = await res.json();
      if (data.success) {
        setResult('published. frozen forever.');
        setTitle('');
        setContent('');
      } else {
        setResult(data.error || 'failed');
      }
    } catch { setResult('failed'); }
    finally { setSubmitting(false); }
  };

  const addInfluence = async () => {
    if (!infTitle.trim()) return;
    setSubmitting(true);
    setResult('');
    try {
      const res = await fetch('/api/neo-biography', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_influence', userId, title: infTitle, medium: infMedium, url: infUrl || undefined, annotation: infAnnotation || undefined })
      });
      const data = await res.json();
      if (data.success) {
        setResult('influence added.');
        setInfTitle('');
        setInfUrl('');
        setInfAnnotation('');
      } else {
        setResult(data.error || 'failed');
      }
    } catch { setResult('failed'); }
    finally { setSubmitting(false); }
  };

  const updateProfile = async () => {
    setSubmitting(true);
    setResult('');
    try {
      const res = await fetch('/api/neo-biography', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_profile', userId, displayName: displayName || undefined, handle: handle || undefined, bio: bio || undefined })
      });
      const data = await res.json();
      setResult(data.success ? 'profile updated.' : (data.error || 'failed'));
    } catch { setResult('failed'); }
    finally { setSubmitting(false); }
  };

  if (!userId) return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="mx-auto max-w-2xl">
        <a href="/" className="text-sm opacity-50 hover:opacity-100 transition-opacity">← home</a>
        <p className="mt-4 text-sm opacity-50">sign in first.</p>
      </div>
    </main>
  );

  const inputStyle = { background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' };

  return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <a href="/" className="text-sm opacity-50 hover:opacity-100 transition-opacity">← home</a>
          <a href={`/persona/${userId}`} className="text-xs opacity-40 hover:opacity-100 transition-opacity">
            view my neo-biography →
          </a>
        </div>

        <h1 className="text-xl mb-6" style={{ letterSpacing: '0.03em' }}>Neo-Biography</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 text-sm">
          {(['publish', 'influences', 'profile'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setResult(''); }}
              className="transition-opacity"
              style={{ opacity: tab === t ? 1 : 0.35 }}
            >
              {t}
            </button>
          ))}
        </div>

        {result && <p className="text-xs opacity-60 mb-4">{result}</p>}

        {/* Publish tab */}
        {tab === 'publish' && (
          <div className="space-y-4">
            <p className="text-xs opacity-40">
              Publish a work to your Neo-Biography. Once published, it is frozen forever.
            </p>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="title"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={inputStyle}
            />
            <select
              value={medium}
              onChange={e => setMedium(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm outline-none"
              style={inputStyle}
            >
              {MEDIUMS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="your work..."
              rows={12}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-y"
              style={inputStyle}
            />
            <button
              onClick={publish}
              disabled={submitting || !title.trim() || !content.trim()}
              className="rounded-lg px-4 py-2 text-sm disabled:opacity-30"
              style={{ background: 'var(--bg-secondary)' }}
            >
              {submitting ? 'publishing...' : 'publish'}
            </button>
          </div>
        )}

        {/* Influences tab */}
        {tab === 'influences' && (
          <div className="space-y-4">
            <p className="text-xs opacity-40">
              Curate the art, books, music, and ideas that shaped you. You are what you love.
            </p>
            <input
              type="text"
              value={infTitle}
              onChange={e => setInfTitle(e.target.value)}
              placeholder="title (e.g. Meditations by Marcus Aurelius)"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={inputStyle}
            />
            <select
              value={infMedium}
              onChange={e => setInfMedium(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm outline-none"
              style={inputStyle}
            >
              {INFLUENCE_MEDIUMS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input
              type="text"
              value={infUrl}
              onChange={e => setInfUrl(e.target.value)}
              placeholder="url (optional)"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={inputStyle}
            />
            <textarea
              value={infAnnotation}
              onChange={e => setInfAnnotation(e.target.value)}
              placeholder="why this matters to you... (optional)"
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-y"
              style={inputStyle}
            />
            <button
              onClick={addInfluence}
              disabled={submitting || !infTitle.trim()}
              className="rounded-lg px-4 py-2 text-sm disabled:opacity-30"
              style={{ background: 'var(--bg-secondary)' }}
            >
              {submitting ? 'adding...' : 'add influence'}
            </button>
          </div>
        )}

        {/* Profile tab */}
        {tab === 'profile' && (
          <div className="space-y-4">
            <p className="text-xs opacity-40">
              How you appear in the Library.
            </p>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="display name"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={inputStyle}
            />
            <input
              type="text"
              value={handle}
              onChange={e => setHandle(e.target.value)}
              placeholder="handle (e.g. benjamin)"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={inputStyle}
            />
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="a short bio..."
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-y"
              style={inputStyle}
            />
            <button
              onClick={updateProfile}
              disabled={submitting}
              className="rounded-lg px-4 py-2 text-sm disabled:opacity-30"
              style={{ background: 'var(--bg-secondary)' }}
            >
              {submitting ? 'saving...' : 'save profile'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
