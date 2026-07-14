<!-- Satellite context file — extends the global hub (~/.claude/CLAUDE.md | ~/.pi/agent/AGENTS.md). Host-neutral; project-specific only. Do not duplicate hub standards here. -->

# SOLIS

> Solana Onchain & Landscape Intelligence Signal. Detects emerging Solana ecosystem narratives by fusing social sentiment, developer activity, on-chain metrics, and market signals into daily intelligence reports.

## Architecture

- **Monorepo:** pnpm workspaces — `packages/agent`, `packages/web`, `shared`
- **Agent:** TypeScript pipeline orchestration, Claude Haiku 4.5 (via OpenRouter) for LLM analysis, GLM fallback chain. **Not currently running** — SOLIS is in archive/maintenance mode (heartbeat retired 2026-04-07). Runnable on demand via `pnpm heartbeat` / `pnpm agent`; code in `packages/agent/`.
- **Web:** Next.js 15 + Tailwind v4, 7-section landing page + 8-section report dashboard + archive/compare pages. **Deployed on Vercel** (migrated from VPS 2026-05-27).
- **Reports:** Git-committed JSON/MD artifacts in `reports/` (monorepo root). Bundled into the Next.js build via a prebuild copy script (`packages/web/scripts/copy-reports.mjs` → `packages/web/reports/`) and shipped with each Vercel serverless function via `outputFileTracingIncludes` in `next.config.ts`.
- **API Guard:** Route-level rate limiting (in-memory sliding window) + optional x402 micropayments for paid tier bypass.

## Pipeline

TypeScript orchestration (direct function calls, no LLM for control) · Claude Haiku 4.5 (OpenRouter) analyst — narrative clustering, build idea generation (GLM-4.7 → GLM-4.7-flash fallback) · narrative history tracking (fuzzy Jaccard matching across reports, stage transitions, report diffing) · post-pipeline alerting (Telegram/Discord).

### Phases
1. **Discovery** (optional) — dynamic repo discovery via GitHub Search API
2. **Collect** — parallel signal collection (3 base + optional Layer 0)
3. **Deltas** — changes from previous report
4. **Score** — z-score anomaly detection
5. **Cluster** — LLM narrative clustering with previous report context
6. **Ideas** — LLM build idea generation
7. **Diff** — report diff (new/removed narratives, stage transitions)
8. **Output** — write JSON + Markdown reports
9. **Alerts** — notifications via configured channel

### 4-Layer Signal Detection
- **Layer 0 (SOCIAL, opt-in):** LunarCrush v4 (interactions, sentiment, galaxy score, social dominance); X/Twitter v2 — KOL timeline signals (Mert, Toly, Akshay, Messari, a16z, Solana Devs)
- **Layer 1 (LEADING):** GitHub API — stars, commits, forks, new repos
- **Layer 2 (COINCIDENT):** DeFi Llama + Helius — TVL, volumes, program activity
- **Layer 3 (CONFIRMING):** CoinGecko — prices, volumes, categories

## Common Commands

```bash
pnpm dev          # web dev server (port 3001)
pnpm agent        # run analysis pipeline (one-shot) — local only
pnpm heartbeat    # persistent daemon (daily at HEARTBEAT_HOUR UTC) — local only
pnpm test:run     # 394 tests (171 web + 223 agent)
pnpm typecheck
pnpm build        # build all packages
pnpm eval:llm     # LLM side-by-side eval (--date YYYY-MM-DD --models a,b)
pnpm eval:calibration  # confidence calibration analysis
# NOTE: `pnpm deploy:agent` target (VPS host `solis`) decommissioned 2026-05-27 — dead until a new agent host is provisioned.
```

## Environment

