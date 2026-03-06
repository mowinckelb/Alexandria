import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'alexandria. — confidential',
  description: 'Confidential. A sovereign layer of intent for personal AI.',
  robots: 'noindex, nofollow',
  openGraph: {
    title: 'alexandria. — confidential',
    description: 'Confidential. A sovereign layer of intent for personal AI.',
    url: 'https://mowinckel.ai/confidential',
    siteName: 'Alexandria',
    type: 'website',
  },
};

export default function ConfidentialLayout({ children }: { children: React.ReactNode }) {
  return children;
}
