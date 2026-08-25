export type RepositoryTreeItem = { path: string; type: "blob" | "tree"; size?: number };

export type RetrievalGoal = "overview" | "contribute" | "reproduce";

export type FileRole = {
  role: string;
  reason: string;
};

const MAX_SOURCE_BYTES = 750_000;

const textExtensions = new Set([
  "py", "ipynb", "md", "rst", "txt", "toml", "yaml", "yml", "json", "sh",
  "ts", "tsx", "js", "jsx", "java", "go", "rs", "c", "h", "cpp", "cc", "cxx", "hpp",
  "cs", "rb", "php", "swift", "kt", "vue", "svelte", "sql",
]);

const configNames = /^(?:pyproject\.toml|setup\.py|setup\.cfg|requirements(?:[-_.].+)?\.txt|environment(?:[-_.].+)?\.ya?ml|conda\.ya?ml|pipfile|poetry\.lock|uv\.lock|package\.json|cargo\.toml|go\.mod|cmakelists\.txt|makefile|dockerfile)$/i;
const executionName = /(?:^|[-_.])(main|train|finetune|fine_tune|evaluate|evaluation|eval|infer|inference|predict|prediction|predictor|transcribe|decode|decoding|generate|build|builder|factory|serve|run|cli|pipeline)(?:[-_.]|$)/i;
const modelName = /(?:^|[-_.])(model|models|modeling|network|networks|module|modules|architecture|architectures)(?:[-_.]|$)/i;
const dataName = /(?:^|[-_.])(data|dataset|datasets|dataloader|loader|preprocess|prepare|tokenizer|audio|transforms)(?:[-_.]|$)/i;

function basename(path: string) {
  return path.split("/").pop() || path;
}

function segments(path: string) {
  return path.toLowerCase().split("/");
}

function isInDirectory(path: string, names: Set<string>) {
  return segments(path).slice(0, -1).some((part) => names.has(part));
}

export function normalizeNotebookSource(path: string, source: string) {
  if (!path.toLowerCase().endsWith(".ipynb")) return { source };
  try {
    const notebook = JSON.parse(source) as { cells?: Array<{ cell_type?: string; source?: string | string[] }> };
    const cells = (notebook.cells || []).slice(0, 80).flatMap((cell, index) => {
      const content = Array.isArray(cell.source) ? cell.source.join("") : String(cell.source || "");
      if (!content.trim()) return [];
      return [`# %% [${cell.cell_type || "cell"} ${index + 1}]`, content.trimEnd(), ""];
    });
    return {
      source: cells.join("\n").slice(0, 240_000),
      locationLabel: "Notebook cells · normalized excerpt",
    };
  } catch {
    return { source: "", locationLabel: "Notebook · unavailable" };
  }
}

export function isAnalyzableFile(item: RepositoryTreeItem) {
  if (item.type !== "blob" || (item.size || 0) > MAX_SOURCE_BYTES) return false;
  const name = basename(item.path).toLowerCase();
  if (configNames.test(name)) return true;
  const extension = name.includes(".") ? name.split(".").pop() || "" : "";
  return textExtensions.has(extension);
}

export function describeFile(path: string): FileRole {
  const lower = path.toLowerCase();
  const name = basename(lower);
  const directories = segments(lower).slice(0, -1);

  if (/^readme(?:\.|$)/.test(name)) {
    return { role: "Project entry", reason: "Defines the research objective, installation path, data or model entry points, and primary use cases." };
  }
  if (/\.(?:md|rst)$/.test(name)) {
    return { role: "Project documentation", reason: "Adds paper context, model documentation, or focused usage information without replacing implementation evidence." };
  }
  if (configNames.test(name) || directories.some((part) => ["config", "configs", "conf"].includes(part))) {
    return { role: "Configuration", reason: "Exposes dependencies, experiment parameters, runtime environment, and reproduction constraints." };
  }
  if (isInDirectory(lower, new Set(["tests", "test", "benchmarks", "benchmark", "examples", "example", "scripts"])) || /(?:^|[-_.])(test|tests|benchmark|example|demo)(?:[-_.]|$)/.test(name)) {
    return { role: "Behavior evidence", reason: "Tests, examples, or evaluation scripts express expected behavior through concrete inputs, assertions, and outputs." };
  }
  if (name.endsWith(".ipynb") || isInDirectory(lower, new Set(["notebooks", "notebook"]))) {
    return { role: "Experiment notebook", reason: "Records interactive experiments, visualizations, and reviewable research steps." };
  }
  if (modelName.test(name) || directories.some((part) => ["model", "models", "modeling", "networks"].includes(part))) {
    return { role: "Model structure", reason: "Defines model architecture, key objects, tensor transformations, or module boundaries." };
  }
  if (dataName.test(name) || directories.some((part) => ["data", "dataset", "datasets", "preprocessing"].includes(part))) {
    return { role: "Data pipeline", reason: "Defines data acquisition, cleaning, encoding, batching, or input-output contracts." };
  }
  if (executionName.test(name) || directories.some((part) => ["cli", "pipelines", "trainer", "training"].includes(part))) {
    return { role: "Execution path", reason: "Connects configuration, data, models, training or inference, and final artifacts." };
  }
  return { role: "Core module", reason: "Lives in a primary source area and helps establish implementation-level understanding." };
}

