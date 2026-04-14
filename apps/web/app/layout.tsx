import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeInit } from "@/components/theme-init";
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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL ?? "https://mermaidsh.com"
  ),
  title: {
    default: "mermaid-viewer — Versioned Mermaid Diagrams for AI Agents",
    template: "%s | mermaid-viewer",
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
  applicationName: "mermaid-viewer",
  referrer: "origin-when-cross-origin",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "mermaid-viewer",
    title: "mermaid-viewer — Versioned Mermaid Diagrams for AI Agents",
    description:
      "Dead-simple versioned Mermaid diagrams for AI agents. Create, update, and share diagrams via a single API call.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "mermaid-viewer — Versioned Mermaid Diagrams for AI Agents",
    description:
      "Dead-simple versioned Mermaid diagrams for AI agents. Create, update, and share diagrams via a single API call.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col bg-background text-foreground"
      >
        <ThemeInit />
        {children}
      </body>
    </html>
  );
}
