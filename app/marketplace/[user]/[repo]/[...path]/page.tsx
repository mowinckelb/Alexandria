import type { Metadata } from 'next';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ThemeToggle } from '../../../../components/ThemeToggle';
import { SERVER_URL } from '../../../../lib/config';

export const dynamic = 'force-dynamic';

interface ModuleDetail {
  id: string;
  name: string;
  description: string;
  body: string;
  author_github_login: string;
  usage_count: number;
  last_used: string | null;
  first_seen: string | null;
  status: 'ok' | 'unreachable' | 'parse_error';
}

async function loadModule(user: string, repo: string, path: string): Promise<ModuleDetail | null> {
  try {
    const res = await fetch(`${SERVER_URL}/marketplace/${user}/${repo}/${path}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json() as ModuleDetail;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ user: string; repo: string; path: string[] }>;
}): Promise<Metadata> {
  const { user, repo, path } = await params;
  const pathStr = path.join('/');
  const m = await loadModule(user, repo, pathStr);
  if (!m) return { title: 'module — alexandria.' };
  return {
    title: `${m.name} — marketplace — alexandria.`,
    description: m.description || `${m.name} module by ${m.author_github_login}.`,
  };
}

const MD_COMPONENTS = {
  h1: ({ children }: { children?: React.ReactNode }) => <h1 className="pdoc-h1">{children}</h1>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="pdoc-h2">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="pdoc-h3">{children}</h3>,
  h4: ({ children }: { children?: React.ReactNode }) => <h4 className="pdoc-h4">{children}</h4>,
  hr: () => <div className="pdoc-hr" />,
  p: ({ children }: { children?: React.ReactNode }) => <p className="pdoc-p">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="pdoc-strong">{children}</strong>,
  table: ({ children }: { children?: React.ReactNode }) => <table className="pdoc-table">{children}</table>,
  blockquote: ({ children }: { children?: React.ReactNode }) => <blockquote className="pdoc-bq">{children}</blockquote>,
};

function statusLabel(status: ModuleDetail['status']): string | null {
  if (status === 'unreachable') return 'unreachable on github — install will fail until the path resolves';
  if (status === 'parse_error') return 'front-matter missing or invalid — degraded display';
  return null;
}

export default async function MarketplaceModulePage({
  params,
}: {
  params: Promise<{ user: string; repo: string; path: string[] }>;
}) {
  const { user, repo, path } = await params;
  const pathStr = path.join('/');
  const m = await loadModule(user, repo, pathStr);

  if (!m) {
    return (
      <>
        <ThemeToggle />
        <Link href="/marketplace" className="mdoc-shelf-link">marketplace</Link>
        <main className="mdoc">
          <div className="mdoc-frame mdoc-header">module not found.</div>
          <article className="mdoc-frame mdoc-article pdoc">
            <p className="pdoc-p" style={{ color: 'var(--text-ghost)' }}>
              <code>github:{user}/{repo}#{pathStr}</code> isn&apos;t in the marketplace catalog yet.
            </p>
          </article>
          <nav className="mdoc-frame mdoc-footnav">
            <Link href="/" className="mdoc-home">a.</Link>
          </nav>
        </main>
      </>
    );
  }

  const githubUrl = `https://github.com/${user}/${repo}/blob/main/${pathStr}.md`;
  const installId = m.id;
  const banner = statusLabel(m.status);

  return (
    <>
      <ThemeToggle />
      <Link href="/marketplace" className="mdoc-shelf-link">marketplace</Link>
      <main className="mdoc">
        <div className="mdoc-frame mdoc-header">
          {m.name}
          {m.description && (
            <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.4rem', fontWeight: 400 }}>
              {m.description}
            </span>
          )}
        </div>

        <article className="mdoc-frame mdoc-article pdoc">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-ghost)', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <span>{m.author_github_login}</span>
            <span>·</span>
            <span>{m.usage_count} {m.usage_count === 1 ? 'use' : 'uses'}</span>
            {m.last_used && (
              <>
                <span>·</span>
                <span>last used {new Date(m.last_used).toISOString().slice(0, 10)}</span>
              </>
            )}
            <span>·</span>
            <a href={githubUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)' }}>
              source on github
            </a>
          </div>

          <pre style={{ background: 'var(--surface-soft, rgba(0,0,0,0.04))', padding: '0.6rem 0.8rem', borderRadius: 4, fontSize: '0.82rem', overflow: 'auto', marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
            <code>{installId}</code>
          </pre>

          {banner && (
            <p className="pdoc-p" style={{ color: 'var(--text-ghost)', fontStyle: 'italic', fontSize: '0.85rem' }}>
              ({banner})
            </p>
          )}

          {m.body ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
              {m.body}
            </ReactMarkdown>
          ) : (
            <p className="pdoc-p" style={{ color: 'var(--text-ghost)' }}>no body content.</p>
          )}
        </article>

        <nav className="mdoc-frame mdoc-footnav">
          <Link href="/" className="mdoc-home">a.</Link>
        </nav>
      </main>
    </>
  );
}
