# User Guide

1. Enter a public GitHub research or engineering repository.
2. For a repository with independent subprojects, enter a directory or topic such as `lora`, `trl/trainer`, or `mnist` in Research scope. Leave it empty for a single project. Suggestions shown after analysis can be selected before rerunning a focused report.
3. Choose Understand architecture, Reproduce an experiment, or Continue development.
4. Choose a 30-minute scan, standard review, or deep research path.
5. Enable Agent exploration when deterministic retrieval may have missed a key module. It adds latency and DeepSeek usage but does not require a separate API.
6. Read the research brief and confidence label before inspecting E-series source windows.
7. Complete the staged research tasks and use their criteria to judge progress.
8. Return to the original file before running any reproduction command, then use an isolated environment.
9. Complete repository-specific verification questions and revisit evidence when an answer fails.
10. Export the Markdown report and add your own environment, output, and deviation record.

## Interpreting results

- **AI-assisted analysis:** a model generated a structured report from retrieved repository evidence.
- **Agent evidence exploration:** the same DeepSeek API first checks evidence gaps, reads additional real repository files, and then generates the report. It uses at most three model calls in total.
- **Model usage:** the report shows successful call and token counts for comparing standard and Agent cost; it is not a currency estimate.
- **Evidence analysis:** the model key is absent or unavailable, so deterministic fallback produced the report.
- **Strong / Moderate / Exploratory evidence:** these labels describe support from currently retrieved evidence, not statistical confidence in a scientific conclusion.

## Known limits

- RepoLens currently handles public GitHub repositories only.
- It reads a filtered set of key text files, not a complete code audit.
- Without a research scope, a multi-project report is an overview rather than a complete reproduction path for any one subproject.
- Notebook evidence is extracted by cell and labeled explicitly; RepoLens does not fabricate raw-file line numbers.
- Agent exploration is bounded evidence retrieval. It does not run repository code or guarantee that every relevant file is found.
- An automatically generated reproduction plan does not replace paper, license, security, or compute review.
- A single analysis must not be presented as successful experiment reproduction.
