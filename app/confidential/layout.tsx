import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'alexandria — confidential',
  robots: 'noindex, nofollow',
};

export default function ConfidentialLayout({ children }: { children: React.ReactNode }) {
  return children;
}
