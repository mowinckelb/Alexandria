import type { Metadata } from "next";
import { EB_Garamond } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
});

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://mowinckel.ai";

export const metadata: Metadata = {
  title: "alexandria.",
  description: "Make every ai you use actually know who you are. One file, on your device, works across all of them. $10/month or free with 5 kin.",
  keywords: ["Alexandria", "personal ai", "ai memory", "own your data", "ai identity", "self-knowledge", "ai connector"],
  icons: {
    // Square, cream, italic "a." — Safari and Chrome favicons render square,
    // so the artwork fills the tab space edge-to-edge. PNG primary (Safari
    // prefers raster over SVG for tabs); SVG listed for modern browsers.
    icon: [
      { url: "/favicon.png?v=2", type: "image/png", sizes: "512x512" },
      { url: "/icon.svg?v=2", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png?v=2",
    shortcut: "/favicon.png?v=2",
  },
  openGraph: {
    title: "alexandria.",
    description: "Make every ai you use actually know who you are. One file, on your device, works across all of them.",
    url: SITE,
    siteName: "Alexandria",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "alexandria.",
    description: "Make every ai you use actually know who you are. One file, on your device, works across all of them.",
    images: ["/og-image.png"],
  },
  metadataBase: new URL(SITE),
  alternates: {
    canonical: SITE,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        className={`${ebGaramond.variable} antialiased`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
