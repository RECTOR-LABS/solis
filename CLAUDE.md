# SOLIS — Project Guide

## Overview
Solana Onchain & Landscape Intelligence Signal. Detects emerging Solana ecosystem narratives by fusing developer activity, onchain metrics, and market signals into fortnightly intelligence reports.

## Architecture
- **Monorepo**: pnpm workspaces — `packages/agent`, `packages/web`, `shared`
- **Agent**: TypeScript pipeline orchestration, GLM-4.7 (via OpenRouter) for LLM analysis
- **Web**: Next.js 15 + Tailwind v4, static report rendering
- **Reports**: Git-committed JSON/MD artifacts in `reports/`

## Pipeline
- TypeScript orchestration — direct function calls, no LLM needed for pipeline control
- GLM-4.7 (OpenRouter) = analyst — narrative clustering, build idea generation

## 3-Layer Signal Detection
- Layer 1 (LEADING): GitHub API — stars, commits, forks, new repos
- Layer 2 (COINCIDENT): DeFi Llama + Helius — TVL, volumes, program activity
- Layer 3 (CONFIRMING): CoinGecko — prices, volumes, categories

## Commands
```bash
pnpm dev          # Start web dev server (port 3001)
pnpm agent        # Run analysis pipeline
pnpm test:run     # Run all tests
pnpm typecheck    # TypeScript check
pnpm build        # Build all packages
```

## Environment
All secrets in `~/Documents/secret/.env`. Required:
- `OPENROUTER_API_KEY` — GLM-4.7 (narrative clustering + idea generation)
- `GITHUB_TOKEN` — GitHub API
- `HELIUS_API_KEY` — Onchain data

## Key Files
- `shared/src/types.ts` — Type contract between agent and web
- `packages/agent/src/config.ts` — Environment validation (envalid)
- `packages/agent/src/index.ts` — Pipeline entry point
- `packages/web/src/app/layout.tsx` — App shell

## Conventions
- 2-space indent, TypeScript strict mode
- Agent tools follow MCP pattern (zod schema + async handler)
- Tests: vitest, 80%+ coverage on agent/analysis
- One commit per feature/fix
