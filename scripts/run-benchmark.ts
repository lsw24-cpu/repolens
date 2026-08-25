import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { scoreAnalysis } from "../lib/evaluation.ts";

type BenchmarkCase = {
  id: string;
  batch: number;
  repository: string;
  defaultBranch: string;
  revision: string;
  language: string;
  goal: "overview" | "reproduce" | "contribute";
  depth: "quick" | "standard" | "deep";
  focus?: string;
  expectedFiles: Array<{ path: string; role: string }>;
};

type Benchmark = {
  version: number;
  labeledAt: string;
  methodology: string;
  cases: BenchmarkCase[];
};

type Usage = { modelCalls: number; inputTokens: number; outputTokens: number; totalTokens: number };
type AnalysisPayload = {
  error?: string;
  engine?: { mode?: "ai" | "evidence"; label?: string; model?: string; note?: string };
  exploration?: unknown;
  usage?: Usage;
  stats?: { evidence?: number };
  keyFiles?: Array<{ id: string; path: string }>;
  concepts?: Array<{ evidenceIds?: string[] }>;
  learningPath?: Array<{ evidenceIds?: string[] }>;
  reproduction?: { steps?: Array<{ evidenceIds?: string[] }> };
  quiz?: Array<{ evidenceIds?: string[] }>;
};
type ModeSuccess = {
  mode: "standard" | "agent";
  latencyMs: number;
  engine: AnalysisPayload["engine"];
  exploration: unknown;
  usage: Usage;
  evidenceWindows: number;
  evidenceWithSource: number;
  score: ReturnType<typeof scoreAnalysis>;
};
type ModeResult = ModeSuccess | { error: string; skipped?: boolean };
type CaseResult = {
  id: string;
  repository: string;
  language: string;
  focus?: string;
  labeledRevision: string;
  expectedFiles: BenchmarkCase["expectedFiles"];
  standard: ModeResult;
  agent: ModeResult;
  agentHitDelta?: number;
  agentNewExpectedHits?: string[];
};

function isSuccess(result: ModeResult): result is ModeSuccess {
  return !("error" in result);
}

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=") || "true"];
}));
const batch = Number(args.get("batch") || 1);
const limit = Number(args.get("limit") || Number.POSITIVE_INFINITY);
const caseId = args.get("case") || "";
const requestedMode = args.get("mode") || "both";
if (!["standard", "agent", "both"].includes(requestedMode)) throw new Error("--mode must be standard, agent, or both.");
const baseUrl = (process.env.REPOLENS_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const outputPath = resolve(projectDir, args.get("output") || "evaluation/results/latest.json");
const markdownPath = outputPath.replace(/\.json$/, ".md");

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function formatRate(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

async function analyze(testCase: BenchmarkCase, agent: boolean) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.REPOLENS_SITES_TOKEN) headers["OAI-Sites-Authorization"] = `Bearer ${process.env.REPOLENS_SITES_TOKEN}`;
  const started = performance.now();
  const response = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers,
    body: JSON.stringify({ repository: testCase.repository, focus: testCase.focus || "", goal: testCase.goal, depth: testCase.depth, agent }),
    signal: AbortSignal.timeout(180000),
  });
  const latencyMs = Math.round(performance.now() - started);
  const payload = await response.json() as AnalysisPayload;
  if (!response.ok) throw new Error(String(payload.error || `HTTP ${response.status}`));
  return {
    mode: agent ? "agent" : "standard",
    latencyMs,
    engine: payload.engine,
    exploration: payload.exploration,
    usage: payload.usage || { modelCalls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    evidenceWindows: payload.keyFiles?.length || 0,
    evidenceWithSource: payload.stats?.evidence || 0,
    score: scoreAnalysis(testCase.expectedFiles, payload),
  };
}

