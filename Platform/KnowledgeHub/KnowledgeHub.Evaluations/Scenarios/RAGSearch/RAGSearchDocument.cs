namespace KnowledgeHub.Evaluations.Scenarios.RAGSearch;

public sealed record RAGSearchDocument(
    string SourcePath,
    string? Heading = null,
    string? Snippet = null);
