import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://mowinckel.ai',
      lastModified: new Date(),
      priority: 1,
    },
    {
      url: 'https://mowinckel.ai/join',
      lastModified: new Date(),
      priority: 0.9,
    },
    {
      url: 'https://mowinckel.ai/vision',
      lastModified: new Date(),
      priority: 0.8,
    },
    {
      url: 'https://mowinckel.ai/library',
      lastModified: new Date(),
      priority: 0.7,
    },
    {
      url: 'https://mowinckel.ai/signup',
      lastModified: new Date(),
      priority: 0.7,
    },
    {
      url: 'https://mowinckel.ai/patron',
      lastModified: new Date(),
      priority: 0.5,
    },
    {
      url: 'https://mowinckel.ai/privacy',
      lastModified: new Date(),
      priority: 0.3,
    },
    {
      url: 'https://mowinckel.ai/terms',
      lastModified: new Date(),
      priority: 0.3,
    },
    {
      url: 'https://mowinckel.ai/shortcut',
      lastModified: new Date(),
      priority: 0.4,
    },
    {
      url: 'https://mowinckel.ai/docs/Vision.md',
      lastModified: new Date(),
      priority: 0.6,
    },
    {
      url: 'https://mowinckel.ai/docs/Concrete.md',
      lastModified: new Date(),
      priority: 0.6,
    },
  ];
}
