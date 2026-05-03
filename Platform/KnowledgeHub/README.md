# KnowledgeHub API

Small local API for ingesting markdown notes, storing documents/chunks in MongoDB, and generating embeddings through `Microsoft.Extensions.AI` with an OpenAI-backed embedding client.

## Projects

- `KnowledgeHub.API` — minimal ASP.NET Core host.
- `KnowledgeHub.Data` — ingestion, chunking, Hangfire job orchestration, and embedding integration.

## Prerequisites

- MongoDB connection string in `ConnectionStrings:MongoDb`.
- The MongoDB connection string must include a database name because Hangfire Mongo storage uses it at startup.
- A reachable MongoDB instance for local runtime testing.
- `OPENAI_API_KEY` environment variable.
- Optional `OPENAI_ENDPOINT` environment variable if you are not using the default OpenAI endpoint.

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

There is currently no dedicated test project under `Platform/KnowledgeHub`, so `dotnet test` is not yet a meaningful verification step here.

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

## Mock RAG API

These endpoints are intentionally simple placeholders. They return hard-coded dummy chunks so the API shape can be tested before real vector search and LLM answer generation are added.

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

The mock answer returns dummy source chunks and citation labels without calling MongoDB or an LLM. Later, `/rag/search` should become query embedding plus vector retrieval, and `/rag/ask` should pass retrieved chunks to a chat model.

## Runtime flow

1. The API validates the request and scans markdown files under the configured ingestion root.
2. Matching documents are created or updated in MongoDB.
3. Changed document IDs are enqueued into Hangfire.
4. The background job chunks the document text and generates embeddings.
