# SOLIS — Project Guide

## Overview
Solana Onchain & Landscape Intelligence Signal. Detects emerging Solana ecosystem narratives by fusing developer activity, onchain metrics, and market signals into daily intelligence reports.

## Architecture
- **Monorepo**: pnpm workspaces — `packages/agent`, `packages/web`, `shared`
- **Agent**: TypeScript pipeline orchestration, GLM-4.7 (via OpenRouter) for LLM analysis
- **Web**: Next.js 15 + Tailwind v4, static report rendering with temporal UX
- **Reports**: Git-committed JSON/MD artifacts in `reports/`

## Pipeline
- TypeScript orchestration — direct function calls, no LLM needed for pipeline control
- GLM-4.7 (OpenRouter) = analyst — narrative clustering, build idea generation
- Narrative history tracking — fuzzy matching (Jaccard similarity) across reports, stage transitions, report diffing
- Post-pipeline alerting — Telegram/Discord notifications for stage transitions, new narratives, anomaly spikes

### Pipeline Phases
1. **Discovery** (optional) — dynamic repo discovery via GitHub Search API
2. **Collect** — parallel signal collection from all 3 layers
3. **Deltas** — calculate changes from previous report
4. **Score** — z-score anomaly detection
5. **Cluster** — LLM narrative clustering with previous report context
6. **Ideas** — LLM build idea generation
7. **Diff** — compute report diff (new/removed narratives, stage transitions)
8. **Output** — write JSON + Markdown reports
9. **Alerts** — send notifications via configured channel

## 3-Layer Signal Detection
- Layer 1 (LEADING): GitHub API — stars, commits, forks, new repos
- Layer 2 (COINCIDENT): DeFi Llama + Helius — TVL, volumes, program activity
- Layer 3 (CONFIRMING): CoinGecko — prices, volumes, categories

## Commands
```bash
pnpm dev          # Start web dev server (port 3001)
pnpm agent        # Run analysis pipeline
pnpm test:run     # Run all tests (~138 tests across agent + web)
pnpm typecheck    # TypeScript check
pnpm build        # Build all packages
```

## Environment
All secrets in `~/Documents/secret/.env`. Required:
- `OPENROUTER_API_KEY` — GLM-4.7 (narrative clustering + idea generation)
- `GITHUB_TOKEN` — GitHub API
- `HELIUS_API_KEY` — Onchain data

Optional config (all have sensible defaults in `config.ts`):
- `COLLECTION_PERIOD_DAYS` (14) — lookback period for signal collection
- `LLM_TOP_REPOS` (30), `LLM_TOP_PROGRAMS` (15), `LLM_TOP_TOKENS` (20) — signal condensation limits
- `GITHUB_THROTTLE_MS` (500), `COINGECKO_THROTTLE_MS` (2000), `HELIUS_THROTTLE_MS` (300) — API rate limiting
- `COINGECKO_MAX_PAGES` (2), `DEFILLAMA_MIN_TVL` (100000) — data filters
- `HELIUS_PROGRAMS_PATH` — override built-in program list with JSON file
- `ANOMALY_THRESHOLD` (2.0) — z-score threshold for anomaly detection
- `ALERTS_ENABLED` (false) — enable post-pipeline notifications
- `ALERT_CHANNEL` (telegram) — `telegram` or `discord`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — Telegram bot config
- `DISCORD_WEBHOOK_URL` — Discord webhook config
- `ALERT_ANOMALY_THRESHOLD` (3.0) — z-score threshold for anomaly spike alerts

## Deployment
- **VPS**: `solis.rectorspace.com` → `176.222.53.185:8001`
- **User**: `solis` (SSH alias: `ssh solis`)
- **Docker**: `ghcr.io/rector-labs/solis:latest` via `docker-compose.yml` (`name: solis`)
- **CI/CD**: Push to `main` (web/reports/shared changes) → GHCR → VPS auto-deploy
- **Report generation**: Daily at 08:00 UTC via GitHub Actions (`generate-report.yml`)
- **Deploy triggers**: Only `packages/web/**`, `reports/**`, `shared/**`, `Dockerfile`, `docker-compose.yml` — agent-only changes don't trigger deploy
- **Cleanup**: Deploy workflow prunes old images aggressively (VPS at 78% disk)

## Key Files
- `shared/src/types.ts` — Type contract between agent and web (Narrative, ReportDiff, FortnightlyReport)
- `packages/agent/src/config.ts` — Environment validation (envalid, 20+ vars)
- `packages/agent/src/index.ts` — Pipeline entry point (9 phases)
- `packages/agent/src/utils/history.ts` — Narrative matching, history population, report diffing
- `packages/agent/src/output/alerts.ts` — Alert detection, formatting, Telegram/Discord dispatch
- `packages/agent/src/output/markdown.ts` — Markdown report with "What Changed" diff section
- `packages/web/src/lib/temporal.ts` — Date utilities (freshness, countdown, relative labels)
- `packages/web/src/components/countdown-timer.tsx` — Live countdown to next 08:00 UTC report
- `packages/web/src/components/report-timestamp.tsx` — Freshness-coded relative timestamps
- `packages/web/src/app/layout.tsx` — App shell
- `Dockerfile` — Multi-stage build (deps → build → standalone)
- `docker-compose.yml` — Production container config (port 8001)

## Conventions
- 2-space indent, TypeScript strict mode
- Agent tools follow MCP pattern (zod schema + async handler)
- Tests: vitest, 80%+ coverage on agent/analysis
- One commit per feature/fix
- Client components use `mounted` state guard for SSR hydration safety
- Alert errors never crash the pipeline (graceful failure)
