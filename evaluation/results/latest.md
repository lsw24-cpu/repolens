# RepoLens Bounded Exploration Evaluation

- Run time: 2026-08-24T17:21:21.849Z
- Target: http://127.0.0.1:3000
- Cases: 4; paired standard and bounded-exploration runs

| Repository | Standard coverage | Exploration coverage | Difference | Latency standard/exploration | Tokens standard/exploration |
|---|---:|---:|---:|---:|---:|
| karpathy/nanoGPT | 60.0% | 100.0% | +40.0% | 23.9s / 26.8s | 10,029 / 28,500 |
| openai/whisper | 28.6% | 71.4% | +42.9% | 17.7s / 26.4s | 8,295 / 29,006 |
| facebookresearch/segment-anything | 16.7% | 66.7% | +50.0% | 23.2s / 26.9s | 8,440 / 26,840 |
| ggml-org/llama.cpp | 16.7% | 16.7% | +0.0% | 23.2s / 36.6s | 9,496 / 19,236 |

## Summary

- Mean standard-mode exact-path key-file coverage: 30.5%
- Mean bounded-exploration exact-path key-file coverage: 63.7%
- Mean difference: +33.2 percentage points
- Cases improved by bounded evidence exploration: 3/4
- Completed reports: standard 4/4, bounded exploration 4/4
- Invalid evidence-ID rate: 0.0%
- Median latency: standard 23.2s, Agent 26.9s
- Recorded model usage: 15 calls, 139,842 tokens

## Interpretation boundary

- This is a small retrieval pilot, not proof of semantic accuracy or successful experiment reproduction.
- Exact-path key-file coverage compares retrieval with a labeled path set; it does not prove every retrieved file is semantically necessary.
- Invalid evidence-ID rate validates server-issued identifiers only. Semantic support still requires human review.
- Results include all four labeled cases.
- Repositories can change after their labeled revisions; a rerun must record drift before comparison.
