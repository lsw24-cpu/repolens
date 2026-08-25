import assert from "node:assert/strict";
import test from "node:test";
import { buildEvidenceWindows } from "../lib/evidence.ts";

test("finds a definition below the first 120 lines and links its caller", () => {
  const coreSource = [
    ...Array.from({ length: 140 }, (_, index) => `# filler ${index + 1}`),
    "def execute_pipeline(repository):",
    "    return repository",
  ].join("\n");
  const windows = buildEvidenceWindows([
    {
      path: "core.py", role: "Core module", reason: "Core implementation.", source: coreSource,
      urlBase: "https://github.com/example/repo/blob/main/core.py",
    },
    {
      path: "main.py", role: "Execution path", reason: "Program entry.",
      source: "from core import execute_pipeline\n\ndef main():\n    return execute_pipeline('repo')\n",
      urlBase: "https://github.com/example/repo/blob/main/main.py",
    },
  ]);

  const definition = windows.find((item) => item.path === "core.py" && item.reason.includes("execute_pipeline"));
  const caller = windows.find((item) => item.path === "main.py" && item.reason.includes("cross-file call evidence"));
  assert.ok(definition);
  assert.ok(definition.lineStart > 120);
  assert.ok(caller);
  assert.match(caller.url, /#L\d+-L\d+$/);
});

test("keeps project entry and configuration evidence at the start of a file", () => {
  const windows = buildEvidenceWindows([{
    path: "README.md", role: "Project entry", reason: "Project documentation.",
    source: "# Example\n\nnpm install\nnpm test\n",
    urlBase: "https://github.com/example/repo/blob/main/README.md",
  }]);
  assert.equal(windows[0].lineStart, 1);
  assert.match(windows[0].promptSource, /^1: # Example/m);
});

test("keeps setup commands that appear later in a README evidence window", () => {
  const source = [
    "# Example",
    ...Array.from({ length: 43 }, (_, index) => `Documentation line ${index + 2}`),
    "pip install -e .",
  ].join("\n");
  const windows = buildEvidenceWindows([{
    path: "README.md", role: "Project entry", reason: "Project documentation.", source,
    urlBase: "https://github.com/example/repo/blob/revision/README.md",
  }]);
  assert.match(windows[0].excerpt, /pip install -e \./);
  assert.ok(windows[0].lineEnd >= 45);
});

test("does not invent cross-file links for ambiguous or common method names", () => {
  const windows = buildEvidenceWindows([
    {
      path: "encoder.py", role: "Model structure", reason: "Encoder.",
      source: "class Encoder:\n    def __init__(self): pass\n    def forward(self, x): return x\n",
      urlBase: "https://github.com/example/repo/blob/revision/encoder.py",
    },
    {
      path: "decoder.py", role: "Model structure", reason: "Decoder.",
      source: "class Decoder:\n    def __init__(self): pass\n    def forward(self, x): return x\n",
      urlBase: "https://github.com/example/repo/blob/revision/decoder.py",
    },
    {
      path: "main.py", role: "Execution path", reason: "Entry.",
      source: "import torch\nmodel = Encoder()\nresult = model.forward(data)\ndevice = torch.device('cpu')\n",
      urlBase: "https://github.com/example/repo/blob/revision/main.py",
    },
    {
      path: "runtime.py", role: "Core module", reason: "Runtime.",
      source: "def device():\n    return 'custom'\n",
      urlBase: "https://github.com/example/repo/blob/revision/runtime.py",
    },
  ]);
  assert.ok(windows.every((item) => !item.reason.includes("call to forward") && !item.reason.includes("__init__") && !item.reason.includes("call to device")));
});

test("respects the evidence window budget", () => {
  const documents = Array.from({ length: 12 }, (_, index) => ({
    path: `src/file-${index}.ts`, role: "Core module", reason: "Core implementation.",
    source: `export function feature${index}() { return ${index}; }`,
    urlBase: `https://github.com/example/repo/blob/main/src/file-${index}.ts`,
  }));
  assert.equal(buildEvidenceWindows(documents, 6).length, 6);
});