const benchmark = JSON.parse(await readFile(resolve(projectDir, "evaluation/benchmark.json"), "utf8")) as Benchmark;
const selectedCases = benchmark.cases.filter((item) => item.batch === batch && (!caseId || item.id === caseId)).slice(0, limit);
if (!selectedCases.length) throw new Error(`No benchmark cases found for batch ${batch}.`);

async function runMode(testCase: BenchmarkCase, agent: boolean): Promise<ModeResult> {
  try {
    return await analyze(testCase, agent);
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

const results: CaseResult[] = [];
for (const testCase of selectedCases) {
  const caseResult: CaseResult = {
    id: testCase.id,
    repository: testCase.repository,
    language: testCase.language,
    focus: testCase.focus,
    labeledRevision: testCase.revision,
    expectedFiles: testCase.expectedFiles,
    standard: requestedMode === "agent" ? { error: "skipped", skipped: true } : await runMode(testCase, false),
    agent: requestedMode === "standard" ? { error: "skipped", skipped: true } : await runMode(testCase, true),
  };
  if (isSuccess(caseResult.standard) && isSuccess(caseResult.agent)) {
    caseResult.agentHitDelta = caseResult.agent.score.hitRate - caseResult.standard.score.hitRate;
    caseResult.agentNewExpectedHits = caseResult.agent.score.hitFiles.filter((item: string) => !caseResult.standard.score.hitFiles.includes(item));
  }
  results.push(caseResult);
}

const successfulModes = results.flatMap((item) => [item.standard, item.agent]).filter(isSuccess);
const standardResults = results.map((item) => item.standard).filter(isSuccess);
const agentResults = results.map((item) => item.agent).filter(isSuccess);
const sum = (items: ModeSuccess[], key: keyof Usage) => items.reduce((total, item) => total + item.usage[key], 0);
const average = <T,>(items: T[], selector: (item: T) => number) => items.length ? items.reduce((total, item) => total + selector(item), 0) / items.length : 0;
const totalCitations = successfulModes.reduce((total, item) => total + item.score.citationCount, 0);
const totalInvalidCitations = successfulModes.reduce((total, item) => total + item.score.invalidCitationCount, 0);

const report = {
  benchmarkVersion: benchmark.version,
  benchmarkLabeledAt: benchmark.labeledAt,
  runAt: new Date().toISOString(),
  target: baseUrl,
  batch,
  mode: requestedMode,
  casesAttempted: selectedCases.length,
  aggregate: {
    standardSuccesses: standardResults.length,
    agentSuccesses: agentResults.length,
    standardAiReports: standardResults.filter((item) => item.engine?.mode === "ai").length,
    agentAiReports: agentResults.filter((item) => item.engine?.mode === "ai").length,
    fallbackReports: successfulModes.filter((item) => item.engine?.mode === "evidence").length,
    standardMeanKeyFileHitRate: average(standardResults, (item) => item.score.hitRate),
    agentMeanKeyFileHitRate: average(agentResults, (item) => item.score.hitRate),
    meanAgentHitDelta: average(results.filter((item): item is CaseResult & { agentHitDelta: number } => typeof item.agentHitDelta === "number"), (item) => item.agentHitDelta),
    agentImprovedCases: results.filter((item) => (item.agentHitDelta || 0) > 0).length,
    invalidCitationIdRate: totalCitations ? totalInvalidCitations / totalCitations : 0,
    standardMedianLatencyMs: median(standardResults.map((item) => item.latencyMs)),
    agentMedianLatencyMs: median(agentResults.map((item) => item.latencyMs)),
    totalModelCalls: sum(successfulModes, "modelCalls"),
    totalInputTokens: sum(successfulModes, "inputTokens"),
    totalOutputTokens: sum(successfulModes, "outputTokens"),
    totalTokens: sum(successfulModes, "totalTokens"),
  },
  results,
  limitations: [
    "Exact-path key-file coverage measures retrieval against a labeled set; it does not prove every retrieved file is semantically necessary.",
    "Invalid citation ID rate checks server-issued identifiers only. Semantic support still requires human review.",
    "Repositories can change after their labeled revisions; reruns must record drift before comparison.",
  ],
};

const rows = results.map((item) => {
  const standard = isSuccess(item.standard) ? formatRate(item.standard.score.hitRate) : item.standard.skipped ? "Skipped" : `Failed: ${item.standard.error}`;
  const agent = isSuccess(item.agent) ? formatRate(item.agent.score.hitRate) : item.agent.skipped ? "Skipped" : `Failed: ${item.agent.error}`;
  const delta = typeof item.agentHitDelta === "number" ? `${item.agentHitDelta >= 0 ? "+" : ""}${formatRate(item.agentHitDelta)}` : "—";
  const latency = [isSuccess(item.standard) ? `${(item.standard.latencyMs / 1000).toFixed(1)}s` : "—", isSuccess(item.agent) ? `${(item.agent.latencyMs / 1000).toFixed(1)}s` : "—"].join(" / ");
  const tokens = [isSuccess(item.standard) ? item.standard.usage.totalTokens.toLocaleString() : "—", isSuccess(item.agent) ? item.agent.usage.totalTokens.toLocaleString() : "—"].join(" / ");
  return `| ${item.repository}${item.focus ? ` (${item.focus})` : ""} | ${standard} | ${agent} | ${delta} | ${latency} | ${tokens} |`;
});
const markdown = [
  "# RepoLens Benchmark",
  "",
  `- Run time: ${report.runAt}`,
  `- Target: ${baseUrl}`,
  `- Cases: ${selectedCases.length}; mode: ${requestedMode}`,
  "",
  "| Repository | Standard recall | Agent recall | Agent change | Latency standard/Agent | Tokens standard/Agent |",
  "|---|---:|---:|---:|---:|---:|",
  ...rows,
  "",
  "## Summary",
  "",
  ...(requestedMode !== "agent" ? [`- Mean standard key-file recall: ${formatRate(report.aggregate.standardMeanKeyFileHitRate)}`] : []),
  ...(requestedMode !== "standard" ? [`- Mean Agent key-file recall: ${formatRate(report.aggregate.agentMeanKeyFileHitRate)}`] : []),
  ...(requestedMode === "both" ? [
    `- Mean Agent change: ${report.aggregate.meanAgentHitDelta >= 0 ? "+" : ""}${formatRate(report.aggregate.meanAgentHitDelta)}`,
    `- Cases improved by the Agent: ${report.aggregate.agentImprovedCases}/${selectedCases.length}`,
  ] : []),
  `- Complete AI reports: ${requestedMode === "both" ? `standard ${report.aggregate.standardAiReports}/${selectedCases.length}, Agent ${report.aggregate.agentAiReports}/${selectedCases.length}` : `${requestedMode === "standard" ? "standard" : "Agent"} ${requestedMode === "standard" ? report.aggregate.standardAiReports : report.aggregate.agentAiReports}/${selectedCases.length}`}; fallback reports: ${report.aggregate.fallbackReports}`,
  `- Invalid evidence ID rate: ${formatRate(report.aggregate.invalidCitationIdRate)}`,
  `- Median latency: ${requestedMode === "both" ? `standard ${(report.aggregate.standardMedianLatencyMs / 1000).toFixed(1)}s, Agent ${(report.aggregate.agentMedianLatencyMs / 1000).toFixed(1)}s` : `${requestedMode === "standard" ? "standard" : "Agent"} ${((requestedMode === "standard" ? report.aggregate.standardMedianLatencyMs : report.aggregate.agentMedianLatencyMs) / 1000).toFixed(1)}s`}`,
  `- Total model usage: ${report.aggregate.totalModelCalls} calls, ${report.aggregate.totalTokens.toLocaleString()} tokens`,
  "",
  "## Interpretation limits",
  "",
  ...report.limitations.map((item) => `- ${item}`),
  "",
].join("\n");

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(markdownPath, markdown, "utf8");
process.stdout.write(`${markdown}\n`);
