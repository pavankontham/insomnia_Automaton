#!/usr/bin/env bash
# Boot-time services for insomnia_Automaton
set -euo pipefail
cd /workspace

corepack enable >/dev/null 2>&1 || true
if ! command -v pnpm >/dev/null 2>&1; then
  npm install -g pnpm@10.33.3 >/dev/null 2>&1 || true
fi

mkdir -p data/demos data/credentials data/kb
pnpm rebuild better-sqlite3 >/dev/null 2>&1 || true

# Autonomous heartbeat worker (self-prompting loop)
if ! tmux has-session -t automaton-worker 2>/dev/null; then
  tmux new-session -d -s automaton-worker "cd /workspace && HEARTBEAT_MS=120000 pnpm worker 2>&1 | tee /tmp/automaton-worker.log"
fi

# Keep the Next.js owner dashboard in the foreground for start-user observability
exec pnpm dev
