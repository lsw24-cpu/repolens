# RepoLens Threat Model

## Security goals

- Keep platform secrets and local analysis history private.
- Isolate repository content from model instructions.
- Link report claims and commands to retrieved source.
- Leave command execution to the user.

## Primary threats and controls

| Threat | Entry | Control | Residual risk |
|---|---|---|---|
| Prompt injection | README, source comments, sample data | Repository content is placed in evidence blocks, separate from model instructions | Source text may still be misread |
| Incorrect citations | Generated evidence identifiers | Server-side allow-list validation | A valid citation can provide incomplete support |
| Unsafe commands | Installation or execution steps | Commands must appear in cited evidence; the site does not run them | Repository documentation can contain unsafe commands |
| Service abuse | GitHub or model requests | Timeouts and bounded file retrieval | No distributed rate limiter |
| Privacy leakage | Analysis history and API requests | Progress stays in the browser; DeepSeek requests are stateless | Selected repository content is sent to DeepSeek when enabled |

## Non-goals

RepoLens reads selected source files and prepares reproduction steps. It does not execute repository code or audit dependency supply chains.
