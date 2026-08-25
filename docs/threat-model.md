# RepoLens Threat Model

## Security goals

1. Do not expose platform secrets or a researcher's local progress.
2. Do not treat malicious instructions in third-party repositories as system instructions.
3. Do not present unsupported model claims as repository facts.
4. Do not execute installation, test, or training commands without researcher review.

## Primary threats and controls

| Threat | Entry | Control | Residual risk |
|---|---|---|---|
| Prompt injection | README, source comments, sample data | Explicit instruction isolation; repository content appears only in evidence blocks | The model can still misread text, so source links remain available for human review |
| Fabricated citations | Model-generated evidence identifiers | Server-side allow-list validation | A valid identifier may still provide weak support, so researchers must read the source |
| Dangerous commands | Model-generated installation or execution steps | Commands must appear verbatim in cited evidence or are removed; the site never runs commands | A command in original repository text can still be malicious, so isolated execution is required |
| Service abuse | High-volume GitHub or model requests | Public GitHub repositories only, request timeouts, and bounded file retrieval | The current prototype has no distributed rate limiter |
| Privacy leakage | Analysis history and API requests | Progress remains in the browser; DeepSeek Responses API calls are stateless | Repository names and selected source are sent to the model service when AI is enabled |

## Non-goals

The current version does not execute repository code, scan complete dependency supply chains, or guarantee that any third-party project is safe to run. It is an auditable reading and reproduction-preparation layer, not a sandbox execution platform.
