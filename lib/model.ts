export function parseStructuredJson<T>(value: string): T {
  const trimmed = value.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Model returned no JSON object");
  return JSON.parse(withoutFence.slice(start, end + 1)) as T;
}

export function normalizeModelUsage(value: unknown) {
  const usage = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const number = (candidate: unknown) => typeof candidate === "number" && Number.isFinite(candidate) && candidate > 0
    ? Math.round(candidate)
    : 0;
  const inputTokens = number(usage.input_tokens);
  const outputTokens = number(usage.output_tokens);
  return {
    modelCalls: 1,
    inputTokens,
    outputTokens,
    totalTokens: number(usage.total_tokens) || inputTokens + outputTokens,
  };
}

export function addModelUsage<T extends { modelCalls: number; inputTokens: number; outputTokens: number; totalTokens: number }>(left: T, right: T): T {
  return {
    modelCalls: left.modelCalls + right.modelCalls,
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    totalTokens: left.totalTokens + right.totalTokens,
  } as T;
}
