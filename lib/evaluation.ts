type ExpectedFile = { path: string; role?: string };

type AnalysisForEvaluation = {
  keyFiles?: Array<{ id: string; path: string }>;
  summaryEvidenceIds?: string[];
  architectureEvidenceIds?: string[];
  firstContributionEvidenceIds?: string[];
  concepts?: Array<{ evidenceIds?: string[] }>;
  learningPath?: Array<{ evidenceIds?: string[] }>;
  reproduction?: {
    evidenceIds?: string[];
    steps?: Array<{ evidenceIds?: string[] }>;
    warnings?: Array<{ evidenceIds?: string[] }>;
  };
  quiz?: Array<{ evidenceIds?: string[] }>;
};

export function collectCitationIds(analysis: AnalysisForEvaluation) {
  return [
    ...(analysis.summaryEvidenceIds || []),
    ...(analysis.architectureEvidenceIds || []),
    ...(analysis.firstContributionEvidenceIds || []),
    ...(analysis.concepts || []).flatMap((item) => item.evidenceIds || []),
    ...(analysis.learningPath || []).flatMap((item) => item.evidenceIds || []),
    ...(analysis.reproduction?.evidenceIds || []),
    ...(analysis.reproduction?.steps || []).flatMap((item) => item.evidenceIds || []),
    ...(analysis.reproduction?.warnings || []).flatMap((item) => item.evidenceIds || []),
    ...(analysis.quiz || []).flatMap((item) => item.evidenceIds || []),
  ];
}

export function scoreAnalysis(expectedFiles: ExpectedFile[], analysis: AnalysisForEvaluation) {
  const retrievedPaths = new Set((analysis.keyFiles || []).map((item) => item.path));
  const allowedEvidenceIds = new Set((analysis.keyFiles || []).map((item) => item.id));
  const citations = collectCitationIds(analysis);
  const hitFiles = expectedFiles.filter((item) => retrievedPaths.has(item.path)).map((item) => item.path);
  const missedFiles = expectedFiles.filter((item) => !retrievedPaths.has(item.path)).map((item) => item.path);
  const invalidCitationIds = citations.filter((id) => !allowedEvidenceIds.has(id));
  return {
    expectedCount: expectedFiles.length,
    hitCount: hitFiles.length,
    hitRate: expectedFiles.length ? hitFiles.length / expectedFiles.length : 0,
    hitFiles,
    missedFiles,
    citationCount: citations.length,
    invalidCitationCount: invalidCitationIds.length,
    invalidCitationRate: citations.length ? invalidCitationIds.length / citations.length : 0,
    invalidCitationIds: [...new Set(invalidCitationIds)],
  };
}
