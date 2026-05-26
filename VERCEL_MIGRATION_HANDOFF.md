# Vercel Migration — solis

> Handoff for migrating solis-web from VPS reclabs3 → Vercel.
>
> **Origin session**: `[vercel_migration_1]` on 2026-05-26 (audit + plan).
> **Migration session**: `[solis_vercel_1]` on 2026-05-27 (executed plan).
> **Status**: MIGRATED on 2026-05-27 — VPS decom pending (no earlier than 2026-06-03). See `packages/web/VPS_DECOM.md`.

## Scope

| # | Project | Local path | GitHub | Domain | Framework | Status |
|---|---------|-----------|--------|--------|-----------|--------|
| 1 | solis-web | `~/local-dev/solis/packages/web` (monorepo) | `RECTOR-LABS/solis` | solis.rectorspace.com | Next.js 15 | MIGRATED |

**NOT migrating** (stays):
- `packages/agent` — separate package, not currently deployed as a web service. Inspect before any future migration.

## How to use this file

`cd ~/local-dev/solis`, start a new Claude Code session, paste the **Starter Prompt** below.

---

## Migration #1 — solis-web

**Target repo to `cd` into**: `~/local-dev/solis` (the monorepo root)

### Starter Prompt

```
You are continuing a Vercel migration. Today, migrate the solis-web package from VPS reclabs3 → Vercel.

==========================================================
PROJECT
==========================================================
- Name: solis-web
- What: Solis web frontend — Next.js 15 + React 19
- Domain: solis.rectorspace.com
- Tech: Next.js 15 (monorepo — web lives in packages/web)
- GitHub: git@github.com:RECTOR-LABS/solis.git
- Repo layout: pnpm monorepo with packages/web and packages/agent

==========================================================
CURRENT VPS STATE (reclabs3)
==========================================================
- Linux user: solis
- Container: solis-web (Docker, healthy, 6-week uptime)
- Port: 0.0.0.0:8001 -> container :3001 (Next.js started with --port 3001)
- nginx config: /etc/nginx/sites-enabled/solis.rectorspace.com
- TLS: Let's Encrypt cert "solis.rectorspace.com" (verify expiry)
- Image: ghcr.io/rector-labs/solis:latest
- Cmd: node packages/web/server.js (custom Next.js standalone server)
- Deploy: GitHub Actions → GHCR → SSH

==========================================================
TARGET VERCEL CONFIG
==========================================================
- Project name: solis-web (or just "solis")
- Framework: Next.js (auto-detect)
- Root Directory: packages/web        ← IMPORTANT (monorepo)
- Build: next build (Vercel runs this within packages/web)
- Output: .next (auto)
- Install: pnpm install (run from monorepo root — Vercel handles workspace deps if you set Root Directory correctly)
- Env vars: REQUIRED — see step 3
- Production domain: solis.rectorspace.com

==========================================================
EXECUTION STEPS
==========================================================
1) Pre-flight
   $ vercel --version              # ≥ 54.4.1
   $ git status && git pull --rebase
   $ pnpm install
   $ pnpm --filter @solis/web build    # local Next.js build smoke test

2) Verify Next.js standalone output
   Current VPS uses "node packages/web/server.js" — that suggests Next.js standalone output mode.
   Check packages/web/next.config.{js,mjs,ts}:
     - If output: 'standalone' is set, REMOVE it for Vercel (Vercel handles its own packaging)
     - Or leave it — Vercel will still work, just less optimized

3) Collect env vars (safely)
   $ ssh solis "docker inspect solis-web --format '{{range .Config.Env}}{{println .}}{{end}}'" \
       | grep -vE '^_|^PATH|^NODE_|^HOME|^HOSTNAME|^TERM' \
       > /tmp/solis-env-NAMES.txt
   - Likely includes: RESEND_API_KEY (mail), possibly Solana RPC, NEXT_PUBLIC_* vars
   - Add to Vercel dashboard → Settings → Environment Variables (mark secrets Encrypted)

4) Link + preview
   $ vercel link
   - When prompted for Root Directory, set to "packages/web"
   $ vercel
   - Verify preview URL renders fully (graph viz, charts, email forms if applicable)

5) Production domain
   Vercel → Domains → add solis.rectorspace.com

6) DNS cutover (rectorspace.com on Cloudflare per CLAUDE.md)
   - Lower TTL to 300, wait 10 min
   - Replace current A 151.245.137.75 with CNAME → cname.vercel-dns.com
   - On Cloudflare: grey cloud during cutover

7) $ vercel --prod

8) Verify
   $ dig solis.rectorspace.com +short
   $ curl -sI https://solis.rectorspace.com
   - Browser-test: graph rendering (react-force-graph-2d), chart rendering (recharts), email submission (resend)

==========================================================
ROLLBACK
==========================================================
Revert DNS A → 151.245.137.75. VPS container still running.

==========================================================
VPS DECOMMISSION (AFTER 7-DAY BUFFER)
==========================================================
ssh solis
  cd ~/<app-dir>; docker compose down; docker image prune -f

ssh reclabs3 (root)
  sudo rm /etc/nginx/sites-enabled/solis.rectorspace.com
  sudo rm /etc/nginx/sites-available/solis.rectorspace.com
  sudo nginx -t && sudo systemctl reload nginx
  sudo certbot delete --cert-name solis.rectorspace.com

Update ~/.ssh/vps-port-registry.md:
  Remove: "**8001** - solis-web (production - solis.rectorspace.com)"

==========================================================
GOTCHAS
==========================================================
- MONOREPO Root Directory must be packages/web in Vercel project settings
- React 19 + Next.js 15 — current Vercel supports both natively
- react-force-graph-2d uses WebGL/Canvas — verify it works on Vercel (it should, but client-side rendering only)
- recharts is also client-side — verify
- If you remove `output: 'standalone'` from next.config, you may need to also remove the "node server.js" Dockerfile CMD reference (Vercel doesn't care, but local docker dev might break)
- packages/agent is NOT being deployed currently — leave it alone for now

==========================================================
SUCCESS CRITERIA
==========================================================
[ ] Vercel project created with Root Directory = packages/web
[ ] All env vars configured
[ ] Preview deploy fully functional (graph, charts, forms)
[ ] DNS resolves to Vercel
[ ] 7-day buffer → VPS container + nginx + cert cleaned
[ ] Mark DONE
```

---

## Shared notes

- **VPS user `solis`** can be removed after migration (no other services tied to this user — verify before deleting)
- **DNS provider**: Cloudflare (rectorspace.com — per global CLAUDE.md)
- **Audit context**: solis-web is 1 of 11 total migrations in this round
