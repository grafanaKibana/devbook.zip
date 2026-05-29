namespace KnowledgeHub.Evaluations.Common.Calculators;

public sealed record RAGSearchMatchDiagnostic(
    int Rank,
    string SourcePath,
    string? MatchedExpectedSourcePath,
    bool HeadingMatched,
    bool SnippetMatched,
    bool IsRelevant);
