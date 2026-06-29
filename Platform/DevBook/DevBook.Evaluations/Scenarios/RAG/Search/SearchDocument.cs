namespace DevBook.Evaluations.Scenarios.RAG.Search;

/// <summary>
/// Source evidence used by search evaluation as either an expected or retrieved document.
/// </summary>
/// <param name="SourcePath">Vault-relative source path, or a citation label when generated evidence has chunk identity but no path.</param>
/// <param name="Heading">Expected or retrieved section heading, when available.</param>
/// <param name="Snippet">Evidence snippet used to verify a relevant match.</param>
/// <param name="Rank">Retrieved rank, or null for expected-only evidence.</param>
/// <param name="Score">Retrieved score, or null when no score is available.</param>
/// <param name="ChunkId">Stored chunk identifier, when the evidence is chunk-addressable.</param>
/// <param name="DocumentId">Stored document identifier, when available.</param>
public sealed record SearchDocument(
    string SourcePath,
    string? Heading = null,
    string? Snippet = null,
    int? Rank = null,
    double? Score = null,
    string? ChunkId = null,
    string? DocumentId = null);
