import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeGroundedTask, validateEvidenceCommand, validatePlan } from "../lib/plan-validation.ts";
import type { AnalysisPlan, EvidenceFile } from "../lib/types.ts";

const evidence: EvidenceFile = {
  id: "E1",
  path: "README.md",
  role: "Project entry",
  reason: "Installation instructions.",
  lineStart: 1,
  lineEnd: 30,
  excerpt: "Install with:\npip install -e .\nRun with:\npython run.py\nThen inspect the example.",
  url: "https://github.com/example/repo/blob/0123456789012345678901234567890123456789/README.md#L1-L30",
};
const evidenceById = new Map([[evidence.id, evidence]]);
const architectureEvidence: EvidenceFile = {
  ...evidence,
  id: "E2",
  path: "src/model.py",
  excerpt: "class NamedComponent:\n    pass",
  url: "https://github.com/example/repo/blob/0123456789012345678901234567890123456789/src/model.py#L1-L2",
};
const transformerEvidence: EvidenceFile = {
  ...evidence,
  id: "E3",
  path: "src/transformer.py",
  excerpt: "class AttentionBlock:\n    pass",
  url: "https://github.com/example/repo/blob/0123456789012345678901234567890123456789/src/transformer.py#L1-L2",
};

test("keeps only a single command copied verbatim from cited evidence", () => {
  assert.equal(validateEvidenceCommand("pip install -e .", ["E1"], evidenceById), "pip install -e .");
  assert.equal(validateEvidenceCommand("pip install -e .\npytest", ["E1"], evidenceById), "");
  assert.equal(validateEvidenceCommand("pytest", ["E1"], evidenceById), "");
});

test("rejects README prose that merely starts with an executable name", () => {
  const proseEvidence: EvidenceFile = {
    ...evidence,
    excerpt: "Whisper is a general-purpose speech recognition model.\nwhisper japanese.wav --language Japanese",
  };
  const source = new Map([[proseEvidence.id, proseEvidence]]);
  assert.equal(validateEvidenceCommand("Whisper is a general-purpose speech recognition model.", ["E1"], source), "");
  assert.equal(validateEvidenceCommand("whisper japanese.wav --language Japanese", ["E1"], source), "whisper japanese.wav --language Japanese");
});

test("hides unsupported commands embedded in learning tasks", () => {
  assert.equal(
    sanitizeGroundedTask("Run `pytest tests/test_model.py` and record the result.", ["E1"], evidenceById),
    "Review the cited evidence and complete this stage; commands that could not be verified verbatim are not displayed.",
  );
  assert.equal(
    sanitizeGroundedTask("Run `pip install -e .` and record the result.", ["E1"], evidenceById),
    "Run `pip install -e .` and record the result.",
  );
  assert.equal(
    sanitizeGroundedTask("Run `whisper --help` and record the result.", ["E1"], evidenceById),
    "Review the cited evidence and complete this stage; commands that could not be verified verbatim are not displayed.",
  );
});

test("uses a deterministic next action and conservative reproduction summary", () => {
  const shared = {
    summary: "Project summary.",
    summaryEvidenceIds: ["E1"],
    architecture: "Project architecture.",
    architectureEvidenceIds: ["E1"],
    confidence: "high" as const,
    concepts: [{ title: "Concept", explanation: "Explanation.", importance: "core" as const, evidenceIds: ["E1"] }],
    learningPath: [{ title: "Read", description: "Read the source.", evidenceIds: ["E1"], minutes: 10, task: "Record observations.", outcome: "Complete the review." }],
    reproduction: {
      readiness: "ready" as const,
      summary: "The project is ready to reproduce.",
      evidenceIds: ["E1"],
      steps: [{ title: "Install", command: "pip install -e .", reason: "Install the project.", evidenceIds: ["E1"] }],
      warnings: [{ text: "An unverified model warning.", evidenceIds: ["E1"] }],
    },
    quiz: [{ question: "Question?", choices: ["A", "B", "C", "D"], answer: 0, explanation: "Explanation.", evidenceIds: ["E1"] }],
  };
  const fallback: AnalysisPlan = {
    ...shared,
    firstContribution: "Complete a minimal validation from README evidence first.",
    firstContributionEvidenceIds: ["E1"],
    reproduction: {
      ...shared.reproduction,
      warnings: [
        { text: "Review scripts and use an isolated environment before running them.", evidenceIds: [] },
        { text: "The report steps have not been executed.", evidenceIds: [] },
      ],
    },
  };
  const generated: AnalysisPlan = {
    ...shared,
    architecture: "The architecture contains NamedComponent.",
    firstContribution: "The model recommends changing the core architecture directly.",
    firstContributionEvidenceIds: ["E1"],
    reproduction: {
      ...shared.reproduction,
      steps: [{ title: "Install", command: "", reason: "Install the project.", evidenceIds: ["E1"] }],
    },
  };
  const validated = validatePlan(generated, fallback, [evidence, architectureEvidence]);
  assert.equal(validated.firstContribution, fallback.firstContribution);
  assert.deepEqual(validated.architectureEvidenceIds, ["E1", "E2"]);
  assert.equal(validated.reproduction.readiness, "partial");
  assert.match(validated.reproduction.summary, /2 reproduction commands that can be verified verbatim/);
  assert.equal(validated.reproduction.steps[0].command, "pip install -e .");
  assert.deepEqual(validated.reproduction.warnings, fallback.reproduction.warnings);
  assert.equal(validated.confidence, "exploratory");
});

