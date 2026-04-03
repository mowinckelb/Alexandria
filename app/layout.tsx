import type { Metadata } from "next";
import { EB_Garamond } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "alexandria.",
  description: "Make every AI you use actually know who you are. One file, on your device, works across all of them. $5/month.",
  keywords: ["Alexandria", "personal AI", "AI memory", "own your data", "AI identity", "self-knowledge", "AI connector"],
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "alexandria.",
    description: "Make every AI you use actually know who you are. One file, on your device, works across all of them.",
    url: "https://mowinckel.ai",
    siteName: "Alexandria",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "alexandria.",
    description: "Make every AI you use actually know who you are. One file, on your device, works across all of them.",
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
