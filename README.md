# insomnia_Automaton

Zero-cost **10-day** autonomous micro-business experiment.

Inspired by [Conway Automaton](https://github.com/Conway-Research/automaton) patterns (memory, skills, policy, survival) but **not forked** as the runtime. Conway is vendored under `vendor/conway-automaton/` for study only. A Conway Cloud adapter stub lives at `src/adapters/conway-stub.ts` for a future paid phase.

## Mission

Create genuine value that humans in **developed English-speaking markets** (US, UK, CA, AU, NZ, IE) voluntarily pay for — starting at **$0** seed capital.

- **Owner:** approves **ideas / strategy / offer packages** only  
- **AI:** researches, builds demos, contacts, negotiates on whatever channel the buyer uses  
- **Close:** deal is complete **only after payment clears** (then fulfillment unlocks)  
- **Split:** 50% owner treasury (agent cannot touch) / 50% AI treasury with bucket ceilings  

## Quick start

```bash
pnpm install
pnpm dev
```

Open [http://127.0.0.1:43127](http://127.0.0.1:43127).

### Inference / tokens

Primary path: **[FreeLLMAPI](https://github.com/tashfeenahmed/freellmapi)** — local OpenAI-compatible router that stacks free provider tiers (Groq, Google, …) behind one key.

```bash
# FreeLLMAPI running separately (e.g. http://127.0.0.1:43128/v1)
export FREELLMAPI_BASE_URL=http://127.0.0.1:43128/v1
export FREELLMAPI_API_KEY=freellmapi-...
# Provider keys are added inside FreeLLMAPI; optional direct fallbacks:
export GROQ_API_KEY=...
export GEMINI_API_KEY=...
```

Built-in **prompt compression**, **project KB memory expansion**, and **partitioned child contexts** keep the effective context large while spending few tokens. Without FreeLLMAPI/keys, the runtime falls back to local heuristics.

## Owner control panel

- Epoch countdown + GREEN / YELLOW / RED survival  
- Idea approval queue  
- Live deals + simulate buyer interest / payment clear  
- Children ROI table  
- Capability map, skills, CEO report, channel log  
- Pause / freeze spending / freeze outreach / export  

## Architecture

| Path | Role |
|------|------|
| `constitution.md` | Immutable laws |
| `src/policy/` | Economic + path protection |
| `src/runtime/` | Parent heartbeat, capability map, survival |
| `src/memory/` | 5-tier memory + token budget |
| `src/inference/` | Model router (free-tier first) |
| `src/business/` | Prospect → demo → negotiate → paid close |
| `src/channels/` | Multi-channel adapters |
| `src/agents/` | Specialist children + ROI eval |
| `src/skills/` + `skills/*/SKILL.md` | Conway-compatible skills |
| `src/adapters/` | Free adapters + Conway stub |
| `vendor/conway-automaton/` | MIT reference clone |

## Survival

Each 10-day epoch:

- **GREEN** — cleared revenue ≥ next-cycle cost  
- **YELLOW** — verified `awaiting_payment` commitment (one short extension)  
- **RED** — shutdown parent + children  

## License

Project code: MIT (unless otherwise noted). Conway vendor tree remains under its upstream MIT license.
