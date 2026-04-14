import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you are looking for does not exist.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 text-neutral-100">
      <h1 className="text-4xl font-bold tracking-tight mb-2">404</h1>
      <p className="text-neutral-400 mb-6">This page doesn't exist.</p>
      <a
        href="/"
        className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
      >
        Go back home
      </a>
    </div>
  );
}
