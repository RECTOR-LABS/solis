# SOLIS — Project Guide

## Overview
Solana Onchain & Landscape Intelligence Signal. Detects emerging Solana ecosystem narratives by fusing social sentiment, developer activity, onchain metrics, and market signals into daily intelligence reports.

## Architecture
- **Monorepo**: pnpm workspaces — `packages/agent`, `packages/web`, `shared`
- **Agent**: TypeScript pipeline orchestration, Claude Haiku 4.5 (via OpenRouter) for LLM analysis, GLM fallback chain. **Not currently running** — SOLIS is in archive/maintenance mode (heartbeat retired 2026-04-07). Runnable on demand via `pnpm heartbeat` or `pnpm agent`; code lives in `packages/agent/`.
- **Web**: Next.js 15 + Tailwind v4, 7-section landing page (hero → pipeline → report → narratives → ideas → methodology → CTA) + 8-section report dashboard (header → nav → metrics → diff → narratives → ideas → sources) + archive/compare pages. **Deployed on Vercel** (migrated from VPS 2026-05-27).
- **Reports**: Git-committed JSON/MD artifacts in `reports/` (monorepo root). Bundled into the Next.js build via a prebuild copy script (`packages/web/scripts/copy-reports.mjs` → `packages/web/reports/`) and shipped with each Vercel serverless function via `outputFileTracingIncludes` in `next.config.ts`.
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
pnpm agent        # Run analysis pipeline (one-shot) — agent not deployed anywhere; local only
pnpm heartbeat    # Start persistent heartbeat daemon (daily at HEARTBEAT_HOUR UTC) — local only
pnpm test:run     # Run all tests (394 total: 171 web + 223 agent)
pnpm typecheck    # TypeScript check
pnpm build        # Build all packages
pnpm eval:llm     # LLM side-by-side eval (--date YYYY-MM-DD --models a,b)
pnpm eval:calibration # Confidence calibration analysis
# NOTE: `pnpm deploy:agent` still exists in package.json but its target (VPS host
# `solis`) was decommissioned 2026-05-27 — the SCP step will fail. Dead until a new
# agent host is provisioned.
```

## Environment
All secrets in `~/Documents/secret/.env`. Required:
- `OPENROUTER_API_KEY` — LLM analysis via OpenRouter (narrative clustering + idea generation)
- `GITHUB_TOKEN` — GitHub API
- `SOLIS_HELIUS_API_KEY` — Onchain data

Optional config (all have sensible defaults in `config.ts`):
- `COLLECTION_PERIOD_DAYS` (14) — lookback period for signal collection
- `LLM_TOP_REPOS` (30), `LLM_TOP_PROGRAMS` (15), `LLM_TOP_TOKENS` (20) — signal condensation limits
- `GITHUB_THROTTLE_MS` (500), `COINGECKO_THROTTLE_MS` (2000), `HELIUS_THROTTLE_MS` (300) — API rate limiting
- `COINGECKO_MAX_PAGES` (2), `DEFILLAMA_MIN_TVL` (100000) — data filters
- `CACHE_ENABLED` (true) — enable filesystem signal caching
- `CACHE_TTL_HOURS` (20) — cache entry TTL (20h ensures daily runs get fresh data)
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
- `HEARTBEAT_HOUR` (8) — target UTC hour for daily pipeline run (heartbeat daemon only)
- `GIT_PUSH_ENABLED` (true) — push report commits to remote (heartbeat daemon only)
- `REPORTS_DIR` — reports directory path override. Web defaults to `process.cwd()/reports` (the prebuild copy location); agent (`pnpm heartbeat`/`pnpm agent`) defaults to `reports/` at the monorepo root. Set only if reports live elsewhere.
- `DATA_DIR` (process.cwd()) — **legacy/unused**. Was the subscriber JSON store dir. Subscriber persistence is disabled on Vercel (ephemeral FS); the web app no longer reads this.
- `QUERY_API_MODEL` (`anthropic/claude-haiku-4.5`) — model for custom query API via OpenRouter
- `RESEND_API_KEY` — Resend email API key (required for email digest)
- `DIGEST_FROM_EMAIL` (`digest@solis.rectorspace.com`) — from address for digest emails
- `DIGEST_UNSUBSCRIBE_SECRET` — HMAC key for stateless unsubscribe token verification
- `DIGEST_API_SECRET` — shared secret for digest trigger API authentication

## Deployment
**Migrated VPS → Vercel on 2026-05-27 (PR #18). VPS fully decommissioned same day.**
- **Host**: Vercel — project `solis-web` in team `rectors-projects` (`prj_YDbHuii3RiHtuFbwtT4IbSOemVuz`, org `team_ChFWVdEkY44d43iO4jyj1hxD`)
- **Root Directory**: `packages/web` (monorepo — set via Vercel API, not a `vercel.json` field)
- **CI/CD**: Vercel Git integration — **every push to `main` auto-deploys**. No GitHub Actions deploy step (`deploy.yml` removed).
- **Build**: `pnpm build` (runs `prebuild` copy-reports first). Install filtered to `@solis/web...` via `packages/web/vercel.json`.
- **Env vars on Vercel**: only `OPENROUTER_API_KEY` set (Production + Preview, sensitive). Everything else uses defaults from `packages/web/src/lib/env.ts`.
- **Production URL**: `https://solis-web-blond.vercel.app` · **Custom domain**: `solis.rectorspace.com`
- **DNS**: Cloudflare (rectorspace.com zone). `solis` record is a **CNAME → `cname.vercel-dns.com`, DNS-only (grey cloud — NOT proxied)**. Other rectorspace.com A records remain proxied. Zone ID `3a150ea29cd0cd2c07476dd2cc7b0632`.
- **Reports**: shipped via prebuild copy + `outputFileTracingIncludes` (see Architecture). No volume mount.
- **Logs / status**: `vercel logs --scope rectors-projects`, `vercel ls --prod`, or the Vercel dashboard.
- **Agent / report generation**: **not running anywhere**. SOLIS is a static archive (29 reports, 2026-02-12 → 2026-04-06). To resume generation, pick a host (Vercel Cron + serverless function, GitHub Actions cron, or a new VPS) and provide `OPENROUTER_API_KEY` + `GITHUB_TOKEN` + `SOLIS_HELIUS_API_KEY`. `generate-report.yml` workflow remains as a manual fallback but has no scheduled trigger.
- **Subscribe / digest**: disabled (return 503) — JSON-file storage is incompatible with Vercel's ephemeral FS. Re-enabling needs a real store (Upstash Redis / Resend Audiences / Neon).
- **Rollback**: redeploy from `main` (Vercel rebuilds in ~1 min). DNS rollback to VPS is no longer possible — VPS is gone.

