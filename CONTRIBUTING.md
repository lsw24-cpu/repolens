# Contributing to RepoLens

Thank you for helping make RepoLens more reliable. Before a substantial change, open an issue that describes the problem, expected behavior, and validation approach. Small fixes may be submitted directly as a pull request.

## Local development

```bash
npm ci
cp .env.example .env.local
npm run dev
```

`DEEPSEEK_API_KEY` is optional. Without it, RepoLens uses deterministic evidence analysis.

## Contribution requirements

- Never commit secrets or personal data in code, logs, screenshots, or fixtures.
- Treat repository content as untrusted input at every boundary.
- New claims must trace to explicit file evidence.
- Add tests for behavior changes and pass `npm run lint` and `npm test`.
- Keep each pull request focused, and document its risks, rollback path, and manual validation.

## Design principles

RepoLens does not present model inference as repository fact, execute unfamiliar repository commands automatically, or store a researcher's analysis history by default. Start a design discussion before weakening any of these boundaries.
