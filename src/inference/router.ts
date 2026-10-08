import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import { recordAiExpense } from "@/db/ledger";
import type { SurvivalState } from "@/policy/immutable";

export type TaskType =
  | "classify"
  | "research"
  | "copy"
  | "code"
  | "negotiate"
  | "strategy";

export type ModelChoice = {
  provider: string;
  model: string;
  costCentsPerCall: number;
  quality: number;
};

const CATALOG: Record<TaskType, ModelChoice[]> = {
  classify: [
    { provider: "local", model: "heuristic-v1", costCentsPerCall: 0, quality: 72 },
    { provider: "groq", model: "llama-3.1-8b", costCentsPerCall: 1, quality: 82 },
  ],
  research: [
    { provider: "local", model: "research-summarizer", costCentsPerCall: 0, quality: 74 },
    { provider: "gemini", model: "gemini-2.0-flash", costCentsPerCall: 2, quality: 88 },
  ],
  copy: [
    { provider: "local", model: "template-copy", costCentsPerCall: 0, quality: 76 },
    { provider: "groq", model: "llama-3.3-70b", costCentsPerCall: 3, quality: 90 },
  ],
  code: [
    { provider: "local", model: "site-templates", costCentsPerCall: 0, quality: 80 },
    { provider: "groq", model: "qwen-coder", costCentsPerCall: 2, quality: 91 },
  ],
  negotiate: [
    { provider: "local", model: "negotiate-playbook", costCentsPerCall: 0, quality: 78 },
    { provider: "gemini", model: "gemini-2.0-flash", costCentsPerCall: 2, quality: 89 },
  ],
  strategy: [
    { provider: "local", model: "ceo-heuristics", costCentsPerCall: 0, quality: 75 },
    { provider: "gemini", model: "gemini-2.0-pro", costCentsPerCall: 5, quality: 93 },
  ],
};

function hasPaidKey(provider: string): boolean {
  if (provider === "local") return true;
  if (provider === "groq") return Boolean(process.env.GROQ_API_KEY);
  if (provider === "gemini") return Boolean(process.env.GEMINI_API_KEY);
  return false;
}

export function routeModel(
  task: TaskType,
  survival: SurvivalState,
): ModelChoice {
  const options = CATALOG[task].filter((m) => hasPaidKey(m.provider));
  const preferCheap = survival === "YELLOW" || survival === "RED" || survival === "BOOT";
  const sorted = [...options].sort((a, b) =>
    preferCheap
      ? a.costCentsPerCall - b.costCentsPerCall || b.quality - a.quality
      : b.quality - a.quality || a.costCentsPerCall - b.costCentsPerCall,
  );
  return sorted[0] ?? CATALOG[task][0];
}

export type InferenceResult = {
  text: string;
  model: ModelChoice;
  tokensIn: number;
  tokensOut: number;
};

/** Free-tier first inference. Uses local heuristics when no API keys. */
export async function infer(opts: {
  task: TaskType;
  prompt: string;
  survival: SurvivalState;
}): Promise<InferenceResult> {
  const model = routeModel(opts.task, opts.survival);
  const tokensIn = Math.ceil(opts.prompt.length / 4);
  let text = "";

  if (model.provider === "local") {
    text = localInfer(opts.task, opts.prompt);
  } else if (model.provider === "groq" && process.env.GROQ_API_KEY) {
    text = await callOpenAiCompatible({
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: process.env.GROQ_API_KEY,
      model: model.model,
      prompt: opts.prompt,
    });
  } else if (model.provider === "gemini" && process.env.GEMINI_API_KEY) {
    text = await callGemini(process.env.GEMINI_API_KEY, model.model, opts.prompt);
  } else {
    text = localInfer(opts.task, opts.prompt);
  }

  const tokensOut = Math.ceil(text.length / 4);
  getDb()
    .prepare(
      `INSERT INTO inference_costs (id, created_at, provider, model, task, tokens_in, tokens_out, cost_cents)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      randomUUID(),
      new Date().toISOString(),
      model.provider,
      model.model,
      opts.task,
      tokensIn,
      tokensOut,
      model.costCentsPerCall,
    );
  if (model.costCentsPerCall > 0) {
    try {
      recordAiExpense({
        amountCents: model.costCentsPerCall,
        bucket: "compute",
        description: `inference ${model.provider}/${model.model} ${opts.task}`,
      });
    } catch {
      /* freeze or zero treasury — still continue in zero-cost mode */
    }
  }
  return { text, model, tokensIn, tokensOut };
}

function localInfer(task: TaskType, prompt: string): string {
  const snippet = prompt.slice(0, 280).replace(/\s+/g, " ");
  switch (task) {
    case "classify":
      return JSON.stringify({ label: "local_business_website", confidence: 0.8 });
    case "research":
      return `Research notes (local): prioritize businesses with high review counts and no website. Context: ${snippet}`;
    case "copy":
      return `Hi — I built a free demo site tailored to your business so customers can see services, hours, and contact options in one place. Happy to customize pricing/branding if useful.`;
    case "code":
      return `<!-- local template fill -->`;
    case "negotiate":
      return `We can start with a one-time site package in the approved band, demo first, pay before custom domain. Flexible on timeline; not on honesty or spam.`;
    case "strategy":
      return `Focus English-speaking developed markets; sports/wellness/clinics niches; approve idea packs before outreach; close only on cleared payment.`;
    default:
      return snippet;
  }
}

async function callOpenAiCompatible(opts: {
  url: string;
  key: string;
  model: string;
  prompt: string;
}): Promise<string> {
  const res = await fetch(opts.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      messages: [{ role: "user", content: opts.prompt }],
      temperature: 0.4,
    }),
  });
  if (!res.ok) throw new Error(`Inference failed: ${res.status}`);
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

async function callGemini(key: string, model: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!res.ok) throw new Error(`Gemini failed: ${res.status}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export function listCatalog() {
  return CATALOG;
}
