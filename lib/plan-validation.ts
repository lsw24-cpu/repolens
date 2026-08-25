import type { AnalysisPlan, EvidenceFile } from "./types";

const commandPrefix = /^(?:python(?:3)?|pip(?:3)?|pytest|sudo|torchrun|whisper|npm|pnpm|yarn|node|bash|sh|git|make|cmake|docker|conda|uv|poetry|cargo|go|java)\b/i;
const proseCommand = /(?:run|execute|enter|use(?: the)? command)\s*[`\"]?((?:python(?:3)?|pip(?:3)?|pytest|sudo|torchrun|whisper|npm|pnpm|yarn|node|bash|sh|git|make|cmake|docker|conda|uv|poetry|cargo|go|java)\b[^`\"\n.;]*)/gi;
const executableCommand = /^(?:pip(?:3)?|python(?:3)?|sudo|npm|pnpm|yarn|node|git\s+clone|torchrun|pytest|make|cmake|docker|conda|uv|poetry|cargo|go\s+run|java|whisper)\b/i;
const proseAfterExecutable = /^(?:python(?:3)?|node|java|whisper)\s+(?:is|are|was|were|can|could|will|would|uses?|provides?|supports?|requires?)\b/i;

function looksExecutable(command: string) {
  return executableCommand.test(command) && !proseAfterExecutable.test(command);
}

function commandFamily(command: string) {
  if (/^pip(?:3)?\s+install\b/i.test(command)) {
    const packages = command.split(/\s+/).slice(2).filter((token) => !token.startsWith("-") && token !== ".");
    return packages.length <= 1 || /\bgit\+|\s-e(?:\s|$)/i.test(command) ? "python-project-install" : "python-dependencies";
  }
  if (/^(?:sudo\s+)?(?:apt|apt-get|pacman|dnf|yum)\b|^brew\s+install\b/i.test(command)) return "system-dependencies";
  return `command:${command}`;
}

function dedupeCommandSteps<T extends { command: string }>(steps: T[]) {
  const families = new Set<string>();
  return steps.filter((step) => {
    const family = commandFamily(step.command);
    if (families.has(family)) return false;
    families.add(family);
    return true;
  }).sort((left, right) => {
    const priority = (command: string) => {
      const family = commandFamily(command);
      if (family === "python-project-install") return 0;
      if (family === "python-dependencies") return 1;
      if (family === "system-dependencies") return 2;
      return 3;
    };
    return priority(left.command) - priority(right.command);
  });
}

function validIds(value: unknown, allowed: Set<string>) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && allowed.has(item)))].slice(0, 3);
}

function evidenceSource(ids: string[], evidenceById: Map<string, EvidenceFile>) {
  return ids.map((id) => evidenceById.get(id)?.excerpt || "").join("\n");
}

