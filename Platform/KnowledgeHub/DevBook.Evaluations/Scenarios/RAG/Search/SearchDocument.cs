namespace DevBook.Evaluations.Scenarios.RAG.Search;

public sealed record SearchDocument(
    string SourcePath,
    string? Heading = null,
    string? Snippet = null,
    int? Rank = null,
    double? Score = null);
