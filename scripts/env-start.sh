#!/usr/bin/env bash
# Boot-time services for insomnia_Automaton
set -euo pipefail
cd /workspace

# Ensure native sqlite is present after warm boots
pnpm rebuild better-sqlite3 >/dev/null 2>&1 || true
mkdir -p data/demos data/credentials data/kb

# Seed SQLite if empty (safe/idempotent)
if [ ! -f data/insomnia.db ]; then
  pnpm db:seed || true
fi

# Keep the Next.js owner dashboard in the foreground for start-user observability
exec pnpm dev
