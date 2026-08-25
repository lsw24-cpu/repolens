import type { StudyDepth, StudyGoal } from "./types";

export function parseRepository(input: string) {
  const cleaned = input.trim().replace(/\.git$/, "").replace(/\/$/, "");
  const match = cleaned.match(/^(?:https?:\/\/github\.com\/)?([^/\s]+)\/([^/\s#?]+)$/i);
  if (!match) return null;
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(match[1])) return null;
  if (!/^[A-Za-z0-9._-]+$/.test(match[2])) return null;
  return { owner: match[1], repo: match[2] };
}

export function normalizeGoal(value: unknown): StudyGoal {
  return value === "contribute" || value === "reproduce" ? value : "overview";
}

export function normalizeDepth(value: unknown): StudyDepth {
  return value === "quick" || value === "deep" ? value : "standard";
}

export function sanitizeEvidenceIds(value: unknown, allowed: Set<string>, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const ids = [...new Set(value.filter((item): item is string => typeof item === "string" && allowed.has(item)))];
  return ids.length ? ids.slice(0, 3) : fallback;
}

export function goalLabel(goal: StudyGoal) {
  if (goal === "contribute") return "prepare a code contribution";
  if (goal === "reproduce") return "reproduce an experiment or run the project";
  return "understand the architecture";
}
