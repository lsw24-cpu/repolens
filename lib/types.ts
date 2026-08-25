export type StudyGoal = "overview" | "contribute" | "reproduce";
export type StudyDepth = "quick" | "standard" | "deep";

export type ExplorationMode = "standard" | "agent";

export type ModelUsage = {
  modelCalls: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type EvidenceFile = {
  id: string;
  path: string;
  role: string;
  reason: string;
  lineStart: number;
  lineEnd: number;
  excerpt: string;
  url: string;
  locationLabel?: string;
};

export type LearningStep = {
  number: string;
  title: string;
  description: string;
  files: string[];
  evidenceIds: string[];
  minutes: number;
  task: string;
  outcome: string;
};

export type QuizItem = {
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
  evidenceIds: string[];
};

export type RepoAnalysis = {
  repo: {
    fullName: string;
    description: string;
    stars: number;
    language: string;
    license: string;
    branch: string;
    revision: string;
    url: string;
  };
  engine: {
    mode: "ai" | "evidence";
    label: string;
    model?: string;
    note: string;
  };
  exploration: {
    mode: ExplorationMode;
    rounds: number;
    addedFiles: string[];
    notes: string[];
  };
  usage: ModelUsage;
  scope: {
    focus: string;
    multiProject: boolean;
    suggestions: string[];
  };
  goal: StudyGoal;
  depth: StudyDepth;
  summary: string;
  summaryEvidenceIds: string[];
  architecture: string;
  architectureEvidenceIds: string[];
  firstContribution: string;
  firstContributionEvidenceIds: string[];
  confidence: "high" | "medium" | "exploratory";
  stats: { files: number; folders: number; minutes: number; evidence: number };
  technologies: string[];
  keyFiles: EvidenceFile[];
  concepts: Array<{
    title: string;
    explanation: string;
    importance: "foundation" | "core" | "advanced";
    evidenceIds: string[];
  }>;
  learningPath: LearningStep[];
  reproduction: {
    readiness: "ready" | "partial" | "unknown";
    summary: string;
    evidenceIds: string[];
    steps: Array<{
      title: string;
      command: string;
      reason: string;
      evidenceIds: string[];
    }>;
    warnings: Array<{
      text: string;
      evidenceIds: string[];
    }>;
  };
  quiz: QuizItem[];
  tree: Array<{ path: string; type: "blob" | "tree"; size?: number }>;
  readmeExcerpt: string;
};

export type AnalysisPlan = Pick<
  RepoAnalysis,
  | "summary"
  | "summaryEvidenceIds"
  | "architecture"
  | "architectureEvidenceIds"
  | "firstContribution"
  | "firstContributionEvidenceIds"
  | "confidence"
  | "concepts"
  | "reproduction"
> & {
  learningPath: Array<Omit<LearningStep, "number" | "files">>;
  quiz: QuizItem[];
};