function groundNamedCitations(text: string, initialIds: string[], evidence: EvidenceFile[]) {
  const ids = [...initialIds];
  const ignored = new Set(["README", "Python", "GPU", "CPU", "API"]);
  const codeIdentifiers = [...text.matchAll(/`([^`\n]+)`/g)]
    .flatMap((match) => match[1].match(/[A-Za-z_][A-Za-z0-9_.-]*/g) || []);
  const paths = [...text.matchAll(/\b[A-Za-z0-9_./-]+\.(?:py|ipynb|js|jsx|ts|tsx|md|toml|ya?ml)\b/g)].map((match) => match[0]);
  const namedTypes = [...text.matchAll(/\b(?:[A-Z][a-z]+){2,}[A-Za-z0-9_]*\b|\b[A-Z]{2,}[A-Za-z0-9_-]*\b/g)].map((match) => match[0]);
  const structuralTerms = [...text.matchAll(/\b(?:transformer|encoder|decoder|backbone)\b/gi)].map((match) => match[0]);
  const tokens = [...new Set([...codeIdentifiers, ...paths, ...namedTypes, ...structuralTerms])]
    .filter((token) => token.length >= 3 && !ignored.has(token));
  const containsToken = (item: EvidenceFile, token: string) => {
    const haystack = `${item.path}\n${item.excerpt}`.toLowerCase();
    const normalized = token.toLowerCase();
    if (haystack.includes(normalized)) return true;
    const compactToken = normalized.replace(/[^a-z0-9]/g, "");
    return compactToken.length >= 5 && haystack.replace(/[^a-z0-9]/g, "").includes(compactToken);
  };
  for (const token of tokens) {
    const normalized = token.toLowerCase();
    if (ids.some((id) => {
      const item = evidence.find((candidate) => candidate.id === id);
      return item ? containsToken(item, normalized) : false;
    })) continue;
    const match = evidence.find((item) => item.path.toLowerCase().includes(normalized))
      || evidence.find((item) => containsToken(item, normalized));
    if (!match) return null;
    if (!ids.includes(match.id)) ids.push(match.id);
  }
  return ids;
}

function extractVerbatimCommands(evidenceIds: string[], evidenceById: Map<string, EvidenceFile>) {
  const commands: Array<{ command: string; evidenceId: string }> = [];
  for (const id of evidenceIds) {
    const item = evidenceById.get(id);
    if (!item) continue;
    for (const line of item.excerpt.split("\n")) {
      const command = line.trim().replace(/^[$>]\s*/, "");
      if (!looksExecutable(command) || command.length > 500) continue;
      if (!commands.some((candidate) => candidate.command === command)) commands.push({ command, evidenceId: id });
    }
  }
  const hasDirectInstall = commands.some((item) => /^pip(?:3)?\s+install\s+git\+/i.test(item.command));
  return commands
    .filter((item) => !(hasDirectInstall && /^git\s+clone\b/i.test(item.command)))
    .map((item) => ({
      title: /^(?:pip|sudo|npm|pnpm|yarn|conda|uv|poetry)/i.test(item.command) ? "Install repository dependencies" : "Run a repository-provided command",
      command: item.command,
      reason: `This command appears verbatim in ${evidenceById.get(item.evidenceId)?.path || "repository evidence"}; review its arguments, permissions, and placeholders before running it.`,
      evidenceIds: [item.evidenceId],
    }));
}

export function validateEvidenceCommand(command: string, evidenceIds: string[], evidenceById: Map<string, EvidenceFile>) {
  const normalized = String(command || "").trim().replace(/^[$>]\s*/, "");
  if (!normalized || !looksExecutable(normalized) || normalized.startsWith("#") || normalized.includes("\n") || normalized.includes("\r")) return "";
  return evidenceSource(evidenceIds, evidenceById).includes(normalized) ? normalized : "";
}

export function sanitizeGroundedTask(task: string, evidenceIds: string[], evidenceById: Map<string, EvidenceFile>) {
  const text = String(task || "").trim();
  const source = evidenceSource(evidenceIds, evidenceById);
  const candidates = [...text.matchAll(/`([^`\n]+)`/g)]
    .map((match) => match[1].trim().replace(/^[$>]\s*/, ""))
    .filter((candidate) => commandPrefix.test(candidate));
  for (const match of text.matchAll(proseCommand)) candidates.push(match[1].trim().replace(/^[$>]\s*/, ""));
  const standalone = text.split("\n")
    .map((line) => line.trim().replace(/^[$>]\s*/, ""))
    .filter((line) => commandPrefix.test(line));
  candidates.push(...standalone);
  if (candidates.some((candidate) => !source.includes(candidate))) {
    return "Review the cited evidence and complete this stage; commands that could not be verified verbatim are not displayed.";
  }
  return text;
}

