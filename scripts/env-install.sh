#!/usr/bin/env bash
# Idempotent Cloud Agent install for insomnia_Automaton
set -euo pipefail
cd /workspace

corepack enable >/dev/null 2>&1 || true
if ! command -v pnpm >/dev/null 2>&1; then
  npm install -g pnpm@10.33.3
fi

pnpm install --frozen-lockfile || pnpm install
pnpm rebuild better-sqlite3

mkdir -p data/demos data/credentials data/kb
node -e "require('better-sqlite3'); console.log('better-sqlite3 ok')"
echo "install complete"