function scoreFile(item: RepositoryTreeItem, repository: string, goal: RetrievalGoal, readmeReferences: Set<string>, focus: string) {
  const path = item.path.toLowerCase();
  const name = basename(path);
  const role = describeFile(path).role;
  const depth = path.split("/").length;
  let score = 0;

  if (readmeReferences.has(item.path)) score += 82;
  const normalizedFocus = focus.toLowerCase().trim().replace(/^\/+|\/+$/g, "");
  if (normalizedFocus) {
    const focusTokens = normalizedFocus.split(/[^a-z0-9_]+/).filter((token) => token.length >= 2);
    if (path === normalizedFocus || path.startsWith(`${normalizedFocus}/`)) score += 170;
    else if (segments(path).includes(normalizedFocus)) score += 145;
    else if (focusTokens.length && focusTokens.every((token) => path.includes(token))) score += 105;
    else if (focusTokens.some((token) => path.includes(token))) score += 30;
  }

  if (path === "readme.md" || path === "readme.rst") score += 100;
  else if (/^readme(?:\.|$)/.test(name)) score += 52;

  if (role === "Configuration") score += goal === "reproduce" ? 58 : 44;
  if (role === "Execution path") score += goal === "reproduce" ? 64 : 56;
  if (role === "Model structure") score += 54;
  if (role === "Data pipeline") score += goal === "reproduce" ? 54 : 42;
  if (role === "Behavior evidence") score += goal === "contribute" ? 58 : 44;
  if (role === "Experiment notebook") score += goal === "reproduce" ? 48 : 36;
  if (role === "Project documentation") score += 22;
  if (role === "Core module") score += 18;

  if (!path.includes("/") && role === "Configuration") score += goal === "reproduce" ? 52 : 34;

  if (/^(src|app|lib|packages|[a-z0-9_-]+)\//.test(path)) score += 4;
  if (executionName.test(name)) score += 24;
  if (modelName.test(name)) score += 20;
  if (dataName.test(name)) score += 18;
  if (/^(?:setup\.py|pyproject\.toml|requirements.*\.txt|environment.*\.ya?ml)$/.test(name)) score += 16;
  if (/(?:^|\/)(?:config|configs)\//.test(path)) score += 12;
  if (goal === "reproduce" && /(?:^|[/_.-])(tiny|small|mini|minimal|toy|demo|example|sample|quick|char)(?:[/_.-]|$)/.test(path)) score += 28;

  const repoStem = repository.toLowerCase().replace(/\.(?:git|cpp|py|js)$/, "").replace(/[^a-z0-9]+/g, "_");
  const fileStem = name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9]+/g, "_");
  if (repoStem.length >= 3 && fileStem === repoStem) score += 18;

  const size = item.size || 0;
  if (size >= 250 && size <= 240_000) score += 7;
  if (size > 500_000) score -= 8;
  score -= Math.max(0, depth - 1) * 2;
  return score;
}

const goalRoleOrder: Record<RetrievalGoal, string[]> = {
  reproduce: ["Project entry", "Configuration", "Execution path", "Data pipeline", "Model structure", "Behavior evidence"],
  overview: ["Project entry", "Execution path", "Model structure", "Data pipeline", "Configuration", "Behavior evidence"],
  contribute: ["Project entry", "Behavior evidence", "Core module", "Execution path", "Model structure", "Configuration"],
};

function rankFiles(files: RepositoryTreeItem[], repository: string, goal: RetrievalGoal, readmeReferences = new Set<string>(), focus = "") {
  return files
    .filter(isAnalyzableFile)
    .map((file) => ({ file, role: describeFile(file.path).role, score: scoreFile(file, repository, goal, readmeReferences, focus) }))
    .sort((left, right) => right.score - left.score || left.file.path.localeCompare(right.file.path));
}

function directFocusMatch(path: string, focus: string) {
  const normalized = focus.toLowerCase().trim().replace(/^\/+|\/+$/g, "");
  const lower = path.toLowerCase();
  return Boolean(normalized) && (lower === normalized || lower.startsWith(`${normalized}/`) || segments(lower).includes(normalized));
}

function topicFocusMatch(path: string, focus: string) {
  const tokens = focus.toLowerCase().split(/[^a-z0-9_]+/).filter((token) => token.length >= 2);
  return tokens.length > 0 && tokens.every((token) => path.toLowerCase().includes(token));
}

