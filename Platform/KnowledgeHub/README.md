# KnowledgeHub API

Small local API for ingesting markdown notes, storing documents/chunks in MongoDB through `MongoDB.Driver`, and generating embeddings through `Microsoft.Extensions.AI` with an OpenAI-backed embedding client.

This is a personal R&D proof of concept for learning RAG mechanics, not a production enterprise service. The code intentionally favors a small number of classes and visible constants over extra configuration layers, extension points, and defensive edge-case handling.

## Projects

- `KnowledgeHub.API`, minimal ASP.NET Core host.
- `KnowledgeHub.Data`, ingestion, chunking, small MongoDB.Driver repositories, Hangfire boilerplate for future jobs, and embedding integration.

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

## Ingestion API

Endpoint:

```text
POST /ingestion/documents
```

Example request:

```json
{
  "sourcePath": "11 AI & ML/LLM/RAG",
  "fileName": "Chunking.md"
}
```

Example full-folder request:

```json
{
  "sourcePath": "11 AI & ML/LLM/RAG",
  "fileName": null
}
```

## Ingestion rules

- `sourcePath` is **relative to** the configured ingestion root.
- Default ingestion root: `Vault/Software Engineering`.
- `fileName` is optional, but when present it must be a single `.md` file name with no path segments.
- Requests are rejected if they try to escape the configured ingestion root.
- Folder ingestion reads all matching markdown files; individual markdown file size is not checked.
- Ingestion is currently **upsert-only**. It creates or updates scanned files, but it does not purge documents for files that were deleted or moved outside the scanned request.
- Hangfire server/storage is wired for future background work, but ingestion chunking currently runs inline from the API request; no ingestion job is registered.

Persistence is intentionally driver-only. The app uses two tiny repositories over `MongoDB.Driver`: one for document lookup/upsert and one for chunk replacement/vector search. There is no EF Core DbContext, migration layer, generic repository, or unit-of-work abstraction.

## RAG API

`/rag/search` performs real vector retrieval against the `chunks` collection. It embeds the query with the configured embedding model, runs Atlas `$vectorSearch`, and returns `mode: "vector"` with matching chunk results.

`/rag/ask` remains a mock endpoint for now. It still returns dummy source chunks and does not call MongoDB or an LLM.

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

The mock answer returns dummy source chunks and citation labels without calling MongoDB or an LLM. Real answer generation for `/rag/ask` is intentionally outside this PoC step.

## Atlas Vector Search index

Create this Atlas Vector Search index on the `chunks` collection before calling `/rag/search` against real data:

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

- Missing index or non-Atlas MongoDB: `/rag/search` depends on Atlas `$vectorSearch`. If the index `chunks_embedding_vector_idx` is missing, or the database is local/non-Atlas MongoDB, vector search fails before returning results.
- Dimension mismatch: the Atlas index uses `384` dimensions, so `EmbeddingOptions:ModelId` must stay `text-embedding-3-small` with `EmbeddingOptions:VectorDimensions = 384` unless you rebuild stored chunk embeddings and recreate the index with matching dimensions.
- Empty results: if `/rag/search` returns `mode: "vector"` with an empty `results` array, first ingest markdown documents so the API can create chunks and embeddings. A valid index cannot return matches when the `chunks` collection has no embedded chunks.
- Secret handling: keep `ConnectionStrings:MongoDb` and `EmbeddingOptions:ApiKey` in user-secrets or environment variables only. Use double underscores for environment variables, for example `ConnectionStrings__MongoDb` and `EmbeddingOptions__ApiKey`. Committed configuration should contain placeholders or non-secret defaults.

## Runtime flow

1. The API validates the request and scans markdown files under the configured ingestion root.
2. Matching documents are created or updated in MongoDB.
3. Changed documents are chunked and embedded before the ingestion response returns.
4. Chunk replacement deletes the document's previous chunks and inserts the new embedded chunks.
