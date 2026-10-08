# Vendor reference — Conway Automaton

This directory holds a shallow clone of [Conway-Research/automaton](https://github.com/Conway-Research/automaton) (MIT) for **study only**.

`insomnia_Automaton` does **not** import or run the Conway runtime. Conway Cloud, wallets, and x402 are optional future adapters behind our own interfaces.

## Patterns we intentionally reuse (reimplemented)

| Conway idea | Our module |
|-------------|------------|
| 5-tier memory + token budget | `src/memory/` |
| Skill `SKILL.md` frontmatter format | `src/skills/` |
| Policy engine + protected paths | `src/policy/` |
| Survival tiers / low-compute | `src/runtime/survival.ts` |
| Model routing by task + tier | `src/inference/router.ts` |
| Constitution immutability | `constitution.md` + policy guards |
| Child agents with lineage | `src/agents/children.ts` |
| Injection defense mindset | treat external content as untrusted |

## Adapter seam (Phase C)

See `src/adapters/conway-stub.ts` for the future Conway Cloud plug-in surface. Free/local adapters are the Day-0 default.

## FreeLLMAPI (token stack)

FreeLLMAPI runs **outside** this repo (local service, typically `http://127.0.0.1:43128/v1`) so Next.js does not watch its `node_modules`.

Upstream: [tashfeenahmed/freellmapi](https://github.com/tashfeenahmed/freellmapi)

Our runtime uses `FREELLMAPI_BASE_URL` + `FREELLMAPI_API_KEY` with prompt compression (`src/inference/compress.ts`) and project KB memory expansion (`src/memory/project-kb.ts`).
