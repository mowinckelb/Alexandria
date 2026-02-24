'use client';

import { useEffect, useState } from 'react';

interface UploadItem {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'done' | 'error';
  message?: string;
  error?: string;
}

export default function BatchUploadPage() {
  const [userId, setUserId] = useState<string>('');
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [pasteName, setPasteName] = useState<string>('');
  const [pasteText, setPasteText] = useState<string>('');
  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessResult, setReprocessResult] = useState<string>('');

  useEffect(() => {
    setUserId(localStorage.getItem('alexandria_user_id') || '');
  }, []);

  const addFiles = (incoming: FileList | File[]) => {
    const allowed = Array.from(incoming).filter((file) => {
      const name = file.name.toLowerCase();
      return name.endsWith('.md') || name.endsWith('.txt');
    });

    if (allowed.length === 0) {
      setMessage('only .md and .txt files are accepted.');
      return;
    }

    setMessage('');
    setItems((prev) => [
      ...prev,
      ...allowed.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        status: 'pending' as const
      }))
    ]);
  };

  const addPastedTranscript = () => {
    const text = pasteText.trim();
    if (!text) {
      setMessage('paste some transcript text first.');
      return;
    }

    const safeBase = (pasteName.trim() || `pasted-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`)
      .replace(/[^a-zA-Z0-9-_ ]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase();
    const filename = `${safeBase || 'pasted-transcript'}.md`;
    const file = new File([text], filename, { type: 'text/markdown' });
    addFiles([file]);
    setPasteName('');
    setPasteText('');
  };

  const processAll = async () => {
    if (isProcessing || items.length === 0) return;
    const uid = localStorage.getItem('alexandria_user_id') || '';
    if (!uid) {
      setMessage('not signed in. open the app and sign in first.');
      return;
    }

    setIsProcessing(true);
    setMessage('');

    const queue = items.filter((item) => item.status === 'pending' || item.status === 'error');
    for (const item of queue) {
      setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: 'processing', error: undefined } : p)));
      try {
        const text = await item.file.text();
        if (!text.trim()) throw new Error('file is empty');

        const res = await fetch('/api/bulk-ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, userId: uid, source: `upload:${item.file.name}` })
        });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || `failed (${res.status})`);
        }

        setItems((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? { ...p, status: 'done', message: data.message || 'stored' }
              : p
          )
        );
      } catch (error) {
        setItems((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? { ...p, status: 'error', error: error instanceof Error ? error.message : 'unknown error' }
              : p
          )
        );
      }
    }

    setIsProcessing(false);
    const doneCount = items.filter(i => i.status === 'done').length + queue.filter(i => !items.find(x => x.id === i.id && x.status === 'error')).length;
    setMessage(`done. ${doneCount} file${doneCount !== 1 ? 's' : ''} stored. the editor will process them gradually.`);
  };

  const handleReprocess = async () => {
    const uid = localStorage.getItem('alexandria_user_id') || '';
    if (!uid) {
      setReprocessResult('not signed in.');
      return;
    }

    setReprocessing(true);
    setReprocessResult('');

    try {
      const res = await fetch('/api/reprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid })
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'failed');
      }
      setReprocessResult(data.message);
    } catch (error) {
      setReprocessResult(error instanceof Error ? error.message : 'failed');
    } finally {
      setReprocessing(false);
    }
  };

  const doneCount = items.filter(i => i.status === 'done').length;
  const errorCount = items.filter(i => i.status === 'error').length;

  return (
    <main
      className="fixed inset-0 overflow-y-auto overscroll-contain px-6 pt-10 pb-28"
      style={{
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <div className="mx-auto max-w-4xl space-y-4">
        <a href="/" className="inline-flex items-center gap-1 text-sm opacity-60 hover:opacity-100 transition-opacity mb-2" style={{ color: 'var(--text-primary)' }}>
          ← home
        </a>
        <h1 className="text-2xl">Vault</h1>
        <p className="text-sm opacity-70">upload data. the editor processes it gradually in the background.</p>

        {!userId && (
          <div className="rounded-xl p-3 text-sm" style={{ background: 'var(--bg-secondary)' }}>
            sign in first — <a href="/" className="underline">open app</a>, then return here.
          </div>
        )}

        {/* Upload section */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg-secondary)' }}>
          <div
            className={`rounded-xl border-2 border-dashed p-8 text-center transition-opacity ${isDragging ? 'opacity-100' : 'opacity-80'}`}
            style={{ borderColor: 'var(--border-light)' }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
          >
            <div className="text-sm">drag and drop .md or .txt files</div>
            <label className="inline-block mt-3 cursor-pointer rounded-lg px-3 py-1 text-xs" style={{ background: 'var(--bg-primary)' }}>
              choose files
              <input
                type="file"
                multiple
                accept=".md,.txt,text/markdown,text/plain,*/*"
                className="hidden"
                onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.currentTarget.value = ''; }}
              />
            </label>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={processAll}
              disabled={isProcessing || items.length === 0}
              className="rounded-lg px-3 py-2 text-sm disabled:opacity-50"
              style={{ background: 'var(--bg-primary)' }}
            >
              {isProcessing ? 'uploading...' : 'upload all'}
            </button>
            <button
              onClick={() => { setItems([]); setMessage(''); }}
              disabled={isProcessing || items.length === 0}
              className="rounded-lg px-3 py-2 text-sm disabled:opacity-50"
              style={{ background: 'var(--bg-primary)' }}
            >
              clear
            </button>
          </div>

          {message && <div className="text-xs opacity-70">{message}</div>}
        </div>

        {/* Paste section */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg-secondary)' }}>
          <div className="text-sm">paste text</div>
          <div className="text-xs opacity-60">for mobile or quick pastes</div>
          <input
            value={pasteName}
            onChange={(e) => setPasteName(e.target.value)}
            placeholder="optional name"
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          />
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="paste text here..."
            className="w-full min-h-[120px] rounded-lg px-3 py-2 text-sm"
            style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          />
          <button
            onClick={addPastedTranscript}
            disabled={isProcessing || !pasteText.trim()}
            className="rounded-lg px-3 py-2 text-sm disabled:opacity-50"
            style={{ background: 'var(--bg-primary)' }}
          >
            add to queue
          </button>
        </div>

        {/* File list */}
        {items.length > 0 && (
          <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-secondary)' }}>
            <div className="text-sm opacity-70">
              {items.length} file{items.length !== 1 ? 's' : ''}
              {doneCount > 0 && ` · ${doneCount} stored`}
              {errorCount > 0 && ` · ${errorCount} failed`}
            </div>
            {items.map((item) => (
              <div key={item.id} className="rounded-lg p-3 flex justify-between items-center" style={{ background: 'var(--bg-primary)' }}>
                <div>
                  <div className="text-sm break-all">{item.file.name}</div>
                  <div className="text-xs opacity-60">
                    {item.status === 'done' ? 'stored' : item.status}
                    {item.error ? ` · ${item.error}` : ''}
                  </div>
                </div>
                <div className="text-xs opacity-50">{(item.file.size / 1024).toFixed(0)} KB</div>
              </div>
            ))}
          </div>
        )}

        {/* Re-process section */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg-secondary)' }}>
          <div className="text-sm">re-process all data</div>
          <div className="text-xs opacity-60">
            tells the editor to go through all your data again. useful when models improve and can extract more signal.
          </div>
          <button
            onClick={handleReprocess}
            disabled={reprocessing}
            className="rounded-lg px-3 py-2 text-sm disabled:opacity-50"
            style={{ background: 'var(--bg-primary)' }}
          >
            {reprocessing ? 'resetting...' : 're-process everything'}
          </button>
          {reprocessResult && <div className="text-xs opacity-70">{reprocessResult}</div>}
        </div>
      </div>
    </main>
  );
}
