import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { VercelAnalytics } from "@/components/vercel-analytics";
import { baseUrl, isDevelopment } from "@/lib/env";
import { getThemeBootstrapScript } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "merm.sh — Versioned Mermaid Diagrams for AI Agents",
    template: "%s | merm.sh",
  },
  description:
    "Dead-simple versioned Mermaid diagrams for AI agents. Create, update, and share diagrams via a single API call with full version history.",
  keywords: [
    "mermaid",
    "diagrams",
    "mermaid diagrams",
    "versioned diagrams",
    "AI agents",
    "diagram API",
    "flowchart",
    "sequence diagram",
    "mermaid viewer",
  ],
  applicationName: "merm.sh",
  referrer: "origin-when-cross-origin",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "merm.sh",
    title: "merm.sh — Versioned Mermaid Diagrams for AI Agents",
    description:
      "Dead-simple versioned Mermaid diagrams for AI agents. Create, update, and share diagrams via a single API call.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "merm.sh — Versioned Mermaid Diagrams for AI Agents",
    description:
      "Dead-simple versioned Mermaid diagrams for AI agents. Create, update, and share diagrams via a single API call.",
  },
  icons: {
    icon: "/icon.svg",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          id="theme-init"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: getThemeBootstrapScript() }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <QueryProvider>
          <ThemeProvider>
            <NuqsAdapter>
              <KeyboardShortcuts />
              {children}
            </NuqsAdapter>
          </ThemeProvider>
        </QueryProvider>
        <VercelAnalytics />
        {isDevelopment && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            strategy="afterInteractive"
            crossOrigin="anonymous"
          />
        )}
      </body>
    </html>
  );
}
