import evidenceFixture from "../examples/segment-anything-evidence.json";
import type { EvidenceFile, ModelUsage, RepoAnalysis } from "./types";

type EvidenceFixture = {
  repo: RepoAnalysis["repo"];
  engine: { model?: string };
  stats: RepoAnalysis["stats"];
  usage: ModelUsage;
  tree: RepoAnalysis["tree"];
  readmeExcerpt: string;
  keyFiles: Array<Omit<EvidenceFile, "role" | "reason">>;
};

const captured = evidenceFixture as EvidenceFixture;

if (!captured.keyFiles.length) throw new Error("The Segment Anything evidence fixture is missing.");

const evidenceLabels: Record<string, { role: string; reason: string }> = {
  E1: {
    role: "Project entry",
    reason: "Defines the research objective, installation path, model entry points, and primary use cases.",
  },
  E2: {
    role: "Project documentation",
    reason: "Connects the README quick start, automatic mask generation, ONNX export, and the SamPredictor definition.",
  },
  E3: {
    role: "Configuration",
    reason: "Records package metadata, dependencies, supported Python versions, and runtime constraints.",
  },
  E4: {
    role: "Execution path",
    reason: "Defines SamPredictor and the set_image path that prepares reusable image embeddings.",
  },
  E5: {
    role: "Execution path",
    reason: "Defines prompt inputs, multimask behavior, prediction outputs, and the repeated inference contract.",
  },
  E6: {
    role: "Data pipeline",
    reason: "Defines image, coordinate, and box transforms through the ResizeLongestSide preprocessing contract.",
  },
  E7: {
    role: "Model structure",
    reason: "Exposes the transformer forward path and the tensor-level model boundary used during mask prediction.",
  },
  E8: {
    role: "Experiment notebook",
    reason: "Demonstrates ONNX inputs, prompt-label semantics, padding behavior, and concrete inference output handling.",
  },
  E9: {
    role: "Project documentation",
    reason: "Documents the React and WebAssembly browser demonstration and its model-preparation workflow.",
  },
  E10: {
    role: "Behavior evidence",
    reason: "Defines the ONNX export entry point, supported flags, and reproducible deployment options.",
  },
};