All secrets in `~/Documents/secret/.env`. Required: `OPENROUTER_API_KEY` · `GITHUB_TOKEN` · `SOLIS_HELIUS_API_KEY`. Optional config (defaults in `config.ts`): `COLLECTION_PERIOD_DAYS` (14), `LLM_TOP_REPOS` (30) / `LLM_TOP_PROGRAMS` (15) / `LLM_TOP_TOKENS` (20), throttle rates, `ANOMALY_THRESHOLD` (2.0), `ALERTS_ENABLED` (false), `ALERT_CHANNEL` (telegram|discord), Telegram/Discord creds, `ENABLE_X_SIGNALS` (false) + `X_BEARER_TOKEN` + `X_KOL_HANDLES`, `ENABLE_SOCIAL_SIGNALS` (false) + `LUNARCRUSH_API_KEY`, API rate-limit + x402 (`API_RATE_LIMIT` 30, `ENABLE_X402` false, `X402_RECEIVER_ADDRESS`, `X402_PRICE_CENTS` 1), `HEARTBEAT_HOUR` (8), `GIT_PUSH_ENABLED` (true), `QUERY_API_MODEL` (`anthropic/claude-haiku-4.5`), digest email (`RESEND_API_KEY`, `DIGEST_*`).

## Deployment

**Migrated VPS → Vercel on 2026-05-27 (PR #18). VPS fully decommissioned.**
- **Host:** Vercel — project `solis-web` in team `rectors-projects`. **Root Directory:** `packages/web` (set via Vercel API).
- **CI/CD:** Vercel Git integration — every push to `main` auto-deploys. No GitHub Actions deploy step.
- **Build:** `pnpm build` (runs `prebuild` copy-reports first). Install filtered to `@solis/web...` via `packages/web/vercel.json`.
- **Env vars on Vercel:** only `OPENROUTER_API_KEY` (Production + Preview). Everything else defaults from `packages/web/src/lib/env.ts`.
- **Production URL:** `https://solis-web-blond.vercel.app` · **Custom domain:** `solis.rectorspace.com`
- **DNS:** Cloudflare (rectorspace.com zone). `solis` = CNAME → `cname.vercel-dns.com`, **DNS-only (grey cloud — NOT proxied)**.
- **Agent / report generation:** not running anywhere. SOLIS is a static archive (29 reports, 2026-02-12 → 2026-04-06). To resume: pick a host (Vercel Cron + serverless, GitHub Actions cron, or new VPS) + provide the 3 required keys. `generate-report.yml` remains as a manual fallback (no scheduled trigger).
- **Subscribe / digest:** disabled (return 503) — JSON-file storage incompatible with Vercel's ephemeral FS. Re-enabling needs a real store (Upstash Redis / Resend Audiences / Neon).

## Key Files

- `shared/src/types.ts` — type contract between agent and web (Narrative, ReportDiff, SocialSignals, XSignals, QueryRequest/Response, Subscriber)
- `packages/agent/src/{config,index,heartbeat}.ts` — pipeline entry (9 phases), persistent daemon, env validation
- `packages/agent/src/tools/{lunarcrush,twitter}.ts` — Layer 0 social collectors
- `packages/agent/src/utils/history.ts` — narrative matching, history, report diffing
- `packages/agent/src/cache/{store,star-history}.ts` — filesystem cache + star delta enrichment
- `packages/agent/src/eval/{llm-compare,calibration}.ts` — LLM eval + calibration
- `packages/agent/src/output/{alerts,markdown}.ts` — alert dispatch + markdown report
- `packages/web/src/app/page.tsx` — 7-section landing
- `packages/web/src/components/` — hero, signal-pipeline, report cards, charts (confidence/timeline/radar/meta-trends), knowledge-graph
- `packages/web/src/lib/{openrouter,graph,subscribers,rate-limit,x402,api-guard}.ts`
- `packages/web/src/app/api/{query,subscribe,digest}/route.ts` — query (x402-gated), subscribe (503 paused), digest (503 paused)
- `packages/web/scripts/copy-reports.mjs` — prebuild reports copy
- `packages/web/next.config.ts` — security headers, `transpilePackages`, `outputFileTracingIncludes`

## Conventions

- 2-space indent, TypeScript strict
- Agent tools follow MCP pattern (zod schema + async handler)
- Tests: vitest, 80%+ coverage on agent/analysis
- Client components use `mounted` state guard for SSR hydration safety
- Full-bleed sections use `-mx-4 -mt-8` container breakout on page.tsx
- Tailwind v4 dynamic class safety: color-dependent classes use static config maps (not template literals)
- Alert errors never crash the pipeline (graceful failure)
- API routes use route-level `apiGuard()` — not Next.js middleware
- x402 fully opt-in — rate limiting always-on, payment bypass requires `ENABLE_X402=true`
- No filesystem writes at runtime on Vercel (serverless FS ephemeral, read-only except `/tmp`)