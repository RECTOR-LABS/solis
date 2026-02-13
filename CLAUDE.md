# SOLIS — Project Guide

## Overview
Solana Onchain & Landscape Intelligence Signal. Detects emerging Solana ecosystem narratives by fusing social sentiment, developer activity, onchain metrics, and market signals into daily intelligence reports.

## Architecture
- **Monorepo**: pnpm workspaces — `packages/agent`, `packages/web`, `shared`
- **Agent**: TypeScript pipeline orchestration, Claude Haiku 4.5 (via OpenRouter) for LLM analysis, GLM fallback chain
- **Web**: Next.js 15 + Tailwind v4, 7-section landing page (hero → pipeline → report → narratives → ideas → methodology → CTA) + 8-section report dashboard (header → nav → metrics → diff → narratives → ideas → sources) + archive/compare pages
- **Reports**: Git-committed JSON/MD artifacts in `reports/`
- **API Guard**: Route-level rate limiting (in-memory sliding window) + optional x402 micropayments for paid tier bypass

## Pipeline
- TypeScript orchestration — direct function calls, no LLM needed for pipeline control
- Claude Haiku 4.5 (OpenRouter) = analyst — narrative clustering, build idea generation (GLM-4.7 → GLM-4.7-flash fallback)
- Narrative history tracking — fuzzy matching (Jaccard similarity) across reports, stage transitions, report diffing
- Post-pipeline alerting — Telegram/Discord notifications for stage transitions, new narratives, anomaly spikes

### Pipeline Phases
1. **Discovery** (optional) — dynamic repo discovery via GitHub Search API
2. **Collect** — parallel signal collection from all layers (3 base + optional Layer 0)
3. **Deltas** — calculate changes from previous report
4. **Score** — z-score anomaly detection
5. **Cluster** — LLM narrative clustering with previous report context
6. **Ideas** — LLM build idea generation
7. **Diff** — compute report diff (new/removed narratives, stage transitions)
8. **Output** — write JSON + Markdown reports
9. **Alerts** — send notifications via configured channel

## 4-Layer Signal Detection
- Layer 0 (SOCIAL, opt-in): LunarCrush v4 — interactions, sentiment, galaxy score, social dominance; X/Twitter v2 — KOL timeline signals (Mert, Toly, Akshay, Messari, a16z, Solana Devs)
- Layer 1 (LEADING): GitHub API — stars, commits, forks, new repos
- Layer 2 (COINCIDENT): DeFi Llama + Helius — TVL, volumes, program activity
- Layer 3 (CONFIRMING): CoinGecko — prices, volumes, categories

## Commands
```bash
pnpm dev          # Start web dev server (port 3001)
pnpm agent        # Run analysis pipeline
pnpm test:run     # Run all tests (~245 tests across agent + web)
pnpm typecheck    # TypeScript check
pnpm build        # Build all packages
```

## Environment
All secrets in `~/Documents/secret/.env`. Required:
- `OPENROUTER_API_KEY` — LLM analysis via OpenRouter (narrative clustering + idea generation)
- `GITHUB_TOKEN` — GitHub API
- `HELIUS_API_KEY` — Onchain data

