# SOLIS — Solana Onchain & Landscape Intelligence Signal

Open-source narrative detection for the Solana ecosystem. Fortnightly intelligence reports that fuse developer activity, onchain metrics, and market signals to surface emerging narratives before they're priced in.

## How It Works

SOLIS uses a **3-layer signal architecture** to detect narratives at different stages:

```
Layer 1 — LEADING (GitHub)           Layer 2 — COINCIDENT (Onchain)       Layer 3 — CONFIRMING (Market)
┌──────────────────────────┐  ┌─────────────────────────────┐  ┌──────────────────────────┐
│ Star velocity on 65+ repos│  │ Solana TVL history           │  │ Solana ecosystem tokens   │
│ Commit frequency surges   │  │ Protocol-level TVL changes   │  │ Price/volume movements    │
│ New repo clusters         │  │ DEX volumes                  │  │ Category market caps      │
│ Contributor count deltas  │  │ Program activity (Helius)    │  │ Trending coins            │
└──────────────────────────┘  └─────────────────────────────┘  └──────────────────────────┘
```

| Stage | Layers | Alpha |
|-------|--------|-------|
| EARLY | Layer 1 only | Highest — devs building, market unaware |
| EMERGING | Layer 1 + 2 | High — builders + capital moving |
| GROWING | All 3 | Moderate — mainstream traction |
| MAINSTREAM | All 3, high confidence | Low — already priced in |

## Architecture

- **Monorepo**: pnpm workspaces (`@solis/agent`, `@solis/web`, `@solis/shared`)
- **Pipeline**: TypeScript orchestration + GLM-4.7 (OpenRouter) for LLM analysis
- **Data sources**: GitHub API, DeFi Llama, Helius, CoinGecko
- **Anomaly detection**: Z-score (pure math, no ML)
- **Reports**: Git-committed JSON + Markdown artifacts
- **Website**: Next.js 15 + Tailwind v4 on VPS (Docker + nginx)
- **Scheduling**: GitHub Actions cron (fortnightly)
- **Deployment**: GitHub Actions → GHCR → VPS (solis.rectorspace.com)

## Quick Start

```bash
# Clone and install
git clone https://github.com/RECTOR-LABS/solis.git
cd solis
pnpm install

# Set up environment (see Environment section)
# Then run the pipeline
pnpm agent

# Start the website
pnpm dev
```

## Commands

```bash
pnpm dev          # Start web dev server (port 3001)
pnpm agent        # Run analysis pipeline
pnpm test:run     # Run all tests
pnpm typecheck    # TypeScript check
pnpm build        # Build all packages
```

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | GLM-4.7 narrative clustering + idea generation |
| `GITHUB_TOKEN` | Yes | GitHub API (5K req/hr) |
| `HELIUS_API_KEY` | Yes | Onchain signals (1M credits/mo free) |
| `COINGECKO_API_KEY` | No | Increases CoinGecko rate limit |

## Project Structure

```
solis/
├── packages/
│   ├── agent/          # Data pipeline + analysis engine
│   │   ├── src/
│   │   │   ├── tools/       # Data collection (GitHub, DeFi Llama, CoinGecko, Helius)
│   │   │   ├── analysis/    # Anomaly detection, LLM clustering, scoring, ideas
│   │   │   ├── repos/       # Curated Solana repo list (65+)
│   │   │   └── output/      # JSON + Markdown report writers
│   │   └── tests/
│   └── web/            # Next.js website
│       └── src/
│           ├── app/         # Pages (home, report, archive, methodology)
│           ├── components/  # Narrative card, stage badge, momentum gauge
│           └── lib/         # Report loading utilities
├── shared/             # Shared types contract
├── reports/            # Git-committed report artifacts
├── Dockerfile          # Multi-stage build for web
├── docker-compose.yml  # Production deployment
└── .github/workflows/  # CI, deploy, report cron, GitLab mirror
```

## Cost

~$5/month total:
- GLM-4.7 (analysis): ~$2/mo (2 runs x 500K tokens)
- Infrastructure: $0 (GitHub Actions free, VPS shared)

## License

MIT

## Author

RECTOR LABS — [rectorspace.com](https://rectorspace.com)