export const samDemo: RepoAnalysis = {
  ...captured,
  repo: {
    ...captured.repo,
    description: "Promptable image segmentation with source-grounded inference, automatic-mask, and ONNX deployment paths.",
  },
  engine: {
    mode: "ai",
    label: "Source-grounded AI analysis",
    model: captured.engine.model,
    note: "DeepSeek analysis validated against immutable repository evidence.",
  },
  exploration: { mode: "standard", rounds: 0, addedFiles: [], notes: [] },
  scope: { focus: "", multiProject: false, suggestions: [] },
  goal: "reproduce",
  depth: "standard",
  summary: "Segment Anything Model (SAM) produces high-quality object masks from point or box prompts and can generate masks for every object in an image. This repository provides inference code, three pretrained backbone variants, example notebooks, automatic-mask generation, ONNX export, and a React/WebAssembly browser demonstration.",
  summaryEvidenceIds: ["E1", "E2", "E9"],
  architecture: "The README establishes supported inputs and model checkpoints. SamPredictor prepares and caches image embeddings before repeated prompt prediction, ResizeLongestSide normalizes images and coordinates, and the ONNX notebook defines the deployment input contract.",
  architectureEvidenceIds: ["E1", "E4", "E5", "E6", "E8"],
  firstContribution: "Trace the SamPredictor input-to-mask path first, then validate the ONNX export contract against the notebook and browser-demo documentation before changing model internals.",
  firstContributionEvidenceIds: ["E4", "E5", "E8", "E9"],
  confidence: "medium",
  technologies: ["Python", "PyTorch", "Jupyter", "ONNX", "React", "WebAssembly"],
  keyFiles: captured.keyFiles.map((file) => ({
    ...file,
    role: evidenceLabels[file.id]?.role || "Repository evidence",
    reason: evidenceLabels[file.id]?.reason || "Supports the fixed-revision research report.",
  })),
  concepts: [
    {
      title: "Promptable segmentation",
      explanation: "SAM turns point or box prompts into object masks and can also generate masks for every object in an image, supporting zero-shot use across segmentation tasks.",
      importance: "foundation",
      evidenceIds: ["E1"],
    },
    {
      title: "SamPredictor and cached embeddings",
      explanation: "SamPredictor computes an image embedding once in set_image and reuses it across repeated prompt predictions through predict.",
      importance: "core",
      evidenceIds: ["E4", "E5"],
    },
    {
      title: "ResizeLongestSide preprocessing",
      explanation: "Images, point coordinates, and boxes are scaled consistently to the image encoder's target size before prediction.",
      importance: "core",
      evidenceIds: ["E6"],
    },
    {
      title: "ONNX deployment contract",
      explanation: "The lightweight mask decoder can be exported to ONNX and used through ONNX Runtime, including WebAssembly in the browser demonstration.",
      importance: "advanced",
      evidenceIds: ["E8", "E9", "E10"],
    },
    {
      title: "Model registry and backbone scale",
      explanation: "sam_model_registry selects the vit_h, vit_l, or vit_b model variant and pairs it with the corresponding pretrained checkpoint.",
      importance: "foundation",
      evidenceIds: ["E1", "E2"],
    },
  ],
  learningPath: [
    {
      number: "01",
      title: "Establish the project boundary",
      description: "Read installation, model variants, checkpoints, and the three public usage paths before entering the implementation.",
      files: ["README.md", "setup.py"],
      evidenceIds: ["E1", "E2", "E3"],
      minutes: 18,
      task: "Record the required environment, model choice, checkpoint, prompt type, and expected output.",
      outcome: "Define the smallest evidence-backed reproduction scope.",
    },
    {
      number: "02",
      title: "Trace SamPredictor inference",
      description: "Follow set_image and predict from the original image through cached embeddings, transformed prompts, and mask outputs.",
      files: ["segment_anything/predictor.py"],
      evidenceIds: ["E4", "E5"],
      minutes: 30,
      task: "Draw the input, state, and output contract for one repeated prompt-prediction cycle.",
      outcome: "Explain why set_image precedes predict and which prompt formats are accepted.",
    },
    {
      number: "03",
      title: "Verify preprocessing invariants",
      description: "Check how images, points, and boxes are resized and compare those transforms with the ONNX input requirements.",
      files: ["segment_anything/utils/transforms.py", "notebooks/onnx_model_example.ipynb"],
      evidenceIds: ["E6", "E8"],
      minutes: 24,
      task: "Derive one coordinate transform from an original image size to the encoder input size.",
      outcome: "State the preprocessing invariants required by native and ONNX inference.",
    },
    {
      number: "04",
      title: "Prepare an ONNX reproduction",
      description: "Connect the export script, notebook input signature, and browser demo without claiming that the commands have already run.",
      files: ["scripts/export_onnx_model.py", "notebooks/onnx_model_example.ipynb", "demo/README.md"],
      evidenceIds: ["E8", "E9", "E10"],
      minutes: 42,
      task: "Record export parameters, runtime inputs, expected artifacts, and unresolved environment conditions.",
      outcome: "Produce a reviewable ONNX execution plan.",
    },
  ],
  reproduction: {
    readiness: "partial",
    summary: "The current evidence provides five verbatim reproduction commands. This is a plan awaiting execution, not a claim that reproduction has succeeded; environment, checkpoints, hardware, and outputs still require verification.",
    evidenceIds: ["E1", "E2", "E9"],
    steps: [
      {
        title: "Install Segment Anything",
        command: "pip install git+https://github.com/facebookresearch/segment-anything.git",
        reason: "Install the repository package using the command documented in the README.",
        evidenceIds: ["E1"],
      },
      {
        title: "Install optional dependencies",
        command: "pip install opencv-python pycocotools matplotlib onnxruntime onnx",
        reason: "Prepare mask post-processing, notebooks, COCO export, and ONNX workflows; Jupyter remains an additional notebook prerequisite.",
        evidenceIds: ["E1", "E2"],
      },
      {
        title: "Generate automatic masks",
        command: "python scripts/amg.py --checkpoint <path/to/checkpoint> --model-type <model_type> --input <image_or_folder> --output <path/to/output>",
        reason: "Run the repository's automatic-mask command after replacing every explicit placeholder.",
        evidenceIds: ["E2"],
      },
      {
        title: "Export the ONNX model",
        command: "python scripts/export_onnx_model.py --checkpoint <path/to/checkpoint> --model-type <model_type> --output <path/to/output>",
        reason: "Export the lightweight mask decoder using the repository-documented entry point.",
        evidenceIds: ["E2", "E10"],
      },
      {
        title: "Install the demo package manager",
        command: "npm install --g yarn",
        reason: "Prepare the browser demo using the exact dependency command from its documentation.",
        evidenceIds: ["E9"],
      },
    ],
    warnings: [
      { text: "Inspect scripts and use an isolated environment before running an unfamiliar repository.", evidenceIds: [] },
      { text: "These steps have not been executed; hardware, runtime, outputs, and deviations must be recorded in the target environment.", evidenceIds: [] },
      { text: "Commands containing angle-bracket placeholders require explicit local values before execution.", evidenceIds: ["E2"] },
    ],
  },
  quiz: [
    {
      question: "In SamPredictor.predict, what does point label 1 represent?",
      choices: ["Background point", "Foreground point", "Upper-left box corner", "Padding point"],
      answer: 1,
      explanation: "The predictor contract assigns 1 to a foreground point and 0 to a background point; ONNX labels 2 and 3 represent box corners.",
      evidenceIds: ["E5", "E8"],
    },
    {
      question: "What training-data scale is stated in the repository README?",
      choices: ["11 million images and 1.1 billion masks", "1 million images and 110 million masks", "1.1 billion images and 11 million masks", "11 million images and 110 million masks"],
      answer: 0,
      explanation: "The README states that SAM was trained on 11 million images and 1.1 billion masks.",
      evidenceIds: ["E1"],
    },
    {
      question: "How does the ONNX example represent the absence of a box prompt?",
      choices: ["It omits point_labels", "It appends a point at (0, 0) with label -1", "It appends a point with label 0", "It sends an empty point_coords array"],
      answer: 1,
      explanation: "The notebook appends a padding point at (0.0, 0.0) with label -1 when no box is supplied.",
      evidenceIds: ["E8"],
    },
  ],
};
