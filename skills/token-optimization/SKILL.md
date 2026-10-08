---
name: token-optimization
description: "Minimize tokens: FreeLLMAPI routing, local compress, templates over LLM boilerplate"
auto-activate: true
---

# Token optimization

Tokens are survival.

## Pipeline

1. Deterministic code for templates, scoring, QA, ledger math — never ask an LLM.
2. `compressPrompt` (lossless → standard → aggressive by survival tier).
3. Route via **FreeLLMAPI** `auto` / `auto:fast` / `auto:smart` (stacked free tiers).
4. Send `X-FreeLLM-Compress: standard` on FreeLLMAPI calls.
5. Reject tasks with expected utility < 1 unless experiment bucket funds them.

## Model choice

| Task | Route |
|------|--------|
| classify / triage | `auto:fast` |
| copy / research / negotiate | `auto` |
| strategy / hard code | `auto:smart` |

Track `tokens_in`, `tokens_out`, `savedTokens` every call.
