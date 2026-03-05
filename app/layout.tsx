import type { Metadata } from "next";
import { EB_Garamond } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "alexandria. — droplets of grace",
  description: "A sovereign layer of intent for personal AI. One MCP connector. Your cognition extracted into structured, portable files you own. Switch models freely. The examined life as architecture.",
  keywords: ["Alexandria", "AI sovereignty", "personal AI", "MCP", "constitution", "cognitive architecture", "self-knowledge", "AI connector", "portable AI data", "examined life"],
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "alexandria.",
    description: "A sovereign layer of intent for personal AI. Own your cognition. Switch models freely. The examined life as architecture.",
    url: "https://mowinckel.ai",
    siteName: "Alexandria",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "alexandria.",
    description: "A sovereign layer of intent for personal AI. Own your cognition. Switch models freely.",
    images: ["/og-image.png"],
  },
  metadataBase: new URL("https://mowinckel.ai"),
  alternates: {
    canonical: "https://mowinckel.ai",
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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
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
