namespace DevBook.Data.Models;

/// <summary>
/// Retrieved chunk returned by RAG search and answer endpoints.
/// </summary>
/// <param name="ChunkId">Stored chunk identifier.</param>
/// <param name="DocumentId">Identifier of the source document.</param>
/// <param name="ChunkText">Chunk text returned to the caller or answer agent.</param>
/// <param name="Heading">Markdown heading associated with the chunk, when the chunking strategy preserves one.</param>
/// <param name="CitationLabel">Human-readable citation label for the chunk.</param>
/// <param name="Score">Retrieval or reranking score assigned to the chunk.</param>
public sealed record RagChunkResponse(
    string ChunkId,
    string DocumentId,
    string ChunkText,
    string? Heading,
    string CitationLabel,
    double Score);
