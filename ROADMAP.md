# SOLIS Roadmap

## v0.1 — Foundation (Complete)

- [x] Monorepo setup (pnpm workspaces)
- [x] Shared types contract
- [x] Data collection tools (GitHub, DeFi Llama, CoinGecko, Helius)
- [x] Curated Solana repo list (65+ verified repos)
- [x] Z-score anomaly detection
- [x] OpenRouter GLM-4.7 client
- [x] Narrative clustering via LLM
- [x] Build idea generation
- [x] Cross-layer scoring
- [x] JSON + Markdown report output
- [x] Pipeline orchestration (index.ts)
- [x] Website: landing page, report detail, archive, methodology
- [x] CI workflow (typecheck + tests)
- [x] GitHub Actions cron (fortnightly)
- [x] GitLab mirror workflow

## v0.2 — First Live Report (Complete)

- [x] GitHub repo (RECTOR-LABS/solis)
- [x] Configure repository secrets
- [x] First dry run: validate pipeline end-to-end
- [x] First real report generated (2026-02-12)
- [x] Deploy website to VPS (solis.rectorspace.com)
- [x] Docker + GHCR CI/CD pipeline (auto-deploy on push to main)
- [x] Layer 0: X/Twitter KOL timeline signal collection
- [x] Layer 0: LunarCrush social signal collection
- [x] Narrative history tracking (fuzzy matching, stage transitions, report diffing)
- [x] Post-pipeline alerting (Telegram/Discord notifications)
- [x] Pipeline error resilience (retry logic, graceful degradation)
- [x] Dynamic repo discovery via GitHub Search API
- [x] x402 micropayment middleware (opt-in paid tier bypass)
- [x] Report comparison page (/compare)
- [x] Narrative timeline page (/narrative/[slug]/timeline)
- [x] Full-text search modal (Cmd+K)
- [x] CSV/JSON export
- [x] Homepage revamp: 7-section glassmorphic landing page
- [x] Report page revamp: 8-section intelligence dashboard (header, nav, metrics, diff, stage-grouped narratives, filtered ideas, source cards)
- [x] Expand curated repo list to 100+ (103 repos)
- [x] Persistent VPS heartbeat daemon (replaces GitHub Actions cron)
- [x] Docker volume mount for reports (no rebuild on new reports)

## v0.2.1 — Stabilization (Current)

- [ ] Manual quality review of first 2-3 reports
- [ ] Monitor heartbeat daemon reliability (first week)
- [ ] ~~Set up Telegram alerts for pipeline notifications~~ (deferred — low priority, daemon logs suffice for now)

## v0.3 — Monetization (Complete)

- [x] Historical reports API (x402-gated)
- [x] Signals API (x402-gated)
- [x] Wallet setup (Solana USDC)
- [x] Pricing page / documentation
- [ ] Payment flow end-to-end testing

## v0.4 — Quality Improvements (Complete)

- [x] Side-by-side eval: LLM comparison CLI (`pnpm eval:llm`)
- [x] Filesystem signal cache (20h TTL, delta-only fetching merged into cache)
- [x] GitHub star history tracking (7d/30d deltas, velocity)
- [x] Confidence calibration analysis (`pnpm eval:calibration`)

## v0.5 — Advanced Features

- [ ] Custom LLM query API (x402-gated, $0.05/call)
- [ ] Email digest (daily newsletter)
- [x] RSS feed for reports
- [ ] Interactive charts (D3 or Recharts)
- [ ] Brain page expansion (knowledge graph visualization)

## Future

- [ ] Community-contributed repo tracking
- [ ] Multi-chain expansion (Ethereum L2s, Sui)
- [ ] Prediction market integration (Polymarket)
- [ ] API SDK for programmatic access
