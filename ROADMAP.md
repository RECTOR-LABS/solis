# SOLIS Roadmap

## v0.1 — Foundation (Current)

- [x] Monorepo setup (pnpm workspaces)
- [x] Shared types contract
- [x] Data collection tools (GitHub, DeFi Llama, CoinGecko, Helius)
- [x] Curated Solana repo list (80+ repos)
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

## v0.2 — First Live Report

- [ ] Create GitHub repo (RECTOR-LABS/solis)
- [ ] Configure repository secrets
- [ ] First dry run: validate pipeline end-to-end
- [ ] Manual quality review of first 2-3 reports
- [ ] Expand curated repo list to 200+
- [ ] Deploy website to Vercel (solis.rectorspace.com)
- [ ] Generate first real report

## v0.3 — Monetization

- [ ] x402 middleware integration on API routes
- [ ] Historical reports API (x402-gated)
- [ ] Signals API (x402-gated)
- [ ] Wallet setup (Base USDC + Solana USDC)
- [ ] Payment flow testing

## v0.4 — Quality Improvements

- [ ] Side-by-side eval: GLM-4.7 vs Haiku for English narrative quality
- [ ] Historical data caching (Redis or filesystem)
- [ ] Delta-only fetching (only changes since last run)
- [ ] GitHub star history tracking (not just current count)
- [ ] Narrative stage tracking across reports (stage transitions)
- [ ] Confidence calibration against actual outcomes

## v0.5 — Advanced Features

- [ ] Custom LLM query API (x402-gated, $0.05/call)
- [ ] Email digest (fortnightly newsletter)
- [ ] RSS feed for reports
- [ ] Telegram bot for narrative alerts
- [ ] Interactive charts (D3 or Recharts)
- [ ] Narrative comparison across reports (timeline view)

## Future

- [ ] Community-contributed repo tracking
- [ ] Multi-chain expansion (Ethereum L2s, Sui)
- [ ] Sentiment analysis layer (X/Twitter, Discord)
- [ ] Prediction market integration (Polymarket)
- [ ] API SDK for programmatic access
