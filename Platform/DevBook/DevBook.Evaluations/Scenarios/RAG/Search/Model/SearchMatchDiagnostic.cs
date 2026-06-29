namespace DevBook.Evaluations.Scenarios.RAG.Search.Model;

/// <summary>
/// Diagnostic record explaining one retrieved chunk match decision.
/// </summary>
/// <param name="Rank">One-based retrieved rank.</param>
/// <param name="SourcePath">Retrieved source path.</param>
/// <param name="Heading">Retrieved heading metadata.</param>
/// <param name="Score">Retrieved or reranked score.</param>
/// <param name="MatchedExpectedSourcePath">Expected source path matched by this chunk, when any.</param>
/// <param name="MatchedExpectedHeading">Expected heading matched by this chunk, when any.</param>
/// <param name="SourcePathMatched">Whether the source path matched expected evidence.</param>
/// <param name="HeadingMatched">Whether the heading matched expected evidence.</param>
/// <param name="SnippetMatched">Whether the snippet matched expected evidence.</param>
/// <param name="IsRelevant">Whether the chunk received relevance credit.</param>
/// <param name="Reason">Human-readable explanation of the match decision.</param>
public sealed record SearchMatchDiagnostic(
    int Rank,
    string SourcePath,
    string? Heading,
    double? Score,
    string? MatchedExpectedSourcePath,
    string? MatchedExpectedHeading,
    bool SourcePathMatched,
    bool HeadingMatched,
    bool SnippetMatched,
    bool IsRelevant,
    string Reason);
