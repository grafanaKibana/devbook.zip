namespace DevBook.Data.Models;

public sealed record RagChunkResponse(
    string ChunkId,
    string DocumentId,
    string ChunkText,
    string? Heading,
    string CitationLabel,
    double Score);
