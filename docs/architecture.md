# RepoLens Architecture

## Processing pipeline

1. The user enters a public GitHub repository, a research goal, and an analysis depth. Multi-project repositories can also specify a directory or topic as the research scope.
2. The server accepts only a valid `owner/repository`, then reads metadata, the file tree, README, and a bounded set of text source files through official GitHub endpoints.
3. Deterministic retrieval filters dependencies and build artifacts, follows real paths cited in README, and balances environment configuration, data pipelines, models, execution paths, and validation evidence. Multi-project repositories are first constrained to the selected scope.
4. The evidence layer identifies functions, classes, and data structures, matches genuine calls across retrieved files, and extracts bounded windows from complete files. Notebook cells are normalized before evidence extraction; raw notebook JSON is never presented as source.
5. Every window receives an E-series identifier and retains its file path, immutable source link, and excerpt. Plain text preserves exact line ranges; notebooks are labeled as normalized cell excerpts instead of fabricated file lines.
6. When Agent exploration is enabled, a read-only explorer runs for at most two rounds. It checks evidence gaps and selects up to three additional files from server-approved candidates. The server validates paths, duplicates, and total budget.
7. With `DEEPSEEK_API_KEY`, the DeepSeek Responses API uses a JSON Schema to generate mechanism explanations, a research path, a reproduction plan, and verification questions. Agent mode uses at most two exploration calls plus one report call.
8. The server removes invalid evidence references. Deterministic analysis remains available when model access is unavailable.
9. The server accumulates input, output, and total token usage returned by successful model responses and exposes those values in the report.
10. The client presents a research brief, Agent trace, model usage, expandable source evidence, staged tasks, reproduction safety checks, verification questions, and Markdown export.

## Trust boundaries

- Repository text is untrusted input and cannot change system instructions.
- The model cannot access arbitrary networks or execute repository commands.
- The Agent can request only filtered paths from the real file tree. It cannot modify code or invoke a shell, browser, or other tool.
- A command enters an AI report only when it appears in cited repository evidence; otherwise the command is removed and replaced with a review prompt.
- The server issues and revalidates evidence identifiers, so the model cannot create references freely.
- Every DeepSeek Responses API call is stateless and independent; the server does not preserve a model conversation.
- Command execution remains a user decision and should occur in a container or virtual environment.

## Deterministic analysis

A research workflow cannot make product availability depend on model availability. Deterministic analysis ensures that:

- a repository map and research path work without a model key;
- external model availability does not remove core functionality;
- model-enhanced and structural analysis can use the same repository cases;
- evaluation can measure retrieval quality separately from model interpretation quality.

## Output contract

The shared `RepoAnalysis` type contains repository metadata, analysis engine, model usage, research scope, research goal, brief, architecture, confidence, evidence files, key mechanisms, research path, reproduction plan, verification questions, and a compact file tree. Client and server share this contract to reduce UI/API drift.
