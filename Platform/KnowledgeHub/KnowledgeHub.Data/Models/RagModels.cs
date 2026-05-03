namespace KnowledgeHub.Data.Models;

public sealed record RagSearchRequest(string Query, int TopK = 5);

public sealed record RagAskRequest(string Question, int TopK = 5);

public sealed record RagChunkResult(
    string ChunkId,
    string DocumentId,
    string ChunkText,
    string? Heading,
    string CitationLabel,
    double Score);

public sealed record RagSearchResponse(
    string Query,
    string Mode,
    IReadOnlyList<RagChunkResult> Results);

public sealed record RagAskResponse(
    string Question,
    string Answer,
    string Mode,
    IReadOnlyList<RagChunkResult> Sources);
