namespace KnowledgeHub.Evaluations.Common.Calculators;

public sealed record RAGSearchExpectedDiagnostic(
    int Index,
    string SourcePath,
    string? Heading,
    string? SnippetPreview,
    bool Matched);
