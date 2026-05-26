# solis-web VPS Decommission Checklist

> Migrated to Vercel on **2026-05-27**. Execute this checklist **no earlier than 2026-06-03** (7-day rollback buffer). Confirm zero traffic still hitting the VPS before deleting anything.

## Pre-decom verification

- [ ] `dig solis.rectorspace.com +short` resolves to Vercel IPs only (66.33.x.x / 76.76.x.x — NOT 151.245.137.75).
- [ ] `vercel ls --prod --scope rectors-projects` shows `solis-web` deployment as Ready with `solis.rectorspace.com` alias.
- [ ] `curl -sI https://solis.rectorspace.com/` → 200 with `server: Vercel` header.
- [ ] VPS access log shows near-zero hits in last 24h:
  ```bash
  ssh solis 'docker logs solis-web --since 24h 2>&1 | grep -c "GET /"'
  ```
  Expect: ≤ 5 (uptime probes only). If significant, investigate.

## VPS cleanup

```bash
ssh solis
cd ~/solis
docker compose down
docker image prune -f
exit
```

```bash
ssh reclabs3   # root
sudo rm /etc/nginx/sites-enabled/solis.rectorspace.com
sudo rm /etc/nginx/sites-available/solis.rectorspace.com
sudo nginx -t && sudo systemctl reload nginx
sudo certbot delete --cert-name solis.rectorspace.com
exit
```

## Registry update

Edit `~/.ssh/vps-port-registry.md` and remove the `8001 - solis-web` line.

## GitHub Actions cleanup

`.github/workflows/deploy.yml` SSHes to the VPS to rebuild the Docker container on every push to `main`. After Vercel cutover, this workflow is dead weight:

```bash
# Option A: disable (keeps file as reference)
gh workflow disable deploy.yml

# Option B: delete entirely
git rm .github/workflows/deploy.yml
git commit -m "chore: remove VPS deploy workflow (Vercel handles deploys now)"
git push
```

Vercel auto-deploys via Git integration on every push to `main`; no GitHub Actions deploy step needed.

## Optional: delete VPS user

If no other services run as user `solis` on reclabs3:

```bash
ssh reclabs3 'sudo userdel -r solis'
```

Confirm `ls -l /home/` shows no other dirs reliant on the user first.

## Memory update

After decom, update `~/.claude/projects/-Users-rector-local-dev-solis/memory/MEMORY.md`:

- Remove the "Heartbeat: stopped + disabled" line — no longer relevant.
- Remove the VPS Details section (or compress to "VPS retired 2026-06-XX").
- Add Vercel deployment notes: project = `solis-web`, scope = `rectors-projects`, Root Directory = `packages/web`.
