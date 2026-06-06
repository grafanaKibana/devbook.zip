# KnowledgeHub API

Small local API for ingesting markdown notes, storing documents/chunks in MongoDB through `MongoDB.Driver`, and generating embeddings through `Microsoft.Extensions.AI` with an OpenAI-backed embedding client.

This is a personal R&D proof of concept for learning RAG mechanics, not a production enterprise service. The code intentionally favors a small number of classes and visible constants over extra configuration layers, extension points, and defensive edge-case handling.

## Projects

- `KnowledgeHub.API`, minimal ASP.NET Core host.
- `KnowledgeHub.Data`, ingestion, chunking, small MongoDB.Driver repositories, Hangfire boilerplate for future jobs, and embedding integration.
- `KnowledgeHub.Evaluations`, test-style RAG search evaluation over the golden dataset and local HTML report generation.

## Prerequisites

- MongoDB connection string in `ConnectionStrings:MongoDb`.
- Atlas MongoDB for real `/rag/search` vector retrieval. Local or non-Atlas MongoDB is enough for basic storage experiments, but it does not support the `$vectorSearch` stage used by the search endpoint.
- OpenAI API key in `EmbeddingOptions:ApiKey` or the `EmbeddingOptions__ApiKey` environment variable.
- Optional `EmbeddingOptions:Endpoint` or `EmbeddingOptions__Endpoint` if you are not using the default OpenAI endpoint.

Required runtime configuration:

```json
{
  "ConnectionStrings": {
    "MongoDb": "<mongo-connection-string>"
  },
  "EmbeddingOptions": {
    "ApiKey": "<openai-api-key>",
    "ModelId": "text-embedding-3-small",
    "VectorDimensions": 384
  }
}
```

Keep secret values in user-secrets or environment variables, not in committed `appsettings*.json` files.

## Run

From the repo root:

```bash
dotnet run --project Platform/KnowledgeHub/KnowledgeHub.API/KnowledgeHub.API.csproj
```

The local launch profiles use:

- `http://localhost:5288`
- `https://localhost:7280`

## Debug

- Use the `http` or `https` launch profile from `KnowledgeHub.API/Properties/launchSettings.json`.
- `ASPNETCORE_ENVIRONMENT` is set to `Development` by those profiles.

## Build and test

Build:

```bash
dotnet build Platform/KnowledgeHub/KnowledgeHub.API/KnowledgeHub.API.csproj
```

Test:

```bash
dotnet test Platform/KnowledgeHub/KnowledgeHub.Tests/KnowledgeHub.Tests.csproj
```

Build the evaluation project:

```bash
dotnet build Platform/KnowledgeHub/KnowledgeHub.Evaluations/KnowledgeHub.Evaluations.csproj
```

## RAG evaluation commands

The golden dataset is `Platform/KnowledgeHub/KnowledgeHub.Evaluations/Datasets/golden-rag-cases.json`. Restore the local report tool from the repo root before generating HTML reports:

```bash
dotnet tool restore
```

The tool manifest tracks `Microsoft.Extensions.AI.Evaluation.Console`, which provides `dotnet aieval report`.

Evaluation runs load configuration from `KnowledgeHub.Evaluations/appsettings.json`, `KnowledgeHub.Evaluations/appsettings.Evaluations.json`, and environment variables. The committed `appsettings.Evaluations.json` contains only non-secret defaults and placeholders. Before running live evaluations, provide:

- `ConnectionStrings:MongoDb` with an Atlas connection string that has the vector-search index.
- `EmbeddingOptions:ApiKey` with an OpenAI API key.

Use environment variables when you do not want to edit the local settings file:

```bash
ConnectionStrings__MongoDb="<mongo-connection-string>" \
EmbeddingOptions__ApiKey="<openai-api-key>" \
dotnet run --project Platform/KnowledgeHub/KnowledgeHub.Evaluations/KnowledgeHub.Evaluations.csproj -- --name RAG.Search
```

If either value is missing, the scenario tests are skipped and no new evaluation report folder is created.

Generate the AI evaluation HTML report from the scenario test run by running the evaluation project:

```bash
dotnet run --project Platform/KnowledgeHub/KnowledgeHub.Evaluations/KnowledgeHub.Evaluations.csproj -- --name RAG.Search
```

Selecting and running the `KnowledgeHub.Evaluations` project in the IDE executes the same `RunEvaluation.cs` report-generation flow. `RunEvaluation.cs` invokes the report command for the latest run folder:

```bash
dotnet aieval report --path EvaluationReports --output <latest-run>/report.html
```

## Ingestion API

Endpoint:

```text
POST /ingestion/documents
```

Example request:

```json
{
  "sourcePath": "11 AI & ML/LLM/RAG",
  "fileName": "Chunking.md",
  "forceReingest": false
}
```

Example full-folder request:

```json
{
  "sourcePath": "11 AI & ML/LLM/RAG",
  "fileName": null,
  "forceReingest": true
}
```

Example full-root request:

```json
{
  "sourcePath": null,
  "fileName": null,
  "forceReingest": true
}
```

