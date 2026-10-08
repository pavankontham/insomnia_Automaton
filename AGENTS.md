<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## insomnia_Automaton — agent notes

- Stack: Next.js (App Router) + TypeScript + Tailwind + SQLite (`better-sqlite3`).
- Dev server: `pnpm dev` → `http://0.0.0.0:43127`.
- Seed: `pnpm db:seed` (idempotent).
- Secrets live in `.env.local` only (never commit). See `.env.example`.
- Primary inference: FreeLLMAPI (`FREELLMAPI_BASE_URL` + `FREELLMAPI_API_KEY`) with local prompt compression + project KB. Without FreeLLMAPI, local heuristics still run.
- Do not run FreeLLMAPI from inside `/workspace` (Turbopack watches `node_modules`). Keep it outside the repo (e.g. `~/services/freellmapi`).
- Protected: `constitution.md`, `src/policy/immutable.ts`, owner treasury / kill switch.
- Owner approves **ideas** only; AI negotiates; deals close only on cleared payment.
