import assert from "node:assert/strict";
import test from "node:test";
import { addModelUsage, normalizeModelUsage, parseStructuredJson } from "../lib/model.ts";

test("parses plain structured JSON", () => {
  assert.deepEqual(parseStructuredJson<{ ok: boolean }>("{\"ok\":true}"), { ok: true });
});

test("accepts JSON wrapped in a Markdown fence", () => {
  assert.deepEqual(parseStructuredJson<{ ok: boolean }>("```json\n{\"ok\":true}\n```"), { ok: true });
});

test("rejects output without a JSON object", () => {
  assert.throws(() => parseStructuredJson("no structured result"), /no JSON object/);
});

test("normalizes and accumulates model token usage", () => {
  const first = normalizeModelUsage({ input_tokens: 120, output_tokens: 30, total_tokens: 150 });
  const second = normalizeModelUsage({ input_tokens: 80, output_tokens: 20 });
  assert.deepEqual(addModelUsage(first, second), {
    modelCalls: 2,
    inputTokens: 200,
    outputTokens: 50,
    totalTokens: 250,
  });
});
