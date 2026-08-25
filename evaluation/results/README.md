# Evaluation Results

`npm run benchmark -- --batch=1` runs standard and bounded-exploration modes on the same repository batch and writes `latest.json` and `latest.md`.

Result files contain only public repository paths, model usage, timing, and aggregate metrics. They do not store source code, API keys, or login credentials. Invalid evidence-ID rate is a structural safety check; it does not replace human review of whether the cited source semantically supports a claim.

Human-readable summaries and machine-readable results use the same labeled repository revisions and aggregate metrics.