export function validatePlan(plan: AnalysisPlan, fallback: AnalysisPlan, evidence: EvidenceFile[]): AnalysisPlan {
  const allowed = new Set(evidence.map((item) => item.id));
  const evidenceById = new Map(evidence.map((item) => [item.id, item]));
  let degraded = false;

  const requiredIds = (value: unknown, fallbackIds: string[]) => {
    const ids = validIds(value, allowed);
    if (ids.length) return { ids, usedFallback: false };
    degraded = true;
    return { ids: validIds(fallbackIds, allowed), usedFallback: true };
  };

  const summaryCitation = requiredIds(plan.summaryEvidenceIds, fallback.summaryEvidenceIds);
  const architectureCitation = requiredIds(plan.architectureEvidenceIds, fallback.architectureEvidenceIds);
  const groundedSummaryIds = groundNamedCitations(plan.summary, summaryCitation.ids, evidence);
  if (!groundedSummaryIds) degraded = true;
  const summaryEvidenceIds = groundedSummaryIds || validIds(fallback.summaryEvidenceIds, allowed);
  const groundedArchitectureIds = groundNamedCitations(plan.architecture, architectureCitation.ids, evidence);
  if (!groundedArchitectureIds) degraded = true;
  const architectureEvidenceIds = groundedArchitectureIds || validIds(fallback.architectureEvidenceIds, allowed);
  const firstContributionEvidenceIds = validIds(fallback.firstContributionEvidenceIds, allowed);

  const concepts = plan.concepts.slice(0, 5).map((item, index) => {
    const ids = validIds(item.evidenceIds, allowed);
    if (ids.length) return { ...item, evidenceIds: ids };
    degraded = true;
    return fallback.concepts[index] ?? fallback.concepts[0]!;
  });

  const learningPath = plan.learningPath.slice(0, 5).map((item, index) => {
    const ids = validIds(item.evidenceIds, allowed);
    if (!ids.length) {
      degraded = true;
      return fallback.learningPath[index] ?? fallback.learningPath[0]!;
    }
    return { ...item, evidenceIds: ids, task: sanitizeGroundedTask(item.task, ids, evidenceById) };
  });

  const reproductionCitation = requiredIds(plan.reproduction.evidenceIds, fallback.reproduction.evidenceIds);
  let reproductionEvidenceIds = reproductionCitation.ids;
  let reproductionSteps = plan.reproduction.steps.slice(0, 5).map((item, index) => {
    const ids = validIds(item.evidenceIds, allowed);
    if (!ids.length) {
      degraded = true;
      return fallback.reproduction.steps[index] ?? fallback.reproduction.steps[0]!;
    }
    const command = validateEvidenceCommand(item.command, ids, evidenceById);
    if (item.command.trim() && !command) degraded = true;
    return { ...item, evidenceIds: ids, command };
  });
  const commandEvidenceIds = [...new Set([...reproductionEvidenceIds, ...evidence.map((item) => item.id)])];
  const recoveredSteps = extractVerbatimCommands(commandEvidenceIds, evidenceById);
  const recoveredHasDirectInstall = recoveredSteps.some((item) => /^pip(?:3)?\s+install\s+git\+/i.test(item.command));
  const verifiedSteps = reproductionSteps
    .filter((item) => item.command)
    .filter((item) => !(recoveredHasDirectInstall && /^git\s+clone\b/i.test(item.command)));
  const targetStepCount = Math.min(5, Math.max(reproductionSteps.length, verifiedSteps.length, recoveredSteps.length));
  if (verifiedSteps.length < targetStepCount && recoveredSteps.length) {
    reproductionSteps = dedupeCommandSteps([
      ...verifiedSteps,
      ...recoveredSteps,
    ]).slice(0, targetStepCount);
    reproductionEvidenceIds = [...new Set([
      ...reproductionEvidenceIds,
      ...reproductionSteps.flatMap((item) => item.evidenceIds),
    ])];
  }

  const warnings = fallback.reproduction.warnings.slice(0, 2);

  const quiz = plan.quiz.slice(0, 4).map((item, index) => {
    const ids = validIds(item.evidenceIds, allowed);
    if (ids.length) {
      return { ...item, evidenceIds: ids };
    }
    degraded = true;
    return fallback.quiz[index] ?? fallback.quiz[0]!;
  });

  const citedPaths = new Set([
    ...summaryEvidenceIds,
    ...architectureEvidenceIds,
    ...firstContributionEvidenceIds,
    ...reproductionEvidenceIds,
    ...concepts.flatMap((item) => item.evidenceIds),
    ...learningPath.flatMap((item) => item.evidenceIds),
    ...reproductionSteps.flatMap((item) => item.evidenceIds),
    ...quiz.flatMap((item) => item.evidenceIds),
  ].map((id) => evidenceById.get(id)?.path).filter(Boolean));
  const confidence = degraded || citedPaths.size < 4 || plan.confidence === "exploratory" ? "exploratory" : "medium";
  const commandCount = reproductionSteps.filter((item) => item.command).length;

  return {
    ...plan,
    summary: summaryCitation.usedFallback || !groundedSummaryIds ? fallback.summary : plan.summary,
    summaryEvidenceIds,
    architecture: architectureCitation.usedFallback || !groundedArchitectureIds ? fallback.architecture : plan.architecture,
    architectureEvidenceIds,
    firstContribution: fallback.firstContribution,
    firstContributionEvidenceIds,
    confidence,
    concepts,
    learningPath,
    reproduction: {
      ...plan.reproduction,
      readiness: commandCount > 0 ? "partial" : "unknown",
      summary: `The current evidence contains ${commandCount} reproduction command${commandCount === 1 ? "" : "s"} that can be verified verbatim. This is a plan to execute, not a claim that reproduction is complete. Verify the environment, data, model weights, and hardware requirements before running it.`,
      evidenceIds: reproductionEvidenceIds,
      steps: reproductionSteps,
      warnings,
    },
    quiz,
  };
}