test("adds structural module citations and fills missing steps with exact evidence commands", () => {
  const fallback: AnalysisPlan = {
    summary: "Project summary.",
    summaryEvidenceIds: ["E1"],
    architecture: "Project architecture.",
    architectureEvidenceIds: ["E1"],
    firstContribution: "Complete a minimal validation first.",
    firstContributionEvidenceIds: ["E1"],
    confidence: "medium",
    concepts: [{ title: "Concept", explanation: "Explanation.", importance: "core", evidenceIds: ["E1"] }],
    learningPath: [{ title: "Read", description: "Read the source.", evidenceIds: ["E1"], minutes: 10, task: "Record observations.", outcome: "Complete the review." }],
    reproduction: {
      readiness: "partial",
      summary: "Pending execution.",
      evidenceIds: ["E1"],
      steps: [],
      warnings: [],
    },
    quiz: [{ question: "Question?", choices: ["A", "B", "C", "D"], answer: 0, explanation: "Explanation.", evidenceIds: ["E1"] }],
  };
  const generated: AnalysisPlan = {
    ...fallback,
    summary: "NamedComponent supports the summary.",
    architecture: "NamedComponent processes the input before it enters the transformer.",
    architectureEvidenceIds: ["E1"],
    reproduction: {
      ...fallback.reproduction,
      steps: [
        { title: "Install", command: "pip install -e .", reason: "Install the project.", evidenceIds: ["E1"] },
        { title: "Run", command: "", reason: "Run the project.", evidenceIds: ["E1"] },
      ],
    },
  };

  const validated = validatePlan(generated, fallback, [evidence, architectureEvidence, transformerEvidence]);
  assert.deepEqual(validated.summaryEvidenceIds, ["E1", "E2"]);
  assert.deepEqual(validated.architectureEvidenceIds, ["E1", "E2", "E3"]);
  assert.equal(validated.reproduction.steps.length, 2);
  assert.equal(validated.reproduction.steps[0].command, "pip install -e .");
  assert.equal(validated.reproduction.steps[1].command, "python run.py");
});

test("deduplicates equivalent installation alternatives before adding run commands", () => {
  const commandEvidence: EvidenceFile = {
    ...evidence,
    excerpt: [
      "pip install -U example-package",
      "pip install git+https://github.com/example/example-package.git",
      "sudo apt install ffmpeg",
      "sudo pacman -S ffmpeg",
      "python run.py",
    ].join("\n"),
  };
  const fallback: AnalysisPlan = {
    summary: "Summary.",
    summaryEvidenceIds: ["E1"],
    architecture: "Architecture.",
    architectureEvidenceIds: ["E1"],
    firstContribution: "Validate the smallest workflow.",
    firstContributionEvidenceIds: ["E1"],
    confidence: "medium",
    concepts: [{ title: "Concept", explanation: "Explanation.", importance: "core", evidenceIds: ["E1"] }],
    learningPath: [{ title: "Read", description: "Read the source.", evidenceIds: ["E1"], minutes: 10, task: "Record observations.", outcome: "Complete the review." }],
    reproduction: {
      readiness: "partial",
      summary: "Pending execution.",
      evidenceIds: ["E1"],
      steps: [
        { title: "Install", command: "pip install -U example-package", reason: "Install the package.", evidenceIds: ["E1"] },
        { title: "System dependency", command: "sudo apt install ffmpeg", reason: "Install a system dependency.", evidenceIds: ["E1"] },
        { title: "Run", command: "", reason: "Run the project.", evidenceIds: ["E1"] },
      ],
      warnings: [],
    },
    quiz: [{ question: "Question?", choices: ["A", "B", "C", "D"], answer: 0, explanation: "Explanation.", evidenceIds: ["E1"] }],
  };
  const validated = validatePlan(fallback, fallback, [commandEvidence]);
  assert.deepEqual(validated.reproduction.steps.map((step) => step.command), [
    "pip install -U example-package",
    "sudo apt install ffmpeg",
    "python run.py",
  ]);
});

test("preserves evidence-supported English magnitude claims", () => {
  const quantityEvidence: EvidenceFile = {
    ...evidence,
    excerpt: "The dataset contains 11 million images and 1.1 billion masks.",
  };
  const plan: AnalysisPlan = {
    summary: "Summary.",
    summaryEvidenceIds: ["E1"],
    architecture: "Architecture.",
    architectureEvidenceIds: ["E1"],
    firstContribution: "Validate the smallest workflow.",
    firstContributionEvidenceIds: ["E1"],
    confidence: "medium",
    concepts: [{ title: "Concept", explanation: "Explanation.", importance: "core", evidenceIds: ["E1"] }],
    learningPath: [{ title: "Read", description: "Read the source.", evidenceIds: ["E1"], minutes: 10, task: "Record observations.", outcome: "Complete the review." }],
    reproduction: { readiness: "unknown", summary: "Pending execution.", evidenceIds: ["E1"], steps: [], warnings: [] },
    quiz: [{
      question: "Dataset scale?",
      choices: ["11 million images and 1.1 billion masks", "Other"],
      answer: 0,
      explanation: "The evidence reports 11 million images and 1.1 billion masks.",
      evidenceIds: ["E1"],
    }],
  };
  const validated = validatePlan(plan, plan, [quantityEvidence]);
  assert.equal(validated.quiz[0].explanation, "The evidence reports 11 million images and 1.1 billion masks.");
});
