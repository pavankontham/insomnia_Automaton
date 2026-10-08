#!/usr/bin/env bash
# Idempotent Cloud Agent install for insomnia_Automaton
set -euo pipefail
cd /workspace

corepack enable >/dev/null 2>&1 || true
if ! command -v pnpm >/dev/null 2>&1; then
  npm install -g pnpm@10.33.3
fi

# Prefer frozen lockfile; fall back if the lock is briefly out of sync on a branch tip
pnpm install --frozen-lockfile || pnpm install
pnpm rebuild better-sqlite3

mkdir -p data/demos data/credentials data/kb

# Seed SQLite during install so agents have a usable DB even before start
if [ ! -f data/insomnia.db ]; then
  pnpm db:seed
fi

node -e "require('better-sqlite3'); console.log('better-sqlite3 ok')"
echo "install complete"
