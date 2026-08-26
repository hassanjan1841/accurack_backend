#!/usr/bin/env bash
# One-command local setup for Accurack backend (fresh machine).
# Requires: Node, npm, and a local Postgres OR Docker. Run from the backend repo root:
#   bash scripts/setup-local.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> env"
[ -f .env ] || cp .env.local.example .env

echo "==> ensure Postgres role + database (uses local psql if present, else docker compose)"
if command -v psql >/dev/null 2>&1 && pg_isready -q 2>/dev/null; then
  psql postgres -v ON_ERROR_STOP=0 -c "DO \$\$ BEGIN CREATE ROLE accurack_admin WITH LOGIN PASSWORD 'secure_password_123' SUPERUSER; EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;" >/dev/null 2>&1 || true
  createdb -O accurack_admin accurack_master 2>/dev/null || echo "   (database already exists)"
else
  echo "   local psql not ready — starting Postgres via docker compose"
  docker compose up -d postgres
  until docker compose exec -T postgres pg_isready -U accurack_admin -d accurack_master >/dev/null 2>&1; do sleep 2; done
fi

echo "==> install deps"; npm install
echo "==> prisma generate + migrate"; npx prisma generate && npx prisma migrate deploy
echo "==> seed demo data"; npm run seed:demo

echo "==> mint a dev login token"; npm run dev:token

cat <<'DONE'

==> DONE.
Start the API:   npm run start:dev        (http://localhost:4000)
Then the frontend (separate repo):
    cp .env.local.example .env && npm install && npm run dev   (http://localhost:5173)
Log in without OTP: paste the dev token above into the browser console:
    localStorage.setItem('authToken', '<TOKEN>')  then reload.
DONE
