'use client';

import { useEffect, useMemo, useState } from 'react';

interface BulkIngestSummary {
  chunksProcessed: number;
  totalChunks: number;
  extraction: {
    facts: number;
    preferences: number;
    opinions: number;
    values: number;
    entities: number;
  };
  storage: {
    memoryItems: number;
    trainingPairs: number;
    editorNotes: number;
  };
  errors?: string[];
}

interface UploadItem {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'done' | 'error';
  summary?: BulkIngestSummary;
  error?: string;
}

function normalizeSummary(data: unknown): BulkIngestSummary {
  const payload = data as {
    summary?: {
      chunksProcessed?: number;
      totalChunks?: number;
      extraction?: {
        facts?: number;
        preferences?: number;
        opinions?: number;
        values?: number;
        entities?: number;
      };
      storage?: {
        memoryItems?: number;
        trainingPairs?: number;
        editorNotes?: number;
      };
      factsExtracted?: number;
      memoryItemsStored?: number;
      trainingPairsGenerated?: number;
      editorNotesGenerated?: number;
      errors?: string[];
    };
  };
  const summary = payload.summary || {};
  return {
    chunksProcessed: summary.chunksProcessed || 0,
    totalChunks: summary.totalChunks || summary.chunksProcessed || 0,
    extraction: {
      facts: summary.extraction?.facts || summary.factsExtracted || 0,
      preferences: summary.extraction?.preferences || 0,
      opinions: summary.extraction?.opinions || 0,
      values: summary.extraction?.values || 0,
      entities: summary.extraction?.entities || 0
    },
    storage: {
      memoryItems: summary.storage?.memoryItems || summary.memoryItemsStored || 0,
      trainingPairs: summary.storage?.trainingPairs || summary.trainingPairsGenerated || 0,
      editorNotes: summary.storage?.editorNotes || summary.editorNotesGenerated || 0
    },
    errors: summary.errors
  };
}

