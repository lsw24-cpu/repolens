# RepoLens Scoped Deterministic Benchmark

- Run time: 2026-08-24T17:53:47.086Z
- Target: http://127.0.0.1:3000
- Cases: 2; deterministic analysis

| Repository and scope | Exact-path key-file coverage | Latency |
|---|---:|---:|
| ml-explore/mlx-examples (`lora`) | 100.0% | 2.2s |
| pytorch/examples (`mnist`) | 100.0% | 2.5s |

## Summary

- Mean standard-mode exact-path key-file coverage: 100.0%
- Completed deterministic reports: 2/2
- Invalid evidence-ID rate: 0.0%
- Median standard-mode latency: 2.4s
- Total model usage: 0 calls, 0 tokens

## Interpretation boundary

- This benchmark measures retrieval inside an explicitly selected subproject, not an entire monorepo.
- Exact-path key-file coverage does not prove every retrieved file is semantically necessary.
- Invalid evidence-ID rate validates server-issued identifiers only. Semantic support still requires human review.
- Repositories can change after their labeled revisions; a rerun must record drift before comparison.