function focusedEntries<T extends { file: RepositoryTreeItem }>(ranked: T[], focus: string) {
  const normalized = focus.toLowerCase().trim().replace(/^\/+|\/+$/g, "");
  const prefix = ranked.filter((entry) => {
    const lower = entry.file.path.toLowerCase();
    return lower === normalized || lower.startsWith(`${normalized}/`);
  });
  if (prefix.length) return prefix;
  const direct = ranked.filter((entry) => directFocusMatch(entry.file.path, focus));
  return direct.length ? direct : ranked.filter((entry) => topicFocusMatch(entry.file.path, focus));
}

export function extractReadmeReferences(readme: string, files: RepositoryTreeItem[]) {
  const lower = readme.toLowerCase().replace(/\\/g, "/");
  const analyzable = files.filter(isAnalyzableFile);
  const basenameCounts = new Map<string, number>();
  for (const file of analyzable) {
    const name = basename(file.path).toLowerCase();
    basenameCounts.set(name, (basenameCounts.get(name) || 0) + 1);
  }

  const references = new Set<string>();
  for (const file of analyzable) {
    const path = file.path.toLowerCase();
    const name = basename(path);
    const stem = name.replace(/\.[^.]+$/, "");
    if (lower.includes(path)) {
      references.add(file.path);
      continue;
    }
    if ((basenameCounts.get(name) || 0) === 1 && name.length >= 6 && lower.includes(name)) {
      references.add(file.path);
      continue;
    }
    if ((basenameCounts.get(name) || 0) === 1 && stem.length >= 7 && lower.includes(stem)) references.add(file.path);
  }
  return references;
}

export function selectKeyFiles(
  files: RepositoryTreeItem[],
  repository: string,
  goal: RetrievalGoal,
  limit = 7,
  readmeReferences = new Set<string>(),
  focus = "",
) {
  const ranked = rankFiles(files, repository, goal, readmeReferences, focus);
  const selected: RepositoryTreeItem[] = [];

  if (focus.trim()) {
    const rootEntry = ranked.find((entry) => /^(?:readme\.md|readme\.rst)$/i.test(entry.file.path));
    if (rootEntry) selected.push(rootEntry.file);
    const focused = focusedEntries(ranked, focus);
    for (const role of goalRoleOrder[goal]) {
      const match = focused.find((entry) => entry.role === role && !selected.some((item) => item.path === entry.file.path));
      if (match) selected.push(match.file);
      if (selected.length === limit) return selected;
    }
    for (const entry of focused) {
      if (!selected.some((item) => item.path === entry.file.path)) selected.push(entry.file);
      if (selected.length === limit) return selected;
    }
    if (focused.length) {
      if (!selected.some((item) => describeFile(item.path).role === "Configuration")) {
        const rootConfig = ranked.find((entry) => !entry.file.path.includes("/") && entry.role === "Configuration");
        if (rootConfig && selected.length < limit) selected.push(rootConfig.file);
      }
      return selected;
    }
  }

  for (const role of goalRoleOrder[goal]) {
    const match = ranked.find((entry) => entry.role === role && !selected.some((item) => item.path === entry.file.path));
    if (match) selected.push(match.file);
    if (selected.length === limit) return selected;
  }

  for (const entry of ranked) {
    if (!selected.some((item) => item.path === entry.file.path)) selected.push(entry.file);
    if (selected.length === limit) break;
  }
  return selected;
}

export function selectExplorationCandidates(
  files: RepositoryTreeItem[],
  alreadyRead: Set<string>,
  repository: string,
  goal: RetrievalGoal,
  limit = 90,
  focus = "",
) {
  const ranked = rankFiles(files.filter((file) => !alreadyRead.has(file.path)), repository, goal, new Set<string>(), focus);
  const focused = focus.trim() ? focusedEntries(ranked, focus) : [];
  const candidates = focused.length ? focused : ranked;
  return candidates
    .slice(0, limit)
    .map(({ file }) => file);
}

export function suggestResearchScopes(files: RepositoryTreeItem[], limit = 12) {
  const excluded = new Set([
    "src", "app", "lib", "tests", "test", "docs", "doc", "examples", "example", "scripts", "script",
    "config", "configs", "assets", "tools", "tool", "packages", "package", "include", "common", ".github",
  ]);
  const counts = new Map<string, number>();
  for (const file of files.filter(isAnalyzableFile)) {
    const parts = file.path.split("/");
    if (parts.length < 2 || excluded.has(parts[0].toLowerCase()) || parts[0].startsWith(".")) continue;
    counts.set(parts[0], (counts.get(parts[0]) || 0) + 1);
  }
  const candidates = [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  if (candidates.length < 4) return [];
  return candidates.slice(0, limit).map(([path]) => path);
}
