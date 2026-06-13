# DevBook evaluations runners

Run these commands from the repository root.

## Generate golden datasets

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
