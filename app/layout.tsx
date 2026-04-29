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
    // Opaque cream square + upright black "a." — matches brand mark.
    // Opaque means no platform default backdrop ever leaks through;
    // iOS/Android home screens round the cream square into the brand circle.
    icon: [
      { url: "/favicon.png?v=4", type: "image/png", sizes: "512x512" },
      { url: "/icon.svg?v=4", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png?v=4",
    shortcut: "/favicon.png?v=4",
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
