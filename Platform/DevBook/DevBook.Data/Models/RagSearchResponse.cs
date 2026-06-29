namespace DevBook.Data.Models;

/// <summary>
/// Result returned by the RAG search endpoint.
/// </summary>
/// <param name="Query">Normalized query used for retrieval.</param>
/// <param name="Mode">Retrieval mode, including vector search and reranking strategy.</param>
/// <param name="Results">Retrieved chunks returned after reranking.</param>
public sealed record RagSearchResponse(
    string Query,
    string Mode,
    IReadOnlyList<RagChunkResponse> Results);
