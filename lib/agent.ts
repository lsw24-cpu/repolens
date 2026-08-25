export type ExplorationCandidate = {
  path: string;
  size?: number;
};

export type ExplorationRequest = {
  path?: unknown;
  reason?: unknown;
};

export type ValidatedExplorationRequest = {
  path: string;
  reason: string;
};

export function recoverExplorationPaths(value: string, candidates: ExplorationCandidate[], limit = 3) {
  const selected: string[] = [];
  for (const candidate of candidates) {
    if (!value.includes(candidate.path)) continue;
    selected.push(candidate.path);
    if (selected.length >= limit) break;
  }
  return selected;
}

export function validateExplorationRequests(
  value: unknown,
  candidates: ExplorationCandidate[],
  alreadyRead: Set<string>,
  limit = 3,
): ValidatedExplorationRequest[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(candidates.map((item) => item.path));
  const selected: ValidatedExplorationRequest[] = [];
  const seen = new Set<string>();

  for (const raw of value as ExplorationRequest[]) {
    if (typeof raw?.path !== "string") continue;
    const path = raw.path.trim();
    if (!allowed.has(path) || alreadyRead.has(path) || seen.has(path)) continue;
    const reason = typeof raw.reason === "string"
      ? raw.reason.replace(/\s+/g, " ").trim().slice(0, 180)
      : "Add repository evidence that is missing from the current report.";
    selected.push({ path, reason: reason || "Add repository evidence that is missing from the current report." });
    seen.add(path);
    if (selected.length >= limit) break;
  }

  return selected;
}
