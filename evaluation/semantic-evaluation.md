# Semantic Support Evaluation

- Evaluation date: 2026-08-24
- Mode: standard
- Model: DeepSeek `deepseek-v4-flash`
- Cases: nanoGPT, Whisper, and Segment Anything at fixed revisions
- Review unit: one report field; fields with multiple factual statements receive the rating of the weakest statement

## Results

| Repository | Supported | Partial | Unsupported | Unverifiable | Strict support | Weighted support |
|---|---:|---:|---:|---:|---:|---:|
| karpathy/nanoGPT | 22 | 3 | 0 | 0 | 88.0% | 94.0% |
| openai/whisper | 22 | 3 | 0 | 0 | 88.0% | 94.0% |
| facebookresearch/segment-anything | 23 | 0 | 0 | 0 | 100.0% | 100.0% |
| **Total** | **67** | **6** | **0** | **0** | **91.8%** | **95.9%** |

## Structural checks

| Check | Result |
|---|---:|
| Reports with full 40-character commit revisions | 3/3 |
| Missing evidence IDs | 0 |
| Mutable-revision evidence links | 0 |
| Displayed reproduction commands | 15 |
| Commands absent from cited evidence | 0 |
| Known ambiguous call mismatches | 0 |

## Interpretation

The evaluation measures whether report fields are supported by the source windows presented to the user. Strict support counts partially supported fields as misses; weighted support assigns them half credit. The review evaluates evidence support and reproduction-planning quality rather than successful execution of third-party experiments.
