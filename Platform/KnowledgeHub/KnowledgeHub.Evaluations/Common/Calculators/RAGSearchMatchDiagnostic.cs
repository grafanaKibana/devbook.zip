namespace KnowledgeHub.Evaluations.Common.Calculators;

public sealed record RAGSearchMatchDiagnostic(
    int Rank,
    string SourcePath,
    string? Heading,
    string? SnippetPreview,
    string? MatchedExpectedSourcePath,
    string? MatchedExpectedHeading,
    string? MatchedExpectedSnippetPreview,
    bool SourcePathMatched,
    bool HeadingMatched,
    bool SnippetMatched,
    bool IsRelevant,
    string Reason);
