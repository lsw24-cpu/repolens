export type SourceDocument = {
  path: string;
  role: string;
  reason: string;
  source: string;
  urlBase: string;
  locationLabel?: string;
};

export type SourceEvidenceWindow = {
  path: string;
  role: string;
  reason: string;
  lineStart: number;
  lineEnd: number;
  excerpt: string;
  promptSource: string;
  url: string;
  locationLabel?: string;
};

type Definition = {
  documentIndex: number;
  lineIndex: number;
  name: string;
  kind: string;
  references: Array<{ documentIndex: number; lineIndex: number }>;
};

type Anchor = { lineIndex: number; score: number; note: string };

const definitionPatterns: Array<{ pattern: RegExp; kind: string }> = [
  { pattern: /^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/, kind: "function" },
  { pattern: /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/, kind: "function" },
  { pattern: /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/, kind: "function" },
  { pattern: /^\s*func\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)\s*\(/, kind: "function" },
  { pattern: /^\s*(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?fn\s+([A-Za-z_]\w*)\s*\(/, kind: "function" },
  { pattern: /^\s*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/, kind: "class" },
  { pattern: /^\s*class\s+([A-Za-z_]\w*)/, kind: "class" },
  { pattern: /^\s*(?:export\s+)?(?:type|interface|struct)\s+([A-Za-z_$][\w$]*)/, kind: "data structure" },
];

const entryPattern = /\b(main|run|start|serve|train|evaluate|predict|forward|analy[sz]e|createApp|createServer)\b/i;
const testPattern = /\b(test|it|describe|expect|assert|pytest|unittest|benchmark)\b/i;
const ambiguousCallNames = new Set([
  "__init__", "forward", "backward", "encode", "decode", "predict", "run", "main",
  "load", "save", "read", "write", "get", "set", "build", "create", "update", "process",
]);

function findDefinition(line: string) {
  for (const candidate of definitionPatterns) {
    const match = line.match(candidate.pattern);
    if (match?.[1]) return { name: match[1], kind: candidate.kind };
  }
  return null;
}

function isDocumentFirstEvidence(document: SourceDocument) {
  const lower = document.path.toLowerCase();
  return document.role === "Project entry" || document.role === "Configuration" || /\.(md|rst|toml|ya?ml|json)$/.test(lower);
}

function createWindow(document: SourceDocument, lines: string[], anchor: Anchor): SourceEvidenceWindow {
  if (!document.source) {
    return {
      path: document.path,
      role: document.role,
      reason: `${document.reason} The source is temporarily unavailable, so only path metadata is retained.`,
      lineStart: 1,
      lineEnd: 1,
      excerpt: "",
      promptSource: "",
      url: document.urlBase,
      locationLabel: document.locationLabel,
    };
  }
  const start = Math.max(0, anchor.lineIndex - 14);
  const forwardLines = isDocumentFirstEvidence(document) ? 65 : 35;
  const end = Math.min(lines.length, anchor.lineIndex + forwardLines);
  const selected = lines.slice(start, end);
  const lineStart = start + 1;
  const lineEnd = Math.max(lineStart, end);
  return {
    path: document.path,
    role: document.role,
    reason: `${document.reason} ${anchor.note}`.trim(),
    lineStart,
    lineEnd,
    excerpt: selected.join("\n").slice(0, 9000),
    promptSource: selected.map((line, index) => `${lineStart + index}: ${line}`).join("\n").slice(0, 12000),
    url: document.locationLabel ? document.urlBase : `${document.urlBase}#L${lineStart}-L${lineEnd}`,
    locationLabel: document.locationLabel,
  };
}

export function buildEvidenceWindows(documents: SourceDocument[], maxWindows = 10): SourceEvidenceWindow[] {
  const linesByDocument = documents.map((document) => document.source.replace(/\u0000/g, "").split("\n"));
  const definitions: Definition[] = [];
  const definitionsByName = new Map<string, Definition[]>();

  linesByDocument.forEach((lines, documentIndex) => {
    lines.forEach((line, lineIndex) => {
      const found = findDefinition(line);
      if (!found || found.name.length < 3) return;
      const definition: Definition = { documentIndex, lineIndex, ...found, references: [] };
      definitions.push(definition);
      definitionsByName.set(found.name, [...(definitionsByName.get(found.name) || []), definition]);
    });
  });

  const callAnchors = new Map<number, Anchor[]>();
  linesByDocument.forEach((lines, documentIndex) => {
    lines.forEach((line, lineIndex) => {
      const names = [...line.matchAll(/(?<!\.)\b([A-Za-z_$][\w$]{2,})\s*\(/g)].map((match) => match[1]);
      for (const name of new Set(names)) {
        if (ambiguousCallNames.has(name)) continue;
        const candidates = definitionsByName.get(name) || [];
        if (candidates.length !== 1) continue;
        const target = candidates[0];
        if (target.documentIndex === documentIndex || findDefinition(line)?.name === name) continue;
        target.references.push({ documentIndex, lineIndex });
        const anchors = callAnchors.get(documentIndex) || [];
        anchors.push({
          lineIndex,
          score: 96,
          note: `This call to ${name} resolves to its definition at ${documents[target.documentIndex].path}:${target.lineIndex + 1}, creating cross-file call evidence.`,
        });
        callAnchors.set(documentIndex, anchors);
      }
    });
  });

  const anchorsByDocument = documents.map((document, documentIndex) => {
    const anchors: Anchor[] = [...(callAnchors.get(documentIndex) || [])];
    if (isDocumentFirstEvidence(document)) {
      anchors.push({ lineIndex: 0, score: 100, note: "Retain the file entry, configuration, or usage instructions as project-boundary evidence." });
    }
    for (const definition of definitions.filter((item) => item.documentIndex === documentIndex)) {
      const reference = definition.references[0];
      const referenceNote = reference
        ? `, with a call found at ${documents[reference.documentIndex].path}:${reference.lineIndex + 1}`
        : "";
      anchors.push({
        lineIndex: definition.lineIndex,
        score: 68 + Math.min(definition.references.length * 12, 28) + (entryPattern.test(definition.name) ? 18 : 0),
        note: `Locate the definition of ${definition.kind} ${definition.name}${referenceNote}.`,
      });
    }
    linesByDocument[documentIndex].forEach((line, lineIndex) => {
      if (entryPattern.test(line)) anchors.push({ lineIndex, score: 74, note: "Locate a primary entry point or key execution stage." });
      if (document.role === "Behavior evidence" && testPattern.test(line)) anchors.push({ lineIndex, score: 82, note: "Locate tests, assertions, or evaluation behavior." });
    });
    if (!anchors.length) anchors.push({ lineIndex: 0, score: 20, note: "No stable symbol was found; retain the file opening as exploratory evidence." });
    return anchors.sort((a, b) => b.score - a.score || a.lineIndex - b.lineIndex);
  });

  const selectedByDocument = anchorsByDocument.map((anchors) => {
    const selected: Anchor[] = [];
    for (const anchor of anchors) {
      if (selected.some((item) => Math.abs(item.lineIndex - anchor.lineIndex) < 36)) continue;
      selected.push(anchor);
      if (selected.length === 2) break;
    }
    return selected;
  });

  const primary = selectedByDocument.flatMap((anchors, documentIndex) => anchors[0]
    ? [{ documentIndex, anchor: anchors[0] }]
    : []);
  const secondary = selectedByDocument.flatMap((anchors, documentIndex) => anchors[1]
    ? [{ documentIndex, anchor: anchors[1] }]
    : []);

  return [...primary, ...secondary]
    .slice(0, Math.max(1, maxWindows))
    .sort((a, b) => a.documentIndex - b.documentIndex || a.anchor.lineIndex - b.anchor.lineIndex)
    .map(({ documentIndex, anchor }) => createWindow(documents[documentIndex], linesByDocument[documentIndex], anchor));
}
