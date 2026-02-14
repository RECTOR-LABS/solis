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

[![Deploy](https://github.com/RECTOR-LABS/solis/actions/workflows/deploy.yml/badge.svg)](https://github.com/RECTOR-LABS/solis/actions/workflows/deploy.yml)
[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6.svg)](https://www.typescriptlang.org/)
[![Solana](https://img.shields.io/badge/Solana-ecosystem-9945FF.svg)](https://solana.com)
[![Node](https://img.shields.io/badge/Node-22%2B-339933.svg)](https://nodejs.org)
[![Live Reports](https://img.shields.io/badge/Live-solis.rectorspace.com-00D084.svg)](https://solis.rectorspace.com)

</div>

---

## Latest Report — February 13, 2026

| Narratives | Anomalies | Repos Analyzed | Build Ideas | LLM Cost |
|:----------:|:---------:|:--------------:|:-----------:|:--------:|
| **10** | **38** | **354** | **15** | **$0.06** |

**[Live Dashboard](https://solis.rectorspace.com)** · **[Latest Report](reports/2026-02-13.md)**

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

> From the [February 13, 2026 report](reports/2026-02-13.md) — 10 narratives identified across all stages.

<details open>
<summary><strong>Memecoin Tooling & Infrastructure Explosion</strong> — GROWING (92%)</summary>

Massive developer activity around memecoin creation, trading, and analysis tools on Solana. The fdv.lol repo shows 335 commits (15.6 z-score), indicating intense development velocity. Multiple trading bots, copy-trading tools, and launchpad integrations are being actively built.

| Layer | Key Signals |
|-------|-------------|
| **Leading** (GitHub) | fdv.lol: 335 commits (z-score 15.6), multiple sniper/copy-trading bot repos gaining stars |
| **Coincident** (Onchain) | PumpSwap: $968M 24h volume (z-score 5.04), BisonFi: $575M (+55% delta) |
| **Confirming** (Market) | BUTTCOIN: +143% 14d, PIPPIN: +77% 14d, Meme category: $4.15B mcap |

</details>

<details open>
<summary><strong>AI Agent Integration for Solana DeFi</strong> — EMERGING (85%)</summary>

Growing developer focus on AI agents that autonomously interact with Solana DeFi protocols. New repos like solana-agent-kit, CloddsBot, and OctoBot show integration of LangChain/Claude with Solana trading operations.

| Layer | Key Signals |
|-------|-------------|
| **Leading** (GitHub) | solana-agent-kit (LangChain integration), CloddsBot (Claude-powered arbitrage), solana-mcp-server |
| **Coincident** (Onchain) | $538M stablecoin inflows supporting bot operations, concentrated DEX volume |
| **Confirming** (Market) | C98: +67%, POKT: +57%, SOL trending |

</details>

<details open>
<summary><strong>Solana Data Infrastructure & Indexing</strong> — EARLY (65%)</summary>

Growing focus on data infrastructure and transaction parsing for Solana. gRPC-based DEX parsing, data scraping tools, and RPC infrastructure indicate data indexing is becoming a critical bottleneck being addressed by infrastructure teams.

| Layer | Key Signals |
|-------|-------------|
| **Leading** (GitHub) | dexscraper: 41 commits, helius-sdk: 3 commits, solana-defi (gRPC DEX parsing) |
| **Coincident** (Onchain) | $968M PumpSwap volume creating demand for real-time data |
| **Confirming** (Market) | Foundational layer — no direct price signals yet |

</details>

**[View all 10 narratives in the full report →](reports/2026-02-13.md)**

---

## Build Ideas

> The LLM generates actionable build ideas grounded in detected signals. Each idea includes difficulty, timeframe, tech stack, and a "why now" thesis tied to current data.

| # | Idea | Difficulty | Timeframe |
|---|------|-----------|-----------|
| 1 | Memecoin Safety Score API | Intermediate | 2-4 weeks |
| 2 | Memecoin Launch Analytics Dashboard | Beginner | 2-3 days |
| 3 | AI Agent Portfolio Rebalancer | Intermediate | 3-4 weeks |
| 4 | Multi-Chain Memecoin Arbitrage Bot | Advanced | 6-8 weeks |
| 5 | Zero-Slot Sandwich Detection Tool | Advanced | 4-6 weeks |

<details>
<summary><strong>Example: Memecoin Safety Score API</strong></summary>

Build a real-time API that analyzes memecoin contracts for rug-pull indicators, liquidity lock status, and holder distribution patterns. Integrate with fdv.lol data to provide risk scores that trading bots and launchpads can query before execution.

**Why now:** Memecoin trading volume is at all-time highs with 335 commits to fdv.lol (15.6 z-score), but there's no standardized safety layer. Traders are losing millions to rugs weekly — a safety API would be immediately adopted by launchpads and bots.

**Tech stack:** Rust, Solana Web3.js, PostgreSQL, FastAPI, Anchor IDL parsing

**Reference projects:** fdv.lol, PumpSwap, solana-sniper-copy-mev-trading-bot

</details>

**[View all 15 build ideas in the full report →](reports/2026-02-13.md#build-ideas)**

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
HELIUS_API_KEY=your_key_here
EOF

# 3. Run the pipeline
pnpm agent
```

**Expected output:**
```
[INFO] Pipeline starting...
[INFO] Collecting GitHub signals (64 curated + discovery)...
[INFO] Collecting DeFi Llama signals...
[INFO] Collecting Helius signals...
[INFO] Collecting CoinGecko signals...
[INFO] Z-score anomaly detection: 38 anomalies found
[INFO] LLM clustering: 10 narratives identified
[INFO] Report written: reports/2026-02-13.json + .md
[INFO] Pipeline complete (134s, $0.06)
```

### Commands

| Command | Description |
|---------|-------------|
| `pnpm agent` | Run the analysis pipeline (one-shot) |
| `pnpm heartbeat` | Start persistent heartbeat daemon (daily at 08:00 UTC) |
| `pnpm dev` | Start web dashboard (port 3001) |
| `pnpm test:run` | Run all tests (353 tests) |
| `pnpm typecheck` | TypeScript strict mode check |
| `pnpm build` | Build all packages |
| `pnpm deploy:agent` | Bundle heartbeat daemon and SCP to VPS |

---

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | LLM analysis via OpenRouter (narrative clustering + idea generation) |
| `GITHUB_TOKEN` | GitHub API access (5K requests/hr with token) |
| `HELIUS_API_KEY` | Solana onchain data (1M credits/mo free tier) |

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

#### Heartbeat Daemon

| Variable | Default | Description |
|----------|---------|-------------|
| `HEARTBEAT_HOUR` | `8` | Target UTC hour for daily pipeline run |
| `GIT_PUSH_ENABLED` | `true` | Push report commits to remote |
| `REPORTS_DIR` | — | Override reports directory path (Docker volume mount) |

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
│   │   └── tests/               # 24 test files (~197 tests)
│   └── web/                # Next.js 15 dashboard
│       └── src/
│           ├── app/             # Pages (home, report, archive, compare, methodology)
│           ├── components/      # Landing page sections, narrative card, stage badge, evidence panel
│           └── lib/             # Report loading, rate limiting, x402, temporal utils
├── shared/                 # Shared type contract (Narrative, ReportDiff, SocialSignals)
├── reports/                # Git-committed report artifacts (JSON + MD)
├── Dockerfile              # Multi-stage build (deps → build → standalone)
├── docker-compose.yml      # Production deployment (port 8001, reports volume mount)
└── .github/workflows/      # CI, deploy, manual report fallback, GitLab mirror
```

---

## Cost

**~$0.06 per report, ~$2/month** (daily runs):

- **Claude Haiku 4.5** via OpenRouter: ~$0.06/run (2 LLM calls, ~12K tokens each)
- **Infrastructure**: $0 incremental (VPS shared, heartbeat daemon is a single Node process)
- **All data APIs**: Free tier sufficient

---

## Built by AI Agents

SOLIS is designed, built, and operated by AI agents — from architecture to daily intelligence production.

### SOLIS — The Autonomous Pipeline Agent

The SOLIS heartbeat daemon runs continuously on a VPS, executing the full intelligence pipeline daily at 08:00 UTC without human intervention:

- **Parallel signal collection** from 6 data sources (GitHub, DeFi Llama, Helius, CoinGecko, LunarCrush, X/Twitter)
- **Z-score anomaly detection** across all metrics — pure math, no ML
- **LLM narrative clustering** via Claude Haiku 4.5 — groups anomalous signals into coherent ecosystem narratives
- **Build idea generation** — actionable project ideas grounded in detected signals with difficulty ratings and tech stacks
- **Autonomous git operations** — commits and pushes reports to the repository, Docker volume mount makes them instantly live
- **Post-pipeline alerting** — Telegram/Discord notifications for stage transitions, new narratives, and anomaly spikes
- **Self-healing** — lock file management, state persistence across restarts, graceful shutdown on SIGTERM/SIGINT

### CIPHER — The Builder Agent

The entire SOLIS codebase was designed and implemented by CIPHER, a Claude Code (Claude Opus) agent operating as a senior development partner:

- **Full-stack architecture** — monorepo structure, 9-phase pipeline orchestration, Next.js 15 dashboard, Docker deployment
- **353 tests** across agent (197) and web (156) packages — TypeScript strict mode, CI/CD pipeline
- **Advanced features** — Recharts visualizations, knowledge graph, x402 micropayments, email digest system, RSS feed
- **Infrastructure** — GitHub Actions CI/CD, Docker multi-stage builds, VPS deployment automation, nginx reverse proxy

---

<details>
<summary><h2>Deployment</h2></summary>

SOLIS runs on a VPS behind nginx with automated CI/CD:

- **URL:** [solis.rectorspace.com](https://solis.rectorspace.com)
- **Web container:** `ghcr.io/rector-labs/solis:latest` (port 8001)
- **Agent daemon:** Persistent heartbeat process on VPS — runs pipeline daily at 08:00 UTC, commits & pushes reports
- **Reports:** Docker volume mount (`reports/ → /app/reports:ro`) — new reports appear instantly without rebuild
- **CI/CD:** Push to `main` → GHCR build → VPS auto-deploy
- **Deploy triggers:** Only `packages/web/**`, `shared/**`, `Dockerfile`, `docker-compose.yml` — agent/report changes don't trigger deploy
- **Agent deploy:** `pnpm deploy:agent` — esbuild bundle → SCP to VPS

```yaml
# docker-compose.yml
name: solis
services:
  web:
    image: ghcr.io/rector-labs/solis:latest
    ports:
      - "8001:3001"
    environment:
      - REPORTS_DIR=/app/reports
    volumes:
      - /home/solis/solis/reports:/app/reports:ro
    restart: unless-stopped
```

</details>

---

## License

[MIT](LICENSE)

## Author

**RECTOR LABS** — [rectorspace.com](https://rectorspace.com)
