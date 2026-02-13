'use client';

import { useState, useEffect } from 'react';
import { ReportTimestamp } from './report-timestamp';
import { CountdownTimer } from './countdown-timer';

interface HeroProps {
  narrativeCount: number;
  anomalyCount: number;
  reposTracked: number;
  generatedAt?: string;
  reportDate?: string;
}

const floatingTags: Array<{ label: string; color: string; position: string; delay: string }> = [
  { label: 'GitHub', color: 'border-sol-purple/40 text-sol-purple', position: 'top-[15%] left-[8%]', delay: '[animation-delay:0s]' },
  { label: 'DeFi Llama', color: 'border-sol-blue/40 text-sol-blue', position: 'top-[25%] right-[10%]', delay: '[animation-delay:0.5s]' },
  { label: 'CoinGecko', color: 'border-sol-green/40 text-sol-green', position: 'bottom-[30%] left-[5%]', delay: '[animation-delay:1s]' },
  { label: 'Helius', color: 'border-sol-orange/40 text-sol-orange', position: 'bottom-[20%] right-[8%]', delay: '[animation-delay:1.5s]' },
  { label: 'X / Twitter', color: 'border-white/20 text-white/60', position: 'top-[45%] left-[3%]', delay: '[animation-delay:2s]' },
];

export function HeroSection({ narrativeCount, anomalyCount, reposTracked, generatedAt, reportDate }: HeroProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-sol-purple/20 via-sol-darker to-sol-blue/15 animate-gradient-shift" />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />

      {/* Floating data source tags — desktop only */}
      {mounted && (
        <div className="hidden lg:block">
          {floatingTags.map(tag => (
            <span
              key={tag.label}
              className={`absolute ${tag.position} ${tag.color} ${tag.delay} animate-float text-xs px-3 py-1.5 rounded-full border backdrop-blur-sm bg-white/[0.02] select-none pointer-events-none`}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
        {/* Glassmorphic card */}
        <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 md:p-12">
          {/* Live stats ticker */}
          {mounted && narrativeCount > 0 && (
            <div className="flex items-center justify-center gap-2 mb-6 text-xs text-sol-muted">
              <span className="inline-block w-2 h-2 rounded-full bg-sol-green animate-glow-pulse" />
              <span>
                <span className="text-white font-mono">{narrativeCount}</span> narratives
                <span className="text-sol-border mx-1.5">·</span>
                <span className="text-white font-mono">{anomalyCount}</span> anomalies
                <span className="text-sol-border mx-1.5">·</span>
                <span className="text-white font-mono">{reposTracked}</span> repos tracked
              </span>
            </div>
          )}

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
            <span className="bg-gradient-to-r from-sol-purple via-sol-blue to-sol-green bg-clip-text text-transparent">
              Solana Narrative
            </span>
            <br />
            <span className="text-white">Intelligence</span>
          </h1>

          <p className="text-sol-muted text-lg md:text-xl max-w-xl mx-auto mb-8">
            Detect emerging Solana ecosystem narratives before the market catches on.
            Fusing developer activity, onchain metrics, and market signals into daily intelligence reports.
          </p>

          {/* Dual CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={reportDate ? `/report/${reportDate}` : '/archive'}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-sol-purple to-sol-blue text-white font-medium hover:opacity-90 transition-opacity"
            >
              View Latest Report
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <a
              href="/archive"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-white/10 text-sol-muted hover:text-white hover:border-white/20 backdrop-blur-sm transition-colors"
            >
              Browse Archive
            </a>
          </div>
        </div>

        {/* Timestamp + countdown below card */}
        <div className="flex items-center justify-center gap-4 mt-6 text-sm">
          {generatedAt && <ReportTimestamp generatedAt={generatedAt} />}
          {generatedAt && <span className="text-sol-border">|</span>}
          <CountdownTimer />
        </div>
      </div>
    </section>
  );
}
