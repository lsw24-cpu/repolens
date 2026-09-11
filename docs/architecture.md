# RepoLens Architecture

## Processing pipeline

1. The user enters a public GitHub repository, a goal, and an optional directory or topic.
2. The server validates the repository name and reads its metadata, tree, README, and a bounded set of text files through the GitHub API.
3. Retrieval filters dependencies and build artifacts, follows paths mentioned in project documentation, and selects evidence for configuration, data flow, implementation, and tests.
4. The evidence layer finds symbols and cross-file calls, then extracts source windows. Each window keeps its path, revision-pinned link, and an E-series identifier. Notebook cells are normalized before extraction.
5. Agent exploration can run for two rounds and add up to three files per round from a server-approved candidate list.
6. With `DEEPSEEK_API_KEY`, DeepSeek produces a structured report from these source windows. The server checks its evidence references before returning the report. Structural analysis is used when the model is unavailable.

## Trust boundaries

Repository content is handled as input data. The model has no shell or general network access, and Agent exploration selects files only from the filtered repository tree. The server validates paths and evidence identifiers, and displays a command only when the cited source contains it. DeepSeek requests are stateless; analysis progress stays in the browser.

## Deterministic analysis

The repository map and research path work without a model key. Structural and model-assisted analysis use the same evidence format, so retrieval can be evaluated separately from report generation.

## Output contract

Client and server share the `RepoAnalysis` type for repository metadata, evidence, report sections, reproduction steps, and verification questions.
