# User Guide

1. Enter a public GitHub repository and choose a goal and review depth.
2. For a monorepo, add a directory or topic such as `lora`, `trl/trainer`, or `mnist`.
3. Run the analysis. Agent exploration can look for additional files when the first pass misses an important module.
4. Open the E-series links to compare the report with its source windows.
5. Review commands in the original repository before running them in an isolated environment.
6. Export the Markdown report and add the environment, output, and any deviations from the source instructions.

## Interpreting results

- **AI-assisted analysis:** DeepSeek produced the report from retrieved source windows.
- **Agent exploration:** DeepSeek selected additional files from a bounded candidate list before producing the report.
- **Evidence analysis:** structural analysis produced the report without a model request.

The report lists model calls and token counts. Evidence labels describe how well the retrieved source supports each section.

## Known limits

- Public GitHub repositories only.
- Analysis uses a filtered set of text files; monorepos work best with a research scope.
- Notebook evidence is shown by normalized cell rather than raw JSON line number.
- RepoLens prepares reproduction steps but does not execute them.
