namespace DevBook.Evaluations.Scenarios.RAG.Search.Model;

/// <summary>
/// Diagnostic details explaining how one query was scored.
/// </summary>
/// <param name="RetrievedCount">Number of retrieved chunks considered for scoring.</param>
/// <param name="ExpectedCount">Number of expected source documents for the query.</param>
/// <param name="ExpectedDocuments">Expected evidence and whether each item was matched.</param>
/// <param name="MissingExpectedSourcePaths">Expected source paths not matched by retrieved chunks.</param>
/// <param name="DuplicateRetrievedSourcePaths">Retrieved source paths that appeared more than once.</param>
/// <param name="ChunkDiagnostics">Aggregate diagnostics about retrieved chunks.</param>
/// <param name="Matches">Per-rank match diagnostics for retrieved chunks.</param>
public sealed record SearchQueryDiagnostics(
    int RetrievedCount,
    int ExpectedCount,
    IReadOnlyList<SearchExpectedDiagnostic> ExpectedDocuments,
    IReadOnlyList<string> MissingExpectedSourcePaths,
    IReadOnlyList<string> DuplicateRetrievedSourcePaths,
    SearchChunkDiagnostics ChunkDiagnostics,
    IReadOnlyList<SearchMatchDiagnostic> Matches);