export default function BatchUploadPage() {
  const [userId, setUserId] = useState<string>('');
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [pasteName, setPasteName] = useState<string>('');
  const [pasteText, setPasteText] = useState<string>('');

  useEffect(() => {
    setUserId(localStorage.getItem('alexandria_user_id') || '');
  }, []);

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        if (item.status === 'done' && item.summary) {
          acc.filesDone += 1;
          acc.memoryItems += item.summary.storage.memoryItems || 0;
          acc.trainingPairs += item.summary.storage.trainingPairs || 0;
        }
        if (item.status === 'error') {
          acc.filesFailed += 1;
        }
        return acc;
      },
      { filesDone: 0, filesFailed: 0, memoryItems: 0, trainingPairs: 0 }
    );
  }, [items]);

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

  const readText = async (file: File): Promise<string> => {
    return file.text();
  };

  const addPastedTranscript = () => {
    const text = pasteText.trim();
    if (!text) {
      setMessage('paste some transcript text first.');
      return;
    }

    const safeBase = (pasteName.trim() || `pasted-transcript-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`)
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

  const processViaBulkIngest = async (file: File, userId: string): Promise<BulkIngestSummary> => {
    const text = await readText(file);
    if (!text.trim()) {
      throw new Error('file is empty');
    }

    const res = await fetch('/api/bulk-ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        userId,
        source: `voice-transcript:${file.name}`
      })
    });
    const data = await res.json();
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || `bulk ingest failed (${res.status})`);
    }
    return normalizeSummary(data);
  };

  const processViaUploadCarbon = async (file: File, userId: string): Promise<BulkIngestSummary> => {
    const form = new FormData();
    form.append('file', file);
    form.append('userId', userId);
    form.append('context', `voice-transcript:${file.name}`);

    const res = await fetch('/api/upload-carbon', {
      method: 'POST',
      body: form
    });
    const data = await res.json();
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || `upload fallback failed (${res.status})`);
    }
    return normalizeSummary(data);
  };

  const processAll = async () => {
    if (isProcessing || items.length === 0) return;
    const userId = localStorage.getItem('alexandria_user_id') || '';
    if (!userId) {
      setMessage('Not signed in on this device. Open the app, sign in, then come back to this page.');
      return;
    }

    setIsProcessing(true);
    setMessage('');

    const queue = items.filter((item) => item.status === 'pending' || item.status === 'error');
    for (const item of queue) {
      setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: 'processing', error: undefined } : p)));
      try {
        let summary: BulkIngestSummary;
        try {
          summary = await processViaBulkIngest(item.file, userId);
        } catch (bulkError) {
          // Fallback for mobile/body-size/network edge cases.
          summary = await processViaUploadCarbon(item.file, userId);
          setMessage(`fallback used for ${item.file.name} (${bulkError instanceof Error ? bulkError.message : 'bulk ingest failed'})`);
        }

        setItems((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? {
                  ...p,
                  status: 'done',
                  summary
                }
              : p
          )
        );
      } catch (error) {
        setItems((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? {
                  ...p,
                  status: 'error',
                  error: error instanceof Error ? error.message : 'unknown error'
                }
              : p
          )
        );
      }
    }

    setIsProcessing(false);
    setMessage('batch complete.');
  };

  return (
    <main className="min-h-screen px-6 py-10" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="text-2xl">Batch Upload</h1>
        <p className="text-sm opacity-70">process many transcript files through bulk ingest.</p>
        <p className="text-xs opacity-60">
          On phone: sign in on this device first. For 100+ files use desktop; on phone try a few at a time.
        </p>

        {!userId && (
          <div className="rounded-xl p-3 text-sm" style={{ background: 'var(--bg-secondary)' }}>
            Sign in on this device first — <a href="/" className="underline">open app and sign in</a>, then return here.
          </div>
        )}

        <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg-secondary)' }}>
          <div
            className={`rounded-xl border-2 border-dashed p-8 text-center transition-opacity ${isDragging ? 'opacity-100' : 'opacity-80'}`}
            style={{ borderColor: 'var(--border-light)' }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              addFiles(e.dataTransfer.files);
            }}
          >
            <div className="text-sm">drag and drop .md files here</div>
            <div className="text-xs opacity-60 mt-1">or choose files manually</div>
            <label className="inline-block mt-3 cursor-pointer rounded-lg px-3 py-1 text-xs" style={{ background: 'var(--bg-primary)' }}>
              choose files
              <input
                type="file"
                multiple
                accept=".md,.txt,text/markdown,text/plain,*/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.currentTarget.value = '';
                }}
              />
            </label>
          </div>

          <div className="flex gap-2">
            <button
              onClick={processAll}
              disabled={isProcessing || items.length === 0}
              className="rounded-lg px-3 py-2 text-sm disabled:opacity-50"
              style={{ background: 'var(--bg-primary)' }}
            >
              {isProcessing ? 'processing...' : 'process all'}
            </button>
            <button
              onClick={() => setItems([])}
              disabled={isProcessing || items.length === 0}
              className="rounded-lg px-3 py-2 text-sm disabled:opacity-50"
              style={{ background: 'var(--bg-primary)' }}
            >
              clear
            </button>
            <a className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--bg-primary)' }} href="/">
              back to app
            </a>
          </div>

          {message && <div className="text-xs opacity-70">{message}</div>}
        </div>

        <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg-secondary)' }}>
          <div className="text-sm">paste transcript (phone fallback)</div>
          <div className="text-xs opacity-60">
            If file upload is flaky on mobile, paste transcript content here and add it to the queue.
          </div>
          <input
            value={pasteName}
            onChange={(e) => setPasteName(e.target.value)}
            placeholder="optional name (e.g. meeting-jan-14)"
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          />
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="paste transcript markdown/text here..."
            className="w-full min-h-[160px] rounded-lg px-3 py-2 text-sm"
            style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          />
          <div className="flex gap-2">
            <button
              onClick={addPastedTranscript}
              disabled={isProcessing || !pasteText.trim()}
              className="rounded-lg px-3 py-2 text-sm disabled:opacity-50"
              style={{ background: 'var(--bg-primary)' }}
            >
              add pasted transcript
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)' }}>
            <div className="text-xs opacity-60">files queued</div>
            <div className="text-lg">{items.length}</div>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)' }}>
            <div className="text-xs opacity-60">processed</div>
            <div className="text-lg">{totals.filesDone}</div>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)' }}>
            <div className="text-xs opacity-60">memory items</div>
            <div className="text-lg">{totals.memoryItems}</div>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'var(--bg-secondary)' }}>
            <div className="text-xs opacity-60">training pairs</div>
            <div className="text-lg">{totals.trainingPairs}</div>
          </div>
        </div>

        <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--bg-secondary)' }}>
          <div className="text-sm">files</div>
          {items.length === 0 && <div className="text-xs opacity-60">no files selected.</div>}
          {items.map((item) => (
            <div key={item.id} className="rounded-lg p-3" style={{ background: 'var(--bg-primary)' }}>
              <div className="flex justify-between gap-2">
                <div className="text-sm break-all">{item.file.name}</div>
                <div className="text-xs opacity-70">{(item.file.size / 1024).toFixed(1)} KB</div>
              </div>
              <div className="text-xs mt-1 opacity-70">
                status: {item.status}
                {item.error ? ` · ${item.error}` : ''}
              </div>
              {item.summary && (
                <div className="text-xs mt-1 opacity-70">
                  chunks {item.summary.chunksProcessed}/{item.summary.totalChunks} · memories {item.summary.storage.memoryItems} · pairs{' '}
                  {item.summary.storage.trainingPairs}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
