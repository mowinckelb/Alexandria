import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://mowinckel.ai',
      lastModified: new Date(),
      priority: 1,
    },
    {
      url: 'https://mowinckel.ai/docs/Alexandria.pdf',
      lastModified: new Date(),
      priority: 0.8,
    },
    {
      url: 'https://mowinckel.ai/docs/alexandria.md',
      lastModified: new Date(),
      priority: 0.9,
    },
  ];
}
