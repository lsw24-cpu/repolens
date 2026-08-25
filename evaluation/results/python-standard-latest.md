# RepoLens Deterministic Benchmark

- Run time: 2026-08-24T17:53:42.163Z
- Target: http://127.0.0.1:3000
- Cases: 3; deterministic analysis

| Repository | Exact-path key-file coverage | Latency |
|---|---:|---:|
| karpathy/nanoGPT | 100.0% | 2.4s |
| openai/whisper | 71.4% | 1.8s |
| facebookresearch/segment-anything | 50.0% | 1.9s |

## Summary

- Mean standard-mode exact-path key-file coverage: 73.8%
- Completed deterministic reports: 3/3
- Invalid evidence-ID rate: 0.0%
- Median standard-mode latency: 1.9s
- Total model usage: 0 calls, 0 tokens

## Interpretation boundary

- Exact-path key-file coverage compares retrieval with a labeled path set; it does not prove every retrieved file is semantically necessary.
- Invalid evidence-ID rate validates server-issued identifiers only. Semantic support still requires human review.
- Repositories can change after their labeled revisions; a rerun must record drift before comparison.