## Key Files
- `shared/src/types.ts` — Type contract between agent and web (Narrative, ReportDiff, FortnightlyReport, SocialSignals, XSignals, QueryRequest/Response, Subscriber)
- `packages/agent/src/tools/lunarcrush.ts` — LunarCrush v4 API collector (Layer 0 social signals)
- `packages/agent/src/tools/twitter.ts` — X/Twitter v2 API collector (Layer 0 social signals)
- `packages/agent/src/config.ts` — Environment validation (envalid, 20+ vars)
- `packages/agent/src/index.ts` — Pipeline entry point (9 phases), exports `runPipeline()` for heartbeat
- `packages/agent/src/heartbeat.ts` — Persistent daemon: lock file, state persistence, smart scheduling, git commit/push, graceful shutdown
- `packages/agent/src/utils/history.ts` — Narrative matching, history population, report diffing
- `packages/agent/src/cache/store.ts` — Filesystem signal cache with TTL-based expiry
- `packages/agent/src/cache/star-history.ts` — Star snapshot recording + 7d/30d delta enrichment
- `packages/agent/src/eval/llm-compare.ts` — LLM side-by-side eval CLI (Jaccard overlap, stage agreement, Brier)
- `packages/agent/src/eval/calibration.ts` — Confidence calibration analysis (persistence, Brier score)
- `packages/agent/src/output/alerts.ts` — Alert detection, formatting, Telegram/Discord dispatch
- `packages/agent/src/output/markdown.ts` — Markdown report with "What Changed" diff section
- `packages/web/src/app/page.tsx` — Homepage: 7-section landing page with container breakout strategy
- `packages/web/src/components/hero-section.tsx` — Client: animated gradient, glassmorphic card, floating tags, live stats ticker
- `packages/web/src/components/signal-pipeline.tsx` — Server: 4-step horizontal/vertical timeline with layer colors
- `packages/web/src/components/report-summary-card.tsx` — Server: glassmorphic report stats card
- `packages/web/src/components/featured-narratives.tsx` — Server: top 4 narratives by confidence
- `packages/web/src/components/build-ideas-highlight.tsx` — Server: top 3 build ideas
- `packages/web/src/components/methodology-trust.tsx` — Server: 2x2 trust/differentiator cards
- `packages/web/src/app/feed.xml/route.ts` — RSS 2.0 feed route handler (revalidates hourly, XML string templating, no deps)
- `packages/web/src/app/pricing/page.tsx` — Server: API docs + pricing tiers + x402 integration guide
- `packages/web/src/components/charts/confidence-chart.tsx` — Client: Recharts bar chart — confidence distribution across narratives
- `packages/web/src/components/charts/timeline-chart.tsx` — Client: Recharts line chart — confidence over time per narrative
- `packages/web/src/components/charts/signal-radar.tsx` — Client: Recharts radar chart — signal layer coverage per narrative
- `packages/web/src/components/charts/meta-trends.tsx` — Client: Recharts multi-line chart — pipeline meta trends across reports
- `packages/web/src/app/trends/page.tsx` — Server: pipeline trends page with MetaTrendsChart + aggregate stats
- `packages/web/src/lib/openrouter.ts` — Web-side OpenRouter client for custom query API (standalone from agent)
- `packages/web/src/app/api/query/route.ts` — POST: x402-gated LLM query with report context injection ($0.05/call)
- `packages/web/src/lib/graph.ts` — Force graph data builder (narratives, repos, tokens, protocols → nodes/links)
- `packages/web/src/components/knowledge-graph.tsx` — Client: react-force-graph-2d with dynamic import, hover tooltips, click-to-navigate
- `packages/web/src/app/brain/page.tsx` — Server: knowledge graph page using latest report data
- `packages/web/src/lib/subscribers.ts` — **disabled** (maintenance mode): add/remove throw `SubscriptionsDisabledError`, `loadSubscribers` returns `[]`. HMAC unsubscribe-token verify preserved for historical email links.
- `packages/web/src/app/api/subscribe/route.ts` — POST + DELETE return **503** (paused). OPTIONS/CORS preserved.
- `packages/web/src/components/subscribe-form.tsx` — Server component: static "subscriptions paused" notice linking to RSS + GitHub (no longer a client form)
- `packages/web/src/lib/digest-template.ts` — HTML email template for daily intelligence digest (latent — digest disabled)
- `packages/web/src/lib/digest.ts` — Resend email sender for digest delivery (latent — digest disabled)
- `packages/web/src/app/api/digest/route.ts` — POST returns **503** (paused)
- `packages/web/src/components/open-source-cta.tsx` — Server: full-bleed GitHub CTA with trust badges + RSS link + subscribe notice
- `packages/web/scripts/copy-reports.mjs` — prebuild/predev script: copies `reports/` (monorepo root) → `packages/web/reports/`, excludes `.cache`/`.gitkeep`. Makes reports available to Vercel serverless functions.
- `packages/web/vercel.json` — Vercel build config: monorepo install filter (`pnpm install --filter @solis/web...`), `framework: nextjs`
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
- `packages/web/next.config.ts` — Next.js config: security headers (CSP/HSTS/etc.), `transpilePackages: ['@solis/shared']`, `outputFileTracingIncludes` for reports

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
- apiGuard supports per-route `priceCents` override for different x402 pricing (e.g., query API at $0.05)
- Subscribe + digest endpoints are disabled (503) on Vercel — re-enabling requires a non-filesystem subscriber store (the JSON+atomic-write approach assumed a persistent disk)
- No filesystem writes at runtime on Vercel — serverless FS is ephemeral and read-only except `/tmp`
