# Contributing to RepoLens

For substantial changes, open an issue describing the problem and proposed validation. Small fixes may be submitted directly as a pull request.

## Local development

```bash
npm ci
cp .env.example .env.local
npm run dev
```

`DEEPSEEK_API_KEY` is optional. Without it, RepoLens uses deterministic evidence analysis.

## Contribution requirements

- Keep secrets and personal data out of code, logs, screenshots, and fixtures.
- Treat repository content as untrusted input.
- Link new report claims to file evidence.
- Add tests for behavior changes and pass `npm run lint` and `npm test`.
- Keep each pull request focused and describe how it was checked.

## Design principles

Generated claims stay linked to repository evidence. RepoLens does not run repository commands or save analysis history by default. Discuss changes to these boundaries in an issue first.