Optional config (all have sensible defaults in `config.ts`):
- `COLLECTION_PERIOD_DAYS` (14) — lookback period for signal collection
- `LLM_TOP_REPOS` (30), `LLM_TOP_PROGRAMS` (15), `LLM_TOP_TOKENS` (20) — signal condensation limits
- `GITHUB_THROTTLE_MS` (500), `COINGECKO_THROTTLE_MS` (2000), `HELIUS_THROTTLE_MS` (300) — API rate limiting
- `COINGECKO_MAX_PAGES` (2), `DEFILLAMA_MIN_TVL` (100000) — data filters
- `HELIUS_PROGRAMS_PATH` — override built-in program list with JSON file
- `OPENROUTER_FALLBACK_MODELS` (`z-ai/glm-4.7,z-ai/glm-4.7-flash`) — comma-separated fallback model chain for 5xx errors
- `ANOMALY_THRESHOLD` (2.0) — z-score threshold for anomaly detection
- `ALERTS_ENABLED` (false) — enable post-pipeline notifications
- `ALERT_CHANNEL` (telegram) — `telegram` or `discord`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — Telegram bot config
- `DISCORD_WEBHOOK_URL` — Discord webhook config
- `ALERT_ANOMALY_THRESHOLD` (3.0) — z-score threshold for anomaly spike alerts
- `ENABLE_X_SIGNALS` (false) — enable X/Twitter KOL signal collection via X API v2
- `X_BEARER_TOKEN` — X API v2 Bearer token (required when X signals enabled)
- `X_THROTTLE_MS` (1000) — delay between X API requests
- `X_KOL_HANDLES` (mert,toly,akshaybd,MessariCrypto,a16zcrypto,solana_devs) — KOL handles to track
- `X_TWEETS_PER_KOL` (5) — recent tweets to fetch per KOL (5-100)
- `LLM_TOP_X_TOPICS` (20) — max X topics sent to LLM for clustering
- `ENABLE_SOCIAL_SIGNALS` (false) — enable Layer 0 social signal collection via LunarCrush
- `LUNARCRUSH_API_KEY` — LunarCrush v4 Bearer token (required when social signals enabled)
- `LUNARCRUSH_THROTTLE_MS` (1000) — delay between LunarCrush API requests
- `LLM_TOP_SOCIAL_COINS` (20) — max social coins sent to LLM for clustering
- `API_RATE_LIMIT` (30) — default requests per window per IP (web API routes)
- `API_RATE_WINDOW_MS` (3600000) — rate limit window duration in ms (default: 1 hour)
- `ENABLE_X402` (false) — enable x402 micropayment paid tier (returns 402 instead of 429)
- `X402_RECEIVER_ADDRESS` — Solana wallet for USDC payments (required when x402 enabled)
- `X402_PRICE_CENTS` (1) — price per API request in USD cents
- `X402_FACILITATOR_URL` (https://x402.org/facilitator) — x402 payment verification endpoint

## Deployment
- **VPS**: `solis.rectorspace.com` → `176.222.53.185:8001`
- **User**: `solis` (SSH alias: `ssh solis`)
- **Docker**: `ghcr.io/rector-labs/solis:latest` via `docker-compose.yml` (`name: solis`)
- **CI/CD**: Push to `main` (web/reports/shared changes) → GHCR → VPS auto-deploy
- **Report generation**: Daily at 08:00 UTC via GitHub Actions (`generate-report.yml`)
- **Deploy triggers**: Only `packages/web/**`, `reports/**`, `shared/**`, `Dockerfile`, `docker-compose.yml` — agent-only changes don't trigger deploy
- **Cleanup**: Deploy workflow prunes old images aggressively (VPS at 78% disk)

## Key Files
- `shared/src/types.ts` — Type contract between agent and web (Narrative, ReportDiff, FortnightlyReport, SocialSignals, XSignals)
- `packages/agent/src/tools/lunarcrush.ts` — LunarCrush v4 API collector (Layer 0 social signals)
- `packages/agent/src/tools/twitter.ts` — X/Twitter v2 API collector (Layer 0 social signals)
- `packages/agent/src/config.ts` — Environment validation (envalid, 20+ vars)
- `packages/agent/src/index.ts` — Pipeline entry point (9 phases)
- `packages/agent/src/utils/history.ts` — Narrative matching, history population, report diffing
- `packages/agent/src/output/alerts.ts` — Alert detection, formatting, Telegram/Discord dispatch
- `packages/agent/src/output/markdown.ts` — Markdown report with "What Changed" diff section
- `packages/web/src/app/page.tsx` — Homepage: 7-section landing page with container breakout strategy
- `packages/web/src/components/hero-section.tsx` — Client: animated gradient, glassmorphic card, floating tags, live stats ticker
- `packages/web/src/components/signal-pipeline.tsx` — Server: 4-step horizontal/vertical timeline with layer colors
- `packages/web/src/components/report-summary-card.tsx` — Server: glassmorphic report stats card
- `packages/web/src/components/featured-narratives.tsx` — Server: top 4 narratives by confidence
- `packages/web/src/components/build-ideas-highlight.tsx` — Server: top 3 build ideas
- `packages/web/src/components/methodology-trust.tsx` — Server: 2x2 trust/differentiator cards
- `packages/web/src/components/open-source-cta.tsx` — Server: full-bleed GitHub CTA with trust badges
- `packages/web/src/components/scroll-indicator.tsx` — Client: bouncing chevron, hides on scroll
- `packages/web/src/app/report/[date]/page.tsx` — Report page: 8-section intelligence dashboard with section anchors, prev/next nav, stage grouping
- `packages/web/src/components/report-header.tsx` — Server: glassmorphic header with breadcrumb, prev/next chevron nav, export buttons, timestamp
- `packages/web/src/components/report-nav.tsx` — Client: sticky section pills with IntersectionObserver scroll tracking, mounted SSR guard
- `packages/web/src/components/report-metrics.tsx` — Server: 4-stat glassmorphic cards with color-coded top borders (purple/green/blue/orange)
- `packages/web/src/components/report-diff.tsx` — Server: "What Changed" section — stage transitions, new/faded signals, confidence shifts (≥10pt threshold)
- `packages/web/src/components/narrative-stage-group.tsx` — Server: stage-grouped narratives (EARLY→MAINSTREAM) with colored banners, confidence-sorted
- `packages/web/src/components/build-ideas-filter.tsx` — Client: difficulty filter pills (All/Beginner/Intermediate/Advanced) with count badges + filtered grid
- `packages/web/src/components/data-sources-card.tsx` — Server: visual source cards with status dots, layer badges (color-coded), LLM footer
- `packages/web/src/lib/temporal.ts` — Date utilities (freshness, countdown, relative labels)
- `packages/web/src/components/countdown-timer.tsx` — Live countdown to next 08:00 UTC report
- `packages/web/src/components/report-timestamp.tsx` — Freshness-coded relative timestamps
- `packages/web/src/lib/rate-limit.ts` — In-memory sliding window rate limiter
- `packages/web/src/lib/x402.ts` — x402 payment protocol (402 responses, proof verification)
- `packages/web/src/lib/api-guard.ts` — Composable guard combining rate limiting + x402
- `packages/web/src/app/layout.tsx` — App shell (shared header/footer, max-w-6xl container)
- `Dockerfile` — Multi-stage build (deps → build → standalone)
- `docker-compose.yml` — Production container config (port 8001)

## Conventions
- 2-space indent, TypeScript strict mode
- Agent tools follow MCP pattern (zod schema + async handler)
- Tests: vitest, 80%+ coverage on agent/analysis
- One commit per feature/fix
- Client components use `mounted` state guard for SSR hydration safety
- Full-bleed sections use `-mx-4 -mt-8` container breakout on page.tsx (avoids layout.tsx changes)
- Tailwind v4 dynamic class safety: color-dependent classes use static config maps (not template literals)
- Alert errors never crash the pipeline (graceful failure)
- API routes use route-level `apiGuard()` — not Next.js middleware (routes use Node.js APIs)
- x402 is fully opt-in — rate limiting is always-on, payment bypass requires `ENABLE_X402=true`
