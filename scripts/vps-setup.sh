#!/usr/bin/env bash
# SOLIS VPS Setup — Run as root on VPS (176.222.53.185)
# Creates solis user, sets up Docker access, nginx, and certbot
set -euo pipefail

DOMAIN="solis.rectorspace.com"
USER="solis"
PORT=8001

echo "=== Creating user: $USER ==="
useradd -m -s /bin/bash "$USER"
usermod -aG docker "$USER"

echo "=== Setting up SSH ==="
mkdir -p /home/$USER/.ssh
chmod 700 /home/$USER/.ssh
# Paste the public key (from local: cat ~/.ssh/github_actions_solis.pub)
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIH1kTDbELEldZQNNe7TWqE2WsGkc9OKGZFujmUHsDp6y github-actions-solis@rectorspace.com" > /home/$USER/.ssh/authorized_keys
chmod 600 /home/$USER/.ssh/authorized_keys
chown -R $USER:$USER /home/$USER/.ssh

echo "=== Copying docker-compose.yml ==="
cat > /home/$USER/docker-compose.yml << 'COMPOSE'
name: solis

services:
  web:
    image: ghcr.io/rector-labs/solis:latest
    container_name: solis-web
    restart: unless-stopped
    ports:
      - "8001:3001"
    environment:
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://127.0.0.1:3001/"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
COMPOSE
chown $USER:$USER /home/$USER/docker-compose.yml

echo "=== Setting up nginx ==="
cat > /etc/nginx/sites-available/$DOMAIN << NGINX
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo "=== Setting up SSL ==="
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m rector@rectorspace.com

echo "=== Done ==="
echo "User: $USER"
echo "Domain: $DOMAIN"
echo "Port: $PORT"
echo "Next: Add VPS_SSH_KEY secret to GitHub repo"
