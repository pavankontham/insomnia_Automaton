#!/usr/bin/env bash
# Boot-time services for insomnia_Automaton
set -euo pipefail
cd /workspace

corepack enable >/dev/null 2>&1 || true
if ! command -v pnpm >/dev/null 2>&1; then
  npm install -g pnpm@10.33.3 >/dev/null 2>&1 || true
fi

mkdir -p data/demos data/credentials data/kb

# Rebuild native module defensively after snapshot boots
pnpm rebuild better-sqlite3 >/dev/null 2>&1 || true

if [ ! -f data/insomnia.db ]; then
  pnpm db:seed || true
fi

# Keep the Next.js owner dashboard in the foreground for start-user observability
exec pnpm dev
