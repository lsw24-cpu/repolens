import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDepth, normalizeGoal, parseRepository, sanitizeEvidenceIds } from "../lib/repository.ts";

test("accepts canonical GitHub repository inputs", () => {
  assert.deepEqual(parseRepository("openai/openai-cookbook"), { owner: "openai", repo: "openai-cookbook" });
  assert.deepEqual(parseRepository("https://github.com/karpathy/nanoGPT.git"), { owner: "karpathy", repo: "nanoGPT" });
});

test("rejects malformed or non-GitHub repository inputs", () => {
  assert.equal(parseRepository("https://example.com/owner/repo"), null);
  assert.equal(parseRepository("owner/repo/extra"), null);
  assert.equal(parseRepository("../secret/repo"), null);
  assert.equal(parseRepository("not a repository"), null);
});

test("normalizes research goals and depth without trusting arbitrary values", () => {
  assert.equal(normalizeGoal("reproduce"), "reproduce");
  assert.equal(normalizeGoal("delete-everything"), "overview");
  assert.equal(normalizeDepth("deep"), "deep");
  assert.equal(normalizeDepth({ value: "deep" }), "standard");
});

test("keeps only server-issued evidence identifiers", () => {
  const allowed = new Set(["E1", "E2"]);
  assert.deepEqual(sanitizeEvidenceIds(["E2", "E9", "E2"], allowed, ["E1"]), ["E2"]);
  assert.deepEqual(sanitizeEvidenceIds(["E9"], allowed, ["E1"]), ["E1"]);
  assert.deepEqual(sanitizeEvidenceIds("E2", allowed, ["E1"]), ["E1"]);
});
