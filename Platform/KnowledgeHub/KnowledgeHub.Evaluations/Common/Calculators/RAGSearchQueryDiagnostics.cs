namespace KnowledgeHub.Evaluations.Common.Calculators;

public sealed record RAGSearchQueryDiagnostics(
    int RetrievedCount,
    int UniqueRetrievedCount,
    int ExpectedCount,
    IReadOnlyList<string> MissingExpectedSourcePaths,
    IReadOnlyList<string> DuplicateRetrievedSourcePaths,
    IReadOnlyList<RAGSearchMatchDiagnostic> Matches);
