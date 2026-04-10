import type { MetadataRoute } from 'next';
import { SERVER_URL, SITE_URL } from './lib/config';

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

  // Dynamic: Library author pages
  try {
    const res = await fetch(`${SERVER_URL}/library/authors`, { next: { revalidate: 3600 } });
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
  } catch {}

  return staticPages;
}
