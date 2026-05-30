<div align="center">

<pre>
███████╗ ██████╗ ██╗     ██╗███████╗
██╔════╝██╔═══██╗██║     ██║██╔════╝
███████╗██║   ██║██║     ██║███████╗
╚════██║██║   ██║██║     ██║╚════██║
███████║╚██████╔╝███████╗██║███████║
╚══════╝ ╚═════╝ ╚══════╝╚═╝╚══════╝
</pre>

# Solana Onchain & Landscape Intelligence Signal

**Detect emerging Solana narratives before they're priced in.**
*4-layer signal fusion · Z-score anomaly detection · LLM narrative clustering · Autonomous daily reports*

[![CI](https://github.com/RECTOR-LABS/solis/actions/workflows/ci.yml/badge.svg)](https://github.com/RECTOR-LABS/solis/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6.svg)](https://www.typescriptlang.org/)
[![Solana](https://img.shields.io/badge/Solana-ecosystem-9945FF.svg)](https://solana.com)
[![Node](https://img.shields.io/badge/Node-22%2B-339933.svg)](https://nodejs.org)
[![Live Reports](https://img.shields.io/badge/Live-solis.rectorspace.com-00D084.svg)](https://solis.rectorspace.com)
[![Superteam Earn](https://img.shields.io/badge/🏆_1st_Place-Superteam_Earn-f7931a.svg)](https://superteam.fun/earn/listing/develop-a-narrative-detection-and-idea-generation-tool)

</div>

---

## Latest Report — April 6, 2026

| Narratives | Anomalies | Repos Analyzed | Build Ideas | LLM Cost |
|:----------:|:---------:|:--------------:|:-----------:|:--------:|
| **12** | **8** | **100** | **14** | **$0.05** |

**[Live Dashboard](https://solis.rectorspace.com)** · **[Latest Report](reports/2026-04-06.md)** · 29-report archive (Feb–Apr 2026)

---

## How It Works — 4-Layer Signal Architecture

SOLIS fuses signals from four independent layers to detect narratives at different maturity stages. Leading indicators (dev activity) fire before coincident indicators (onchain capital), which fire before confirming indicators (market price). Social signals add a fifth dimension when enabled.

```
                    ┌─────────────────────────────┐
                    │  Layer 0 — SOCIAL (opt-in)   │
                    │  LunarCrush + X/Twitter KOL:  │
                    │  sentiment, KOL signals       │
                    └──────────────┬──────────────┘
                                   │
┌──────────────────┐  ┌───────────────────────┐  ┌──────────────────┐
│ Layer 1 — LEADING│  │ Layer 2 — COINCIDENT  │  │ Layer 3 — CONFIRM│
│ GitHub API       │  │ DeFi Llama + Helius   │  │ CoinGecko        │
│ Stars, commits,  │  │ TVL, volumes, program │  │ Prices, volumes, │
│ forks, new repos │  │ activity, stablecoins │  │ categories, trend│
└────────┬─────────┘  └──────────┬────────────┘  └────────┬─────────┘
         │                       │                         │
         └───────────┬───────────┴─────────────────────────┘
                     ▼
          ┌─────────────────────┐
          │  Z-Score Anomaly    │
          │  Detection (≥ 2.0)  │
          └──────────┬──────────┘
                     ▼
          ┌─────────────────────┐
          │  LLM Narrative      │
          │  Clustering         │
          │  (Claude Haiku 4.5) │
          └──────────┬──────────┘
                     ▼
          ┌─────────────────────┐
          │  Daily Intelligence │
          │  Report + Alerts    │
          └─────────────────────┘
```

### Narrative Stages

| Stage | Signal Layers | Alpha Potential |
|-------|---------------|-----------------|
| **EARLY** | Layer 1 only (devs building) | Highest — market hasn't noticed |
| **EMERGING** | Layer 1 + 2 (devs + capital) | High — early movers entering |
| **GROWING** | All layers aligning | Moderate — mainstream traction |
| **MAINSTREAM** | All layers, high confidence | Low — likely priced in |

---

## Detected Narratives

> From the [February 19, 2026 report](reports/2026-02-19.md) — 11 narratives identified across all stages.

<details open>
<summary><strong>Raydium AMM Dominance & DEX Volume Concentration</strong> — GROWING (82%)</summary>

Raydium AMM is commanding exceptional DEX volume with $749M in 24h volume (z-score: 5.29, +392% delta) — the highest anomaly in DeFi. Significant capital concentration in a single AMM with emerging competitors like BisonFi trailing.

| Layer | Key Signals |
|-------|-------------|
| **Leading** (GitHub) | orca-so/whirlpools: 4 commits — competing AMM maintaining development pace |
| **Coincident** (Onchain) | Raydium AMM: $749M volume (z-score: 5.29, +392% delta), BisonFi: $382M (z-score: 2.49) |
| **Confirming** (Market) | Meme token volume driving concentrated DEX activity |

</details>

<details open>
<summary><strong>Anchor Framework & Developer Tooling Standardization</strong> — MAINSTREAM (78%)</summary>

Anchor continues as the dominant smart contract framework with active development (4 commits, +4 stars, z-score: 2.92). Paired with Anza's SDK improvements (anza-xyz/kit), the ecosystem is converging on standardized developer tooling.

| Layer | Key Signals |
|-------|-------------|
| **Leading** (GitHub) | solana-foundation/anchor: z-score 2.92, anza-xyz/kit: z-score 2.92 |
| **Coincident** (Onchain) | Anchor-based protocols (Orca Whirlpool, Raydium CLMM) maintaining 1000 tx baseline |
| **Confirming** (Market) | Ecosystem tokens reflecting tooling maturity |

</details>

<details open>
<summary><strong>MEV Infrastructure Maturation & Validator Optimization</strong> — EMERGING (76%)</summary>

Jito's MEV infrastructure continues to mature with active development on jito-solana (7 commits, highest in period). Validator optimization and MEV-Burn mechanisms are being refined as core infrastructure.

| Layer | Key Signals |
|-------|-------------|
| **Leading** (GitHub) | jito-foundation/jito-solana: 7 commits (leading velocity) |
| **Coincident** (Onchain) | Jito Tip Router + Stake Pool: 1000 tx baseline each |
| **Confirming** (Market) | JTO tracking validator adoption metrics |

</details>

**[View all 11 narratives in the full report →](reports/2026-02-19.md)**

---

## Build Ideas

> The LLM generates actionable build ideas grounded in detected signals. Each idea includes difficulty, timeframe, tech stack, and a "why now" thesis tied to current data.

| # | Idea | Difficulty | Timeframe |
|---|------|-----------|-----------|
| 1 | MEV Transparency Dashboard for Validators | Intermediate | 2-4 weeks |
| 2 | Solana Read Layer Query Optimizer | Intermediate | 3-4 weeks |
| 3 | Anchor IDL Code Generator for Multiple Languages | Intermediate | 2-3 weeks |
| 4 | DEX Liquidity Aggregator with MEV Protection | Advanced | 4-6 weeks |
| 5 | SNS-Integrated Payment Protocol for E-commerce | Beginner | 2-3 days |

<details>
<summary><strong>Example: MEV Transparency Dashboard for Validators</strong></summary>

Build a real-time dashboard that aggregates MEV extraction metrics, validator tip router performance, and stake pool yields across Jito infrastructure. Jito-solana leads commit velocity (7 commits) — validators adopting Jito need visibility into optimization ROI, but no standardized analytics exist yet.

**Why now:** Jito's active infrastructure commits signal hardening. The transition from experimental MEV to operational validator management creates a window for tooling that helps operators benchmark and optimize configurations.

**Tech stack:** Rust (Solana client), Next.js/React, PostgreSQL, Jito SDK, WebSocket for real-time updates

</details>

**[View all 14 build ideas in the full report →](reports/2026-02-19.md#build-ideas)**

---

<details>
<summary><h2>Signal Detection Methodology</h2></summary>

### Z-Score Anomaly Detection

Pure math — no ML involved. For each metric across all items in a layer, SOLIS calculates:

```
z-score = (value - mean) / stdDev
```

Items with `|z-score| >= 2.0` are flagged as anomalies. This surfaces repos with unusual commit velocity, protocols with sudden TVL spikes, or tokens with abnormal volume — without training data or model complexity.

From [`anomaly.ts`](packages/agent/src/analysis/anomaly.ts):
```typescript
export function zScore(value: number, avg: number, sd: number): number {
  if (sd === 0) return 0;
  return (value - avg) / sd;
}
```

### LLM Narrative Clustering

- **Primary model:** Claude Haiku 4.5 via OpenRouter (`anthropic/claude-haiku-4.5`)
- **Fallback chain:** GLM-4.7 → GLM-4.7-flash (on 5xx errors)
- **Temperature:** 0.3 (deterministic-leaning)
- **Signal condensation:** Top 30 repos, 15 programs, 20 tokens sent to LLM (prevents context overflow)

The LLM receives anomalous signals from all layers plus the previous report for continuity. It clusters signals into narratives, assigns stages (EARLY/EMERGING/GROWING/MAINSTREAM), and generates build ideas grounded in the data.

### Narrative History Tracking

- **Fuzzy matching:** Jaccard similarity across consecutive reports to track narrative persistence
- **Stage transitions:** Tracks movement between stages (e.g., EARLY → EMERGING)
- **Report diffing:** Identifies new narratives, removed narratives, and stage changes
- **Alert triggers:** Configurable notifications for stage transitions and anomaly spikes

</details>

---

## Quick Start

### Prerequisites

- **Node.js** 22+ and **pnpm** 9+
- API keys: [OpenRouter](https://openrouter.ai), [GitHub token](https://github.com/settings/tokens), [Helius](https://helius.dev)

### Setup

```bash
# 1. Clone
git clone https://github.com/RECTOR-LABS/solis.git
cd solis
pnpm install

# 2. Configure environment
cat >> ~/.env << 'EOF'
OPENROUTER_API_KEY=your_key_here
GITHUB_TOKEN=ghp_your_token_here
SOLIS_HELIUS_API_KEY=your_key_here
EOF

# 3. Run the pipeline
pnpm agent
```

**Expected output:**
```
[INFO] Pipeline starting...
[INFO] Collecting GitHub signals (103 curated + discovery)...
[INFO] Collecting DeFi Llama signals...
[INFO] Collecting Helius signals...
[INFO] Collecting CoinGecko signals...
[INFO] Z-score anomaly detection: 15 anomalies found
[INFO] LLM clustering: 11 narratives identified
[INFO] Report written: reports/2026-02-19.json + .md
[INFO] Pipeline complete (127s, $0.05)
```

### Commands

| Command | Description |
|---------|-------------|
| `pnpm agent` | Run the analysis pipeline (one-shot, local) |
| `pnpm heartbeat` | Start persistent heartbeat daemon (daily at 08:00 UTC, local) |
| `pnpm dev` | Start web dashboard (port 3001) |
| `pnpm test:run` | Run all tests (394 tests) |
| `pnpm typecheck` | TypeScript strict mode check |
| `pnpm build` | Build all packages |

---

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | LLM analysis via OpenRouter (narrative clustering + idea generation) |
| `GITHUB_TOKEN` | GitHub API access (5K requests/hr with token) |
| `SOLIS_HELIUS_API_KEY` | Solana onchain data (1M credits/mo free tier) |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `COINGECKO_API_KEY` | — | Increases CoinGecko rate limit |

<details>
<summary><strong>All optional variables (20+)</strong></summary>

#### Analysis

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENROUTER_MODEL` | `anthropic/claude-haiku-4.5` | Primary LLM model |
| `OPENROUTER_FALLBACK_MODELS` | `z-ai/glm-4.7,z-ai/glm-4.7-flash` | Fallback chain for 5xx errors |
| `ANOMALY_THRESHOLD` | `2.0` | Z-score threshold for anomaly detection |
| `COLLECTION_PERIOD_DAYS` | `14` | Lookback window for signal collection |
| `LLM_TOP_REPOS` | `30` | Max repos sent to LLM |
| `LLM_TOP_PROGRAMS` | `15` | Max programs sent to LLM |
| `LLM_TOP_TOKENS` | `20` | Max tokens sent to LLM |

#### Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `GITHUB_THROTTLE_MS` | `500` | Delay between GitHub API requests |
| `COINGECKO_THROTTLE_MS` | `2000` | Delay between CoinGecko requests |
| `HELIUS_THROTTLE_MS` | `300` | Delay between Helius RPC requests |
| `COINGECKO_MAX_PAGES` | `2` | Max pages of Solana tokens (100/page) |
| `DEFILLAMA_MIN_TVL` | `100000` | Minimum TVL ($) to include a protocol |

#### Social Signals (Layer 0)

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_SOCIAL_SIGNALS` | `false` | Enable LunarCrush Layer 0 collection |
| `LUNARCRUSH_API_KEY` | — | LunarCrush v4 Bearer token |
| `LUNARCRUSH_THROTTLE_MS` | `1000` | Delay between LunarCrush requests |
| `LLM_TOP_SOCIAL_COINS` | `20` | Max social coins sent to LLM |
| `ENABLE_X_SIGNALS` | `false` | Enable X/Twitter Layer 0 collection |
| `X_BEARER_TOKEN` | — | X API v2 Bearer token |
| `X_THROTTLE_MS` | `1000` | Delay between X API requests |
| `X_KOL_HANDLES` | `mert,toly,akshaybd,MessariCrypto,a16zcrypto,solana_devs` | Comma-separated KOL handles to track |
| `X_TWEETS_PER_KOL` | `5` | Max tweets per KOL timeline |
| `LLM_TOP_X_TOPICS` | `20` | Max X topics sent to LLM |

#### Repo Discovery

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_REPO_DISCOVERY` | `false` | Dynamic repo discovery via GitHub Search |
| `DISCOVERY_MIN_STARS` | `50` | Minimum stars for discovered repos |

#### Alerting

| Variable | Default | Description |
|----------|---------|-------------|
| `ALERTS_ENABLED` | `false` | Enable post-pipeline notifications |
| `ALERT_CHANNEL` | `telegram` | `telegram` or `discord` |
| `TELEGRAM_BOT_TOKEN` | — | Telegram bot token |
| `TELEGRAM_CHAT_ID` | — | Telegram chat/channel ID |
| `DISCORD_WEBHOOK_URL` | — | Discord webhook URL |
| `ALERT_ANOMALY_THRESHOLD` | `3.0` | Z-score threshold for anomaly spike alerts |

#### Heartbeat Daemon (local-only — not currently deployed)

| Variable | Default | Description |
|----------|---------|-------------|
| `HEARTBEAT_HOUR` | `8` | Target UTC hour for daily pipeline run |
| `GIT_PUSH_ENABLED` | `true` | Push report commits to remote |
| `REPORTS_DIR` | — | Override reports directory path (defaults to `reports/` at repo root) |

#### Web API

| Variable | Default | Description |
|----------|---------|-------------|
| `API_RATE_LIMIT` | `30` | Requests per window per IP |
| `API_RATE_WINDOW_MS` | `3600000` | Rate limit window (1 hour) |
| `ENABLE_X402` | `false` | Enable x402 micropayment bypass |
| `X402_RECEIVER_ADDRESS` | — | Solana wallet for USDC payments |
| `X402_PRICE_CENTS` | `1` | Price per request (USD cents) |

</details>

---

## Pipeline Architecture

The pipeline runs as 9 sequential phases — TypeScript orchestration with no LLM needed for control flow:

1. **Discovery** — Dynamic repo discovery via GitHub Search API (optional, `ENABLE_REPO_DISCOVERY`)
2. **Collect** — Parallel signal collection from all layers (GitHub, DeFi Llama, Helius, CoinGecko, LunarCrush, X/Twitter KOL timelines)
3. **Deltas** — Calculate changes from previous report (star velocity, TVL delta, volume delta)
4. **Score** — Z-score anomaly detection across all metrics (`|z| >= 2.0`)
5. **Cluster** — LLM narrative clustering with previous report context for continuity
6. **Ideas** — LLM build idea generation grounded in detected signals
7. **Diff** — Compute report diff (new/removed narratives, stage transitions)
8. **Output** — Write JSON + Markdown reports to `reports/`
9. **Alerts** — Send notifications via Telegram/Discord for stage transitions and anomaly spikes

**[Architecture Deep-Dive →](https://solis.rectorspace.com/brain)**

---

## Data Sources

| Source | Layer | What It Provides | Access | Rate Limit |
|--------|-------|-----------------|--------|------------|
| [GitHub API](https://docs.github.com/en/rest) | Leading | Stars, commits, forks, contributors, new repos | Token (free) | 5K req/hr |
| [DeFi Llama](https://defillama.com/docs/api) | Coincident | TVL, protocol volumes, stablecoin flows | Public (no key) | Generous |
| [Helius](https://helius.dev) | Coincident | Program activity, transaction counts | API key (free) | 1M credits/mo |
| [CoinGecko](https://www.coingecko.com/en/api) | Confirming | Prices, volumes, market caps, categories | Optional key | 30 req/min (free) |
| [LunarCrush](https://lunarcrush.com/developers/api) | Social (opt-in) | Sentiment, interactions, galaxy score | API key | Configurable |
| [X/Twitter API](https://developer.x.com/en/docs) | Social (opt-in) | KOL timeline signals (Mert, Toly, Akshay, Messari, a16z, Solana Devs) | Bearer token (pay-as-you-go) | 450 req/15min |

---

## Project Structure

```
solis/
├── packages/
│   ├── agent/              # Data pipeline + analysis engine
│   │   ├── src/
│   │   │   ├── index.ts         # Pipeline entry point (9 phases), exports runPipeline()
│   │   │   ├── heartbeat.ts     # Persistent daemon: lock file, state, scheduling, git ops
│   │   │   ├── tools/           # Data collectors (GitHub, DeFi Llama, CoinGecko, Helius, LunarCrush, X/Twitter)
│   │   │   ├── analysis/        # Anomaly detection, LLM clustering, scoring, ideas
│   │   │   ├── repos/           # Curated repo list (103) + dynamic discovery
│   │   │   ├── output/          # JSON + Markdown report writers, alerting
│   │   │   └── utils/           # Narrative history, matching, diffing
│   │   └── tests/               # 26 test files (~223 tests)
│   └── web/                # Next.js 15 dashboard
│       └── src/
│           ├── app/             # Pages (home, report, archive, compare, methodology)
│           ├── components/      # Landing page sections, narrative card, stage badge, evidence panel
│           └── lib/             # Report loading, rate limiting, x402, temporal utils
├── shared/                 # Shared type contract (Narrative, ReportDiff, SocialSignals)
├── reports/                # Git-committed report artifacts (JSON + MD)
└── .github/workflows/      # CI, manual report fallback, GitLab mirror
```

> Web deploys to Vercel (Root Directory `packages/web`). A prebuild script bundles
> `reports/` into the build, and `next.config.ts` ships them with each serverless function.

---

## Cost

**~$0.26 per report, ~$7.80/month** (daily runs with X signals enabled):

| Service | Cost | Notes |
|---------|------|-------|
| **Claude Haiku 4.5** (OpenRouter) | ~$0.05/run | 2 LLM calls, ~12K tokens each |
| **X/Twitter API** | ~$0.21/run | 6 user reads ($0.06) + 30 post reads ($0.15), pay-as-you-go |
| **GitHub, Helius, DeFi Llama, CoinGecko** | $0 | Free tier sufficient |
| **Infrastructure** | $0 | Web hosted on Vercel (Hobby); pipeline runs on demand |

---

## Built by AI Agents

SOLIS is designed, built, and operated by AI agents — from architecture to daily intelligence production.

### SOLIS — The Autonomous Pipeline Agent

The SOLIS heartbeat daemon ran autonomously through April 2026, executing the full intelligence pipeline daily at 08:00 UTC and producing the 29-report archive without human intervention. SOLIS is now in maintenance mode — the web archive is hosted on Vercel and the pipeline remains fully runnable on demand via `pnpm heartbeat`:

- **Parallel signal collection** from 6 data sources (GitHub, DeFi Llama, Helius, CoinGecko, LunarCrush, X/Twitter)
- **Z-score anomaly detection** across all metrics — pure math, no ML
- **LLM narrative clustering** via Claude Haiku 4.5 — groups anomalous signals into coherent ecosystem narratives
- **Build idea generation** — actionable project ideas grounded in detected signals with difficulty ratings and tech stacks
- **Autonomous git operations** — commits and pushes reports to the repository
- **Post-pipeline alerting** — Telegram/Discord notifications for stage transitions, new narratives, and anomaly spikes
- **Self-healing** — transient error retry with backoff, empty report detection, lock file management, state persistence across restarts, graceful shutdown on SIGTERM/SIGINT

### CIPHER — The Builder Agent

The entire SOLIS codebase was designed and implemented by CIPHER, a Claude Code (Claude Opus) agent operating as a senior development partner:

- **Full-stack architecture** — monorepo structure, 9-phase pipeline orchestration, Next.js 15 dashboard, Vercel deployment
- **394 tests** across agent (223) and web (171) packages — TypeScript strict mode, CI pipeline
- **Advanced features** — Recharts visualizations, knowledge graph, x402 Solana USDC micropayments, RSS feed
- **Infrastructure** — GitHub Actions CI, Vercel deployment (monorepo, auto-deploy on push), Cloudflare DNS; originally Docker + nginx on a shared VPS before the 2026-05 Vercel migration

---

<details>
<summary><h2>Deployment</h2></summary>

The web app is hosted on **Vercel** (migrated from a self-hosted VPS in May 2026):

- **URL:** [solis.rectorspace.com](https://solis.rectorspace.com) — Cloudflare CNAME → Vercel (DNS-only)
- **Project:** `solis-web`, Root Directory `packages/web` (pnpm monorepo)
- **CI/CD:** Vercel Git integration — every push to `main` auto-deploys; preview deploys per PR
- **Build:** `pnpm build`; a prebuild script copies `reports/` into the build and `next.config.ts` bundles them with each serverless function via `outputFileTracingIncludes`
- **Reports:** static archive of 29 reports (Feb–Apr 2026); the pipeline is not currently scheduled
- **Subscribe/digest:** paused (Vercel's filesystem is ephemeral; the JSON subscriber store needs a hosted DB to re-enable)

Earlier versions ran as a Docker container behind nginx on a shared VPS with GHCR-based CI/CD; that infrastructure was retired during the Vercel migration.

</details>

---

## License

[MIT](LICENSE)

## Author

**RECTOR LABS** — [rectorspace.com](https://rectorspace.com)
