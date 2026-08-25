# Evaluation

RepoLens evaluation covers deterministic retrieval, bounded evidence exploration, and field-level semantic support. Repository cases use labeled revisions so results remain tied to a specific source state.

## Deterministic retrieval

| Repository | Exact-path key-file coverage |
|---|---:|
| karpathy/nanoGPT | 100.0% |
| openai/whisper | 71.4% |
| facebookresearch/segment-anything | 50.0% |
| **Mean** | **73.8%** |

Fixed `lora` scope in `mlx-examples` and `mnist` scope in `pytorch/examples` both reach 100.0%. The run uses deterministic retrieval with zero model calls.

## Bounded evidence exploration

| Repository | Standard | Exploration | Difference |
|---|---:|---:|---:|
| karpathy/nanoGPT | 60.0% | 100.0% | +40.0 points |
| openai/whisper | 28.6% | 71.4% | +42.9 points |
| facebookresearch/segment-anything | 16.7% | 66.7% | +50.0 points |
| ggml-org/llama.cpp | 16.7% | 16.7% | 0.0 points |
| **Mean** | **30.5%** | **63.7%** | **+33.2 points** |

The paired run records an invalid evidence-ID rate of 0.0%. It measures retrieval coverage rather than semantic accuracy.

## Semantic support

| Repository | Supported | Partial | Unsupported | Unverifiable | Strict support | Weighted support |
|---|---:|---:|---:|---:|---:|---:|
| karpathy/nanoGPT | 22 | 3 | 0 | 0 | 88.0% | 94.0% |
| openai/whisper | 22 | 3 | 0 | 0 | 88.0% | 94.0% |
| facebookresearch/segment-anything | 23 | 0 | 0 | 0 | 100.0% | 100.0% |
| **Total** | **67** | **6** | **0** | **0** | **91.8%** | **95.9%** |

All 15 displayed reproduction commands appear verbatim in their cited evidence. Full commit revisions, evidence links, and server-issued identifiers are checked for every reviewed report.

## Metric boundaries

- Exact-path key-file coverage compares retrieved paths with a labeled set; it does not establish that every retrieved file is semantically necessary.
- Valid evidence identifiers establish structural traceability; semantic support still requires review of the cited source.
- A reproduction plan records source-grounded steps and open conditions; it is not evidence that an experiment ran successfully.
- Repository updates require a new labeled revision and evaluation record.

Machine-readable results are stored in [`evaluation/results`](../evaluation/results), and the semantic-review summary is stored in [`evaluation/semantic-evaluation.md`](../evaluation/semantic-evaluation.md).
