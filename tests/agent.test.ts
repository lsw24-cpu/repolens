import assert from "node:assert/strict";
import test from "node:test";
import { recoverExplorationPaths, validateExplorationRequests } from "../lib/agent.ts";

test("accepts only available unread repository paths", () => {
  const result = validateExplorationRequests([
    { path: "src/core.ts", reason: "Trace the main implementation." },
    { path: "README.md", reason: "Already read." },
    { path: "../../secret", reason: "Not in the tree." },
    { path: "src/core.ts", reason: "Duplicate." },
  ], [{ path: "src/core.ts" }, { path: "src/config.ts" }], new Set(["README.md"]));

  assert.deepEqual(result, [{ path: "src/core.ts", reason: "Trace the main implementation." }]);
});

test("enforces the exploration file budget", () => {
  const candidates = ["a.py", "b.py", "c.py"].map((path) => ({ path }));
  const result = validateExplorationRequests(
    candidates.map(({ path }) => ({ path, reason: `Read ${path}` })),
    candidates,
    new Set(),
    2,
  );
  assert.deepEqual(result.map((item) => item.path), ["a.py", "b.py"]);
});

test("supplies a bounded fallback reason", () => {
  const result = validateExplorationRequests(
    [{ path: "main.go", reason: "   " }],
    [{ path: "main.go" }],
    new Set(),
  );
  assert.equal(result[0].reason, "Add repository evidence that is missing from the current report.");
});

test("recovers allowed paths from a truncated model response", () => {
  const candidates = [{ path: "src/core.py" }, { path: "tests/test_core.py" }, { path: "README.md" }];
  const recovered = recoverExplorationPaths(
    '{"nextFiles":["src/core.py","tests/test_core.py"],"status":',
    candidates,
  );
  assert.deepEqual(recovered, ["src/core.py", "tests/test_core.py"]);
});
