#!/usr/bin/env bash
# Atlas — local dev setup. Run from the atlas/ root.
#
#   ./scripts/setup-local.sh
#
# Multi-zone setup: the shell (apps/web) on port 3000 + module apps on
# their own ports (forge on 3001, etc.). All apps share one Lakebase
# Autoscaling instance with one Postgres schema per module.

set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> npm install (workspaces)"
npm install

echo "==> Atlas shell .env.local"
if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
  echo "  • .env.local created from .env.local.example"
  echo "  ! Fill in DATABASE_URL credentials (atlas-admin password) before continuing."
fi

echo "==> Forge .env.local"
if [ ! -f apps/forge/.env.local ]; then
  if [ -f apps/forge/.env.local.example ]; then
    cp apps/forge/.env.local.example apps/forge/.env.local
    echo "  • apps/forge/.env.local created from example"
    echo "  ! Fill in DATABASE_URL / DATABRICKS_HOST / FORGE_LOCAL_USER_EMAIL."
  else
    echo "  • apps/forge/.env.local.example missing — populate apps/forge/.env.local manually"
  fi
fi

if grep -q "<PASSWORD>" .env.local apps/forge/.env.local 2>/dev/null; then
  echo "  ! One of the .env.local files still has the <PASSWORD> placeholder."
  echo "    Fill them in and re-run this script."
  exit 1
fi

echo "==> Push Forge prisma schema to Lakebase (schema=forge)"
( cd apps/forge && npx prisma generate && npx prisma db push --accept-data-loss )

cat <<EOF

✓ Setup complete.

Run the dev servers (one per terminal):
  cd apps/web   && npm run dev    # http://localhost:3000  (Atlas shell)
  cd apps/forge && npm run dev    # http://localhost:3001  (Forge, served via /forge)

EOF
