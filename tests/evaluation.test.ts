import assert from "node:assert/strict";
import test from "node:test";
import { scoreAnalysis } from "../lib/evaluation.ts";

test("scores exact key-file coverage and invalid evidence identifiers", () => {
  const result = scoreAnalysis(
    [{ path: "README.md" }, { path: "src/core.py" }, { path: "tests/test_core.py" }],
    {
      keyFiles: [{ id: "E1", path: "README.md" }, { id: "E2", path: "src/core.py" }],
      summaryEvidenceIds: ["E1"],
      architectureEvidenceIds: ["E2"],
      firstContributionEvidenceIds: ["E2"],
      concepts: [{ evidenceIds: ["E1", "E9"] }],
      learningPath: [{ evidenceIds: ["E2"] }],
      reproduction: { evidenceIds: ["E1"], warnings: [{ evidenceIds: ["E9"] }] },
    },
  );
  assert.equal(result.hitRate, 2 / 3);
  assert.deepEqual(result.missedFiles, ["tests/test_core.py"]);
  assert.equal(result.invalidCitationRate, 2 / 8);
  assert.deepEqual(result.invalidCitationIds, ["E9"]);
});
