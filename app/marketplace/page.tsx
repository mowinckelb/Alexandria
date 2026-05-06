import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggle } from '../components/ThemeToggle';
import { SERVER_URL } from '../lib/config';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'marketplace — alexandria.',
  description: 'Reusable Alexandria machinery — skills, scripts, prompts, filters. Use is the contribution.',
};

interface MarketplaceModule {
  id: string;
  name: string;
  description: string;
  author_github_login: string | null;
  usage_count: number;
  last_used: string;
  first_seen: string;
  status: 'ok' | 'unreachable' | 'parse_error';
}

interface ParsedId {
  user: string;
  repo: string;
  path: string;
}

function parseGithubId(id: string): ParsedId | null {
  const m = id.match(/^github:([^\/]+)\/([^#]+)#(.+)$/);
  if (!m) return null;
  return { user: m[1], repo: m[2], path: m[3] };
}

async function loadModules(): Promise<MarketplaceModule[]> {
  try {
    const res = await fetch(`${SERVER_URL}/marketplace`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json() as { modules?: MarketplaceModule[] };
    return data.modules || [];
  } catch {
    return [];
  }
}

function statusBadge(status: MarketplaceModule['status']): string | null {
  if (status === 'unreachable') return 'unreachable';
  if (status === 'parse_error') return 'parse error';
  return null;
}

export default async function MarketplacePage() {
  const modules = await loadModules();

  return (
    <>
      <ThemeToggle />
      <main style={{ maxWidth: '560px', margin: '0 auto', padding: '6rem 2rem 4rem', fontFamily: 'var(--font-eb-garamond)' }}>
        <header style={{ marginBottom: '1.5rem' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
            alexandria.
          </Link>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 400, color: 'var(--text-primary)', margin: '2rem 0 0', letterSpacing: '-0.01em' }}>
            marketplace
          </h1>
          <p style={{ color: 'var(--text-ghost)', fontSize: '0.88rem', lineHeight: 1.5, margin: '0.6rem 0 0' }}>
            reusable Alexandria machinery — skills, scripts, prompts, filters. modules surface here when Authors use them.
          </p>
        </header>

        {modules.length === 0 ? (
          <p style={{ color: 'var(--text-ghost)', fontSize: '0.9rem', marginTop: '2rem' }}>
            no modules yet.
          </p>
        ) : (
          <section style={{ marginTop: '2rem' }}>
            {modules.map((m) => {
              const parsed = parseGithubId(m.id);
              const href = parsed ? `/marketplace/${parsed.user}/${parsed.repo}/${parsed.path}` : null;
              const badge = statusBadge(m.status);
              const inner = (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>
                      {m.name}
                      {badge && (
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-ghost)', fontStyle: 'italic' }}>
                          ({badge})
                        </span>
                      )}
                    </h2>
                    <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
                      {m.usage_count} {m.usage_count === 1 ? 'use' : 'uses'}
                    </span>
                  </div>
                  {m.description && (
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0.6rem 0 0' }}>
                      {m.description}
                    </p>
                  )}
                  {m.author_github_login && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-ghost)', margin: '0.6rem 0 0' }}>
                      {m.author_github_login}
                    </p>
                  )}
                </>
              );
              return (
                <article key={m.id} style={{ padding: '1.1rem 0', borderTop: '1px solid var(--border-light)' }}>
                  {href ? (
                    <Link
                      href={href}
                      style={{ textDecoration: 'none', color: 'inherit', display: 'block', transition: 'opacity 0.15s' }}
                      className="hover:opacity-60"
                    >
                      {inner}
                    </Link>
                  ) : inner}
                </article>
              );
            })}
          </section>
        )}
      </main>
    </>
  );
}
