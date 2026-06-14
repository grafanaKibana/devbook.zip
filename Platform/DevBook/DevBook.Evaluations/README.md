# DevBook evaluations runners

Run these commands from the repository root.

## Generate search datasets

Generate group artifacts and final dataset files:

```bash
dotnet run Platform/DevBook/DevBook.Evaluations/RunDatasetGeneration.cs -- --sample-size 1000 --max-groups 120
```

Smoke-test grouping without LLM calls:

```bash
dotnet run Platform/DevBook/DevBook.Evaluations/RunDatasetGeneration.cs -- --dry-run --sample-size 100 --max-groups 10
```

Useful throttled run while testing prompts:

```bash
dotnet run Platform/DevBook/DevBook.Evaluations/RunDatasetGeneration.cs -- --sample-size 1000 --max-groups 120 --max-llm-groups 5
```

The dataset generation runner reads Mongo and OpenAI settings from `DevBook.Evaluations/appsettings.Evaluations.json`, `DevBook.API/appsettings.Development.json`, and environment variables. It uses the solution's existing `OpenAIOptions`, `ChunkingStrategyKind`, and chunk collection naming helper so generator behavior stays aligned with the app. It never prints secrets.

`--sample-size` is the base sample size for the smallest chunk collection. Larger collections are sampled proportionally, capped at the collection size. For example, if fixed-size has about 2k chunks and semantic has about 8k chunks, `--sample-size 1000` samples roughly 1000 fixed-size chunks and roughly 4000 semantic chunks.

### What "different datasets" means

A single run always produces one dataset file per chunking strategy. The strategies are defined in `CollectionConfig.All` in [RunDatasetGeneration.cs](RunDatasetGeneration.cs) and currently are:

| Strategy | Output file | Min cosine similarity |
| --- | --- | --- |
| `FixedSize` | `chunks-fixedsize.json` | 0.62 |
| `MarkdownSection` | `chunks-markdownsection.json` | 0.70 |
| `Semantic` | `chunks-semantic.json` | 0.70 |

Each dataset is built from the matching Mongo chunk collection (named via the app's `ChunkCollectionNames.ForStrategy` helper), so the only way to add, remove, or retune a dataset family is to edit the `CollectionConfig.All` array — for example add a new strategy, or change a `MinimumCosineSimilarity` to make grouping looser or stricter for that strategy. There is no CLI flag for this; it is a deliberate code change so generator behavior stays aligned with the app.

The LLM model used for query generation comes from `GoldenDatasetGeneratorOptions:ModelId` (defaults to `gpt-5.4-mini`) and can be overridden per run with the `GOLDEN_DATASET_MODEL` environment variable. Swapping the model is the simplest way to get qualitatively different queries from the same chunks:

```bash
GOLDEN_DATASET_MODEL=gpt-5.4 dotnet run Platform/DevBook/DevBook.Evaluations/RunDatasetGeneration.cs -- --sample-size 1000 --max-groups 120
```

### How dataset size is determined

A dataset file is a list of cases. Cases are produced in three stages, and each stage caps the final count:

1. **Sampling.** `--sample-size N` pulls roughly `N` chunks from the smallest collection and proportionally more from larger ones. Larger samples surface more candidate seeds and denser embedding neighborhoods, so more chunks can group together.
2. **Grouping.** Sampled chunks are clustered into coherent groups by embedding cosine similarity. Only groups that pass the coherence checks (at least 3 chunks, enough shared terms / similarity — see `ValidateCoherence`) are *accepted*. `--max-groups M` is a hard cap on accepted groups per collection.
3. **Query generation.** Each accepted group is sent to the LLM, which proposes 2–3 queries. A query is kept only if it has at least one primary chunk and at least one supporting or acceptable chunk, so the final case count per collection is at most `min(accepted groups, --max-llm-groups) × ~3`, and usually less after filtering.

### Tweaking quantity

| Goal | Lever | Effect |
| --- | --- | --- |
| Bigger datasets | raise `--sample-size` and/or `--max-groups` | More chunks sampled and more groups accepted, so more cases — at the cost of more LLM calls and runtime. |
| Smaller / cheaper datasets | lower `--sample-size` and/or `--max-groups` | Fewer groups and cases. |
| Cap LLM cost without shrinking the sample | `--max-llm-groups K` | Grouping still runs over the full sample (group artifacts are complete), but only the first `K` accepted groups per collection are sent to the LLM, so only those produce cases. |
| Inspect quantity before paying for the LLM | `--dry-run` | Runs sampling and grouping only and writes group/summary artifacts. Check `Datasets/Groups/summary.json` for `acceptedGroups` per collection — multiply by ~2–3 for a rough case-count ceiling, then choose `--sample-size` / `--max-groups` accordingly. |
| More variety per case | raise `--max-groups` over raising `--sample-size` | A higher group cap admits more distinct topics; a larger sample mostly densifies existing neighborhoods. |

Example — large, exhaustive run (no LLM throttling):

```bash
dotnet run Platform/DevBook/DevBook.Evaluations/RunDatasetGeneration.cs -- --sample-size 3000 --max-groups 300
```

Example — small, fast iteration set:

```bash
dotnet run Platform/DevBook/DevBook.Evaluations/RunDatasetGeneration.cs -- --sample-size 300 --max-groups 30
```

Note that `--max-groups`, `--sample-size`, and `--max-llm-groups` apply *per collection*, so the total cases across all three dataset files is roughly three times the per-collection figure.

Outputs:

- dataset files: `Platform/DevBook/DevBook.Evaluations/Datasets/*.json`
- group files and generation summary: `Platform/DevBook/DevBook.Evaluations/Datasets/Groups/`
- JSON schemas: `Platform/DevBook/DevBook.Evaluations/Datasets/Schemas/`

Sample JSON files are not written because sampled chunks are processed in memory. Each generated group file, final dataset file, and summary file includes `generatedAt` immediately after `version`. Each final case keeps only LLM-validated queries with at least one primary chunk and at least one supporting or acceptable chunk. Final expectations use chunk objects (`primaryChunks`, `supportingChunks`, `acceptableChunks`) with the chunk id, document id, heading, order, citation label, and text preview needed to evaluate or inspect the case without opening the group artifacts.

## Run evaluations

Run the default RAG search evaluation and generate a report:

```bash
dotnet run Platform/DevBook/DevBook.Evaluations/RunEvaluation.cs -- --name RAG.Search
```

Run the evaluation and open the generated report in the default browser:

```bash
dotnet run Platform/DevBook/DevBook.Evaluations/RunEvaluation.cs -- --name RAG.Search --open-browser
```

`RunEvaluation.cs` runs the selected evaluation tests, finds the report folder created by that run, and invokes `dotnet aieval report` to write `report.html`.