## Ingestion rules

- `sourcePath` is **relative to** the configured ingestion root; null or blank ingests the full root.
- Default ingestion root: `Vault/Software Engineering`.
- `fileName` is optional, but when present it must be a single `.md` file name with no path segments.
- `forceReingest` is optional and defaults to `false`; set it to `true` to refresh stored documents/chunks even when the source content is unchanged.
- Requests are rejected if they try to escape the configured ingestion root.
- Folder ingestion reads all matching markdown files; individual markdown file size is not checked.
- Folder ingestion scans current markdown files, compares hashes against stored documents, upserts only new or changed files, deletes only stored documents whose files no longer exist, and chunks/embeds only changed documents. Single-file ingestion stays scoped to that file and does not delete sibling documents.
- Hangfire server/storage is wired for future background work, but ingestion chunking currently runs inline from the API request; no ingestion job is registered.

Persistence is intentionally driver-only. The app uses two tiny repositories over `MongoDB.Driver`: one for document lookup/upsert and one for chunk replacement/vector search. There is no EF Core DbContext, migration layer, generic repository, or unit-of-work abstraction.

## RAG API

`/rag/search` performs real vector retrieval against the selected strategy collection: `chunks.fixedsize`, `chunks.markdownsection`, or `chunks.semantic`. It embeds the query with the configured embedding model, runs Atlas `$vectorSearch`, and returns `mode: "vector"` with matching chunk results.

`/rag/ask` performs the same real vector chunk retrieval as `/rag/search`, sends the retrieved chunks to a Microsoft Agent Framework `AnswerAgent`, and returns the generated answer with the retrieved chunks as sources.

Search chunks:

```text
POST /rag/search
```

```json
{
  "query": "when should I use RAG",
  "topK": 5
}
```

Example QA request for a blank query:

```bash
curl -i http://localhost:5288/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query":"   ","topK":5}'
```

Expected response shape:

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "Bad Request",
  "status": 400,
  "detail": "Query is required."
}
```

Example QA request for vector retrieval:

```bash
curl -s http://localhost:5288/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query":"when should I use RAG","topK":5}'
```

Expected response shape:

```json
{
  "query": "when should I use RAG",
  "mode": "vector",
  "results": [
    {
      "chunkId": "<chunk-id>",
      "documentId": "<document-id>",
      "chunkText": "<matched chunk text>",
      "heading": "<document heading>",
      "citationLabel": "<citation>",
      "score": 0.82
    }
  ]
}
```

Ask a question:

```text
POST /rag/ask
```

```json
{
  "question": "When should I use RAG instead of fine tuning?",
  "topK": 5
}
```

The answer field is generated by the grounded RAG answer agent. The `sources` array comes from real vector retrieval against MongoDB chunks.

## Atlas Vector Search index

Create this Atlas Vector Search index on every strategy collection you want to search against before calling `/rag/search` with real data: `chunks.fixedsize`, `chunks.markdownsection`, and `chunks.semantic`.

```json
{
  "name": "chunks_embedding_vector_idx",
  "type": "vectorSearch",
  "definition": {
    "fields": [
      {
        "type": "vector",
        "path": "Embedding",
        "numDimensions": 384,
        "similarity": "cosine"
      }
    ]
  }
}
```

The index dimensions must match `EmbeddingOptions:VectorDimensions`. The path is currently a PoC constant in `RagSearchService` and must stay `Embedding` unless the chunk model and index are changed together.

## RAG troubleshooting

- Missing index or non-Atlas MongoDB: `/rag/search` depends on Atlas `$vectorSearch`. If the index `chunks_embedding_vector_idx` is missing from the selected strategy collection, or the database is local/non-Atlas MongoDB, vector search fails before returning results.
- Dimension mismatch: the Atlas index uses `384` dimensions, so `EmbeddingOptions:ModelId` must stay `text-embedding-3-small` with `EmbeddingOptions:VectorDimensions = 384` unless you rebuild stored chunk embeddings and recreate the index with matching dimensions.
- Empty results: if `/rag/search` returns `mode: "vector"` with an empty `results` array, first ingest markdown documents for the selected chunking strategy so the API can create chunks and embeddings. A valid index cannot return matches when the selected strategy collection has no embedded chunks.
- Secret handling: keep `ConnectionStrings:MongoDb` and `EmbeddingOptions:ApiKey` in user-secrets or environment variables only. Use double underscores for environment variables, for example `ConnectionStrings__MongoDb` and `EmbeddingOptions__ApiKey`. Committed configuration should contain placeholders or non-secret defaults.

## Runtime flow

1. The API validates the request and scans markdown files under the configured ingestion root.
2. Folder ingestion loads stored documents under the selected folder scope and compares them with current file paths and content hashes.
3. Missing files delete their stored documents and chunks; unchanged files are skipped unless `forceReingest` is true.
4. New or changed markdown documents are created or updated in MongoDB.
5. Changed documents are chunked and embedded before the ingestion response returns.
6. Chunk replacement deletes the document's previous chunks and inserts the new embedded chunks.
