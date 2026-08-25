import assert from "node:assert/strict";
import test from "node:test";
import { describeFile, extractReadmeReferences, isAnalyzableFile, normalizeNotebookSource, selectKeyFiles, suggestResearchScopes } from "../lib/retrieval.ts";
import type { RepositoryTreeItem } from "../lib/retrieval.ts";

const blob = (path: string, size = 4_000): RepositoryTreeItem => ({ path, size, type: "blob" });

test("selects the complete Python research workflow for reproduction", () => {
  const files = [
    blob("README.md"),
    blob("train.py", 24_000),
    blob("model.py", 18_000),
    blob("config/train_shakespeare_char.py", 1_400),
    blob("data/shakespeare_char/prepare.py", 2_100),
    blob("sample.py", 5_000),
    blob("bench.py", 3_000),
    blob("assets/logo.png", 20_000),
  ];

  const selected = selectKeyFiles(files, "nanoGPT", "reproduce").map((item) => item.path);
  for (const expected of ["README.md", "train.py", "model.py", "config/train_shakespeare_char.py", "data/shakespeare_char/prepare.py"]) {
    assert.ok(selected.includes(expected), `missing ${expected}`);
  }
});

test("balances entry, execution, model, data, tests, and environment evidence", () => {
  const files = [
    blob("README.md"),
    blob("whisper/transcribe.py", 20_000),
    blob("whisper/decoding.py", 32_000),
    blob("whisper/model.py", 40_000),
    blob("whisper/audio.py", 15_000),
    blob("tests/test_transcribe.py", 7_000),
    blob("pyproject.toml", 3_000),
    blob("whisper/utils.py", 80_000),
    blob("whisper/tokenizer.py", 18_000),
  ];

  const selected = selectKeyFiles(files, "whisper", "reproduce").map((item) => item.path);
  assert.deepEqual(new Set(selected), new Set(files.slice(0, 7).map((item) => item.path)));
});

test("recognizes common research environment files and notebooks", () => {
  for (const path of ["requirements.txt", "requirements-dev.txt", "environment.yml", "pyproject.toml", "notebooks/ablation.ipynb"]) {
    assert.equal(isAnalyzableFile(blob(path)), true, path);
  }
  assert.equal(describeFile("data/coco/prepare.py").role, "Data pipeline");
  assert.equal(describeFile("configs/train.yaml").role, "Configuration");
  assert.equal(describeFile("notebooks/ablation.ipynb").role, "Experiment notebook");
  assert.equal(describeFile("model-card.md").role, "Project documentation");
  assert.equal(describeFile("package/predictor.py").role, "Execution path");
  assert.equal(describeFile("segment_anything/modeling/image_encoder.py").role, "Model structure");
});

test("prefers a root research environment file over nested frontend build config", () => {
  const files = [
    blob("README.md"),
    blob("setup.py", 600),
    blob("demo/configs/webpack/common.js", 4_000),
    blob("segment_anything/predictor.py", 12_000),
  ];
  const selected = selectKeyFiles(files, "segment-anything", "reproduce", 2).map((item) => item.path);
  assert.deepEqual(selected, ["README.md", "setup.py"]);
});

test("prioritizes exact research paths cited by the README", () => {
  const files = [
    blob("config/finetune_large.py"),
    blob("config/train_tiny.py"),
    blob("data/production/prepare.py"),
    blob("data/toy/prepare.py"),
  ];
  const readme = "Run `python train.py config/train_tiny.py` after `python data/toy/prepare.py`.";
  const references = extractReadmeReferences(readme, files);
  assert.deepEqual(references, new Set(["config/train_tiny.py", "data/toy/prepare.py"]));
  const selected = selectKeyFiles(files, "research-model", "reproduce", 2, references).map((item) => item.path);
  assert.deepEqual(new Set(selected), references);
});

test("supports C and C++ repositories through the general retrieval path", () => {
  assert.equal(isAnalyzableFile(blob("src/kernel.cc")), true);
  assert.equal(isAnalyzableFile(blob("include/kernel.hpp")), true);
  assert.equal(describeFile("CMakeLists.txt").role, "Configuration");
});

test("extracts notebook cells without exposing raw notebook JSON as evidence", () => {
  const notebook = JSON.stringify({
    cells: [
      { cell_type: "markdown", source: ["# Ablation\n", "Research question"] },
      { cell_type: "code", source: ["seed = 42\n", "run(seed)"] },
    ],
  });
  const normalized = normalizeNotebookSource("notebooks/ablation.ipynb", notebook);
  assert.match(normalized.source, /# %% \[markdown 1\]/);
  assert.match(normalized.source, /seed = 42/);
  assert.doesNotMatch(normalized.source, /\"cell_type\"/);
  assert.match(normalized.locationLabel || "", /Notebook cells/);
});

test("detects multi-project research repositories and honors a focused module", () => {
  const files = [
    blob("bert/README.md"), blob("bert/model.py"),
    blob("cifar/main.py"), blob("cifar/dataset.py"),
    blob("lora/README.md"), blob("lora/lora.py"), blob("lora/models.py"), blob("lora/requirements.txt"),
    blob("whisper/README.md"), blob("whisper/setup.py"),
    blob("README.md"),
  ];
  assert.deepEqual(suggestResearchScopes(files), ["lora", "bert", "cifar", "whisper"]);
  const focused = selectKeyFiles(files, "mlx-examples", "reproduce", 6, new Set(), "lora").map((item) => item.path);
  for (const expected of ["lora/README.md", "lora/lora.py", "lora/models.py", "lora/requirements.txt"]) {
    assert.ok(focused.includes(expected), `missing ${expected}`);
  }
});

test("prefers an exact top-level scope over same-named nested modules", () => {
  const files = [
    blob("README.md"),
    blob("mnist/README.md"), blob("mnist/main.py"), blob("mnist/requirements.txt"),
    blob("cpp/mnist/README.md"), blob("cpp/mnist/mnist.cpp"), blob("cpp/mnist/CMakeLists.txt"),
  ];
  const selected = selectKeyFiles(files, "examples", "reproduce", 8, new Set(), "mnist").map((item) => item.path);
  assert.ok(selected.includes("mnist/main.py"));
  assert.ok(selected.every((path) => !path.startsWith("cpp/")));
});
