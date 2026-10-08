/**
 * Prompt / context token optimization (FreeLLMAPI-inspired, local).
 * Lossless-first: dedupe repeated blocks, trim whitespace, truncate stale tool dumps.
 */

export type CompressMode = "off" | "lossless" | "standard" | "aggressive";

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function dedupeRepeatedBlocks(text: string): string {
  const lines = text.split("\n");
  const seen = new Map<string, number>();
  const out: string[] = [];
  for (const line of lines) {
    const key = line.trim();
    if (key.length < 40) {
      out.push(line);
      continue;
    }
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    if (n > 2) continue;
    out.push(line);
  }
  return out.join("\n");
}

function collapseWhitespace(text: string): string {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function maskVerboseSections(text: string): string {
  // Observation masking: replace huge fenced dumps with short placeholders
  return text.replace(/```[\s\S]{1200,}?```/g, (block) => {
    const preview = block.slice(0, 180).replace(/```/g, "");
    return `[elided_block ~${estimateTokens(block)}tok | head: ${preview.trim()}…]`;
  });
}

function condenseOlderTurns(text: string): string {
  // Keep last ~40% of content; summarize-marker for the head
  if (text.length < 6000) return text;
  const cut = Math.floor(text.length * 0.55);
  const head = text.slice(0, cut);
  const tail = text.slice(cut);
  const headSummary = head
    .split("\n")
    .filter((l) => /decision|revenue|deal|prospect|error|approve|payment/i.test(l))
    .slice(0, 24)
    .join("\n");
  return `[compacted_prefix]\n${headSummary || "(no critical lines)"}\n[/compacted_prefix]\n${tail}`;
}

export function compressPrompt(
  prompt: string,
  mode: CompressMode = "standard",
): { text: string; savedTokens: number; mode: CompressMode } {
  if (mode === "off") {
    return { text: prompt, savedTokens: 0, mode };
  }
  const before = estimateTokens(prompt);
  let text = collapseWhitespace(dedupeRepeatedBlocks(prompt));
  if (mode === "standard" || mode === "aggressive") {
    text = maskVerboseSections(text);
  }
  if (mode === "aggressive") {
    text = condenseOlderTurns(text);
  }
  text = collapseWhitespace(text);
  const after = estimateTokens(text);
  // Fail-open: never grow the prompt
  if (after >= before) {
    return { text: prompt, savedTokens: 0, mode };
  }
  return { text, savedTokens: before - after, mode };
}
