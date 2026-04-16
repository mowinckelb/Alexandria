import type { MetadataRoute } from 'next';
import { FETCH_TIMEOUT_MS, SERVER_URL, SITE_URL } from './lib/config';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), priority: 1 },
    { url: `${SITE_URL}/join`, lastModified: new Date(), priority: 0.9 },
    { url: `${SITE_URL}/vision`, lastModified: new Date(), priority: 0.8 },
    { url: `${SITE_URL}/library`, lastModified: new Date(), priority: 0.8 },
    { url: `${SITE_URL}/partners`, lastModified: new Date(), priority: 0.6 },
    { url: `${SITE_URL}/privacy`, lastModified: new Date(), priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: new Date(), priority: 0.3 },
  ];

  // Dynamic: Library author pages.
  // 10s abort is hard — if the server is slow or unreachable during a deploy,
  // fall back to just the static pages. The build must never hang on an
  // optional upstream (killed a prod deploy on 2026-04-16).
  try {
    const res = await fetch(`${SERVER_URL}/library/authors`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (res.ok) {
      const data = await res.json();
      const authors = (data.authors || []) as Array<{ id: string; updated_at?: string }>;
      for (const author of authors) {
        staticPages.push({
          url: `${SITE_URL}/library/${author.id}`,
          lastModified: author.updated_at ? new Date(author.updated_at) : new Date(),
          priority: 0.7,
        });
      }
    }
  } catch (e) {
    console.warn('[sitemap] Skipping dynamic Library authors:', e instanceof Error ? e.message : e);
  }

  return staticPages;
}
