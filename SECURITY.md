# Security Policy

## Supported version

Only the latest version on `main` is currently supported.

## Reporting a vulnerability

Do not disclose exploitable details in a public issue. Report them through a maintainer's private contact channel, including impact, a minimal reproduction, and any suggested mitigation. Maintainers will confirm the risk before coordinating a fix and disclosure timeline.

## Trust boundaries

- RepoLens accepts public GitHub repository identifiers only and validates inputs on the server.
- README files, source code, and prompt-like text from third-party repositories are untrusted data.
- The server validates evidence identifiers in model output and removes commands that do not appear in their cited evidence.
- The site never executes commands from a report. Researchers should inspect scripts and use an isolated environment.
- DeepSeek Responses API calls are stateless; local research progress remains in the browser.

## Secret handling

Set `DEEPSEEK_API_KEY` and the optional `GITHUB_TOKEN` through encrypted hosting environment variables. Never place secrets in source code, Git history, client-side variables, or issue screenshots.
