namespace DevBook.Evaluations.Scenarios.RAG.Search;

/// <summary>
/// Source evidence used by search evaluation as either an expected or retrieved document.
/// </summary>
/// <param name="SourcePath">Vault-relative path of the source document.</param>
/// <param name="Heading">Expected or retrieved section heading, when available.</param>
/// <param name="Snippet">Evidence snippet used to verify a relevant match.</param>
/// <param name="Rank">Retrieved rank, or null for expected-only evidence.</param>
/// <param name="Score">Retrieved score, or null when no score is available.</param>
public sealed record SearchDocument(
    string SourcePath,
    string? Heading = null,
    string? Snippet = null,
    int? Rank = null,
    double? Score = null);
