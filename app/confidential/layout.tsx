import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'alexandria. — confidential',
  description: 'Alexandria investor document. Sovereign cognitive architecture for personal AI. Asymmetric risk-reward: near-zero burn, capped downside, uncapped Library upside. Solo founder, AI-native operating model, pre-launch. Contact: benjamin@mowinckel.com, +47 466 43 844.',
  robots: { index: false, follow: false, googleBot: { index: false } },
  openGraph: {
    title: 'alexandria. — confidential',
    description: 'Investor document. Sovereign cognitive architecture for personal AI. Contact founder directly.',
    url: 'https://mowinckel.ai/confidential',
    siteName: 'Alexandria',
    type: 'website',
  },
};

export default function ConfidentialLayout({ children }: { children: React.ReactNode }) {
  return children;
}
