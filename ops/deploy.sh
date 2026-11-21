#!/bin/sh
# Deploy or update the site on the server. Run from the repository folder:  sh ops/deploy.sh
# Pulls the latest code (if the folder is a git checkout with a remote), rebuilds, restarts and checks health.
set -eu
cd "$(dirname "$0")/.."

[ -f .env ] || { echo ".env is missing. Copy .env.example to .env and fill it in first."; exit 1; }
for v in POSTGRES_PASSWORD ADMIN_EMAIL SITE_URL ACME_EMAIL; do
  grep -Eq "^$v=.+" .env || { echo "Set $v in .env"; exit 1; }
done

if [ -d .git ] && git remote | grep -q .; then
  git pull --ff-only
fi

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
$COMPOSE up -d --build --remove-orphans
docker image prune -f >/dev/null

echo "Waiting for the site to answer..."
DOMAIN=$(grep -E '^DOMAIN=' .env | cut -d= -f2- || true); DOMAIN=${DOMAIN:-sagatsingh.org}
i=0
until curl -fsS -o /dev/null "https://$DOMAIN/" 2>/dev/null; do
  i=$((i+1)); [ "$i" -ge 30 ] && { echo "Not answering on https://$DOMAIN yet. Check DNS and run: $COMPOSE logs --tail 50 caddy web api"; exit 1; }
  sleep 5
done
$COMPOSE ps
echo "Live at https://$DOMAIN"
