'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ThemeToggle } from '../../../../components/ThemeToggle';
import { SERVER_URL } from '../../../../lib/config';

type Visibility = 'public' | 'authors' | 'invite' | 'paid' | string;

type AuthorResponse = {
  author?: { display_name?: string | null };
  files?: Array<{ name: string; visibility: Visibility }>;
};

type SessionResponse = {
  signed_in?: boolean;
  github_login?: string | null;
};

type ApiErrorResponse = {
  error?: string;
  visibility?: string;
};

const FILE_DISPLAY_NAMES: Record<string, string> = {
  shadow: 'Shadow',
  design: 'Design',
  'droplets-of-grace': 'Droplets of Grace',
  'on-love': 'On Love',
  'on-power': 'On Power',
};

const FILE_EXTENSIONS: Record<string, string> = {
  'on-love': 'pdf',
};

function fileDisplayName(name: string): string {
  return FILE_DISPLAY_NAMES[name] || name.replace(/-/g, ' ');
}

function gateText(visibility: Visibility): string {
  if (visibility === 'paid') return 'buy access to open this file';
  if (visibility === 'invite') return 'enter invite code or sign in as the author';
  if (visibility === 'authors') return 'sign in as an author to open this file';
  return 'open this file';
}

export default function OpenProtocolFileGatePage({
  params,
}: {
  params: Promise<{ author: string; name: string }>;
}) {
  const searchParams = useSearchParams();
  const [authorId, setAuthorId] = useState('');
  const [fileName, setFileName] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('authors');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [sessionLogin, setSessionLogin] = useState<string | null>(null);
  const [guestMode, setGuestMode] = useState(false);

  useEffect(() => {
    params.then(async ({ author, name }) => {
      setAuthorId(author);
      setFileName(name);
      try {
        const [authorRes, sessionRes] = await Promise.all([
          fetch(`${SERVER_URL}/library/${encodeURIComponent(author)}`),
          fetch('/api/library/session', { credentials: 'include' }),
        ]);

        if (!authorRes.ok) throw new Error('Author not found');
        const authorData = await authorRes.json() as AuthorResponse;
        setAuthorName((authorData.author?.display_name || author).trim());

        if (sessionRes.ok) {
          const session = await sessionRes.json() as SessionResponse;
          setSignedIn(Boolean(session.signed_in));
          setSessionLogin(session.github_login || null);
        }

        const file = (authorData.files || []).find((candidate) => candidate.name === name);
        if (!file) {
          setError('file not found.');
        } else {
          setVisibility(file.visibility);
        }
      } catch {
        setError('could not load file gate.');
      } finally {
        setReady(true);
      }
    });
  }, [params]);

  const nextPath = useMemo(() => (
    `/library/${encodeURIComponent(authorId)}/open/${encodeURIComponent(fileName)}`
  ), [authorId, fileName]);

  const signInUrl = useMemo(() => (
    `${SERVER_URL}/auth/github?intent=library&next=${encodeURIComponent(nextPath)}`
  ), [nextPath]);
  const purchaseSessionId = (searchParams.get('session_id') || '').trim();
  const canceled = searchParams.get('cancel') === '1';
  const purchased = searchParams.get('purchased') === '1' || !!purchaseSessionId;
  const fileExtension = FILE_EXTENSIONS[fileName] || 'md';
  const displayName = fileDisplayName(fileName);

  const apiFileUrl = (query?: string) => {
    const path = `/api/library/${encodeURIComponent(authorId)}/file/${encodeURIComponent(fileName)}`;
    return query ? `${path}?${query}` : path;
  };

  const openViaApi = async (query?: string) => {
    const path = apiFileUrl(query);
    const res = await fetch(path, { credentials: 'include' });
    if (!res.ok) {
      const text = await res.text();
      let parsed: ApiErrorResponse = {};
      try { parsed = JSON.parse(text) as ApiErrorResponse; } catch {}
      setError(parsed.error || 'could not open this file.');
      return false;
    }
    window.location.href = path;
    return true;
  };

  const openNow = async () => {
    if (!authorId || !fileName || loading) return;
    setLoading(true);
    setError('');
    try {
      if (visibility === 'public') {
        await openViaApi();
        return;
      }
      if (visibility === 'paid') {
        if (canOwnerOpen || purchaseSessionId) {
          const query = purchaseSessionId ? `session_id=${encodeURIComponent(purchaseSessionId)}` : undefined;
          await openViaApi(query);
          return;
        }
        const checkout = await fetch(
          `/api/library/${encodeURIComponent(authorId)}/checkout/file/${encodeURIComponent(fileName)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ return_origin: window.location.origin }),
          },
        );
        const body = await checkout.json() as { url?: string; error?: string };
        if (body.url) {
          window.location.href = body.url;
          return;
        }
        setError(body.error || 'checkout failed.');
        return;
      }
      if (visibility === 'invite') {
        if (!inviteCode.trim()) {
          setError('enter invite code first.');
          return;
        }
        await openViaApi(`invite=${encodeURIComponent(inviteCode.trim())}`);
        return;
      }
      // authors visibility
      await openViaApi();
    } catch {
      setError('could not continue.');
    } finally {
      setLoading(false);
    }
  };

  const copyNow = async () => {
    if (!authorId || !fileName || loading || copying || fileExtension !== 'md') return;
    setCopying(true);
    setError('');
    try {
      let query: string | undefined;
      if (visibility === 'paid') {
        if (!canOwnerOpen && !purchaseSessionId) {
          setError('buy access first, then copy.');
          return;
        }
        query = purchaseSessionId ? `session_id=${encodeURIComponent(purchaseSessionId)}` : undefined;
      } else if (visibility === 'invite') {
        if (!inviteCode.trim()) {
          setError('enter invite code first.');
          return;
        }
        query = `invite=${encodeURIComponent(inviteCode.trim())}`;
      } else if (visibility === 'authors' && !canAuthorOpen && !canOwnerOpen) {
        setError('sign in as an author first.');
        return;
      }

      const res = await fetch(apiFileUrl(query), { credentials: 'include' });
      if (!res.ok) {
        const text = await res.text();
        let parsed: ApiErrorResponse = {};
        try { parsed = JSON.parse(text) as ApiErrorResponse; } catch {}
        setError(parsed.error || 'could not copy this file.');
        return;
      }
      const text = await res.text();
      await navigator.clipboard.writeText(text);
    } catch {
      setError('copy failed.');
    } finally {
      setCopying(false);
    }
  };

  const canOwnerOpen = signedIn && sessionLogin === authorId;
  const canAuthorOpen = signedIn && visibility === 'authors';
  const inviteCodeEntered = inviteCode.trim().length > 0;
  const showGuestOption = !signedIn && visibility === 'paid';
  const canPaidProceed = visibility !== 'paid'
    || canOwnerOpen
    || signedIn
    || guestMode
    || !!purchaseSessionId;
  const canInviteProceed = visibility !== 'invite' || canOwnerOpen || inviteCodeEntered;
  const showOpenButton = visibility === 'public'
    || visibility === 'invite'
    || canAuthorOpen
    || canOwnerOpen
    || (visibility === 'paid' && (signedIn || guestMode || !!purchaseSessionId));
  const showCopyButton = fileExtension === 'md' && (
    visibility === 'public'
      || visibility === 'invite'
      || canAuthorOpen
      || canOwnerOpen
      || (visibility === 'paid' && (canOwnerOpen || !!purchaseSessionId))
  );
  const gateMessage = visibility === 'paid' && canOwnerOpen
    ? 'you are signed in as the author. open directly or copy.'
    : gateText(visibility);

  if (!ready) {
    return (
      <main style={{ maxWidth: '420px', margin: '0 auto', padding: '40vh 2rem', fontFamily: 'var(--font-eb-garamond)', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-ghost)', fontSize: '0.85rem' }}>...</p>
      </main>
    );
  }

  return (
    <>
      <ThemeToggle />
      <main style={{ maxWidth: '480px', margin: '0 auto', padding: '8rem 2rem 4rem', fontFamily: 'var(--font-eb-garamond)' }}>
        <Link href={`/library/${authorId}`} style={{ textDecoration: 'none' }}>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', margin: '0 0 0.2rem' }}>
            {authorName || authorId}
          </p>
        </Link>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-ghost)', margin: '0 0 0.9rem' }}>
          {displayName}.{fileExtension}
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 1.8rem' }}>
          {gateMessage}
        </p>

        {!signedIn && visibility !== 'public' && (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', margin: '0 0 1.4rem' }}>
            <a href={signInUrl} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.92rem' }} className="hover:opacity-60">
              sign in
            </a>
            <a href={signInUrl} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.92rem' }} className="hover:opacity-60">
              sign up
            </a>
            {showGuestOption && (
              <button
                type="button"
                onClick={() => setGuestMode(true)}
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.92rem', padding: 0, cursor: 'pointer' }}
                className="hover:opacity-60"
              >
                continue as guest
              </button>
            )}
          </div>
        )}

        {canceled && visibility === 'paid' && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-ghost)', margin: '0 0 1rem' }}>
            checkout canceled. nothing charged.
          </p>
        )}
        {purchased && visibility === 'paid' && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-ghost)', margin: '0 0 1rem' }}>
            purchase complete. open your file.
          </p>
        )}

        {visibility === 'invite' && (
          <div style={{ margin: '0 0 1.2rem' }}>
            <input
              type="text"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              placeholder="invite code"
              style={{
                width: '100%',
                border: 'none',
                borderBottom: '1px solid var(--border-light)',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-eb-garamond)',
                fontSize: '0.95rem',
                outline: 'none',
                padding: '0 0 0.45rem',
              }}
            />
          </div>
        )}

        {(showOpenButton || showCopyButton) && (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {showOpenButton && (
              <button
                type="button"
                onClick={() => void openNow()}
                disabled={loading || copying || !canPaidProceed || !canInviteProceed || (visibility === 'authors' && !canAuthorOpen && !canOwnerOpen)}
                style={{
                  fontSize: '0.95rem',
                  color: 'var(--text-primary)',
                  cursor: loading || copying ? 'default' : 'pointer',
                  opacity: loading || copying ? 0.45 : 1,
                  transition: 'opacity 0.15s',
                  border: 'none',
                  background: 'none',
                  padding: 0,
                  fontFamily: 'inherit',
                }}
                className="hover:opacity-60"
              >
                {loading ? '...' : (
                  visibility === 'paid' && !canOwnerOpen && !purchaseSessionId
                    ? `buy ${displayName}.${fileExtension}`
                    : `open ${displayName}.${fileExtension}`
                )}
              </button>
            )}
            {showCopyButton && (
              <button
                type="button"
                onClick={() => void copyNow()}
                disabled={loading || copying || !canInviteProceed || (visibility === 'authors' && !canAuthorOpen && !canOwnerOpen)}
                style={{
                  fontSize: '0.92rem',
                  color: 'var(--text-muted)',
                  cursor: loading || copying ? 'default' : 'pointer',
                  opacity: loading || copying ? 0.45 : 1,
                  transition: 'opacity 0.15s',
                  border: 'none',
                  background: 'none',
                  padding: 0,
                  fontFamily: 'inherit',
                }}
                className="hover:opacity-60"
              >
                {copying ? 'copying...' : 'copy'}
              </button>
            )}
          </div>
        )}

        {visibility === 'authors' && !canAuthorOpen && !canOwnerOpen && signedIn && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-ghost)', margin: '0.8rem 0 0' }}>
            this file is for authors. sign in with the account that owns the file, or use machine auth.
          </p>
        )}
        {error && <p style={{ fontSize: '0.8rem', color: 'var(--text-whisper)', margin: '0.8rem 0 0' }}>{error}</p>}

        <div style={{ margin: '3rem 0 0', display: 'flex', gap: '1.4rem' }}>
          <Link href={`/library/${authorId}`} style={{ fontSize: '0.72rem', color: 'var(--text-whisper)', textDecoration: 'none' }} className="hover:opacity-60">
            back
          </Link>
          <Link href="/" style={{ fontSize: '0.72rem', color: 'var(--text-whisper)', textDecoration: 'none' }} className="hover:opacity-60">
            alexandria.
          </Link>
        </div>
      </main>
    </>
  );
}
