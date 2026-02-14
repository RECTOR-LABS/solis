import type { Metadata } from 'next';
import { SearchModal } from '@/components/search-modal';
import './globals.css';

export const metadata: Metadata = {
  title: 'SOLIS — Solana Onchain & Landscape Intelligence Signal',
  description: 'Daily intelligence reports detecting emerging Solana ecosystem narratives through developer activity, onchain metrics, and market signals.',
  alternates: {
    types: {
      'application/rss+xml': '/feed.xml',
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-sol-darker text-white antialiased min-h-screen">
        <header className="border-b border-sol-border">
          <nav className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold bg-gradient-to-r from-sol-purple to-sol-green bg-clip-text text-transparent">
                SOLIS
              </span>
              <span className="text-sol-muted text-sm hidden sm:inline">
                Solana Intelligence Signal
              </span>
            </a>
            <div className="flex items-center gap-6 text-sm">
              <a href="/archive" className="text-sol-muted hover:text-white transition-colors">
                Archive
              </a>
              <a href="/compare" className="text-sol-muted hover:text-white transition-colors">
                Compare
              </a>
              <a href="/methodology" className="text-sol-muted hover:text-white transition-colors">
                Methodology
              </a>
              <a href="/brain" className="text-sol-muted hover:text-white transition-colors">
                Brain
              </a>
              <span className="text-sol-muted flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <kbd className="hidden sm:inline text-[10px] bg-sol-card px-1 py-0.5 rounded border border-sol-border">
                  ⌘K
                </kbd>
              </span>
              <a
                href="https://github.com/RECTOR-LABS/solis"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sol-muted hover:text-white transition-colors"
              >
                GitHub
              </a>
            </div>
          </nav>
        </header>
        <SearchModal />
        <main className="mx-auto max-w-6xl px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-sol-border mt-16">
          <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-sol-muted text-center">
            SOLIS by RECTOR LABS — Open-source Solana narrative intelligence
          </div>
        </footer>
      </body>
    </html>
  );
}
