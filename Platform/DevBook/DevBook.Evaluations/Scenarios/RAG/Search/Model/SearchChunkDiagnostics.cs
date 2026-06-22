namespace DevBook.Evaluations.Scenarios.RAG.Search.Model;

/// <summary>
/// Aggregate diagnostics for retrieved chunks in one query.
/// </summary>
/// <param name="RetrievedChunkCount">Number of retrieved chunks inspected.</param>
/// <param name="UniqueSourceCount">Number of distinct source paths in retrieved chunks.</param>
/// <param name="DuplicateSourceCount">Number of retrieved source paths repeated at least once.</param>
/// <param name="AverageRetrievedChunkLength">Average retrieved chunk text length in characters.</param>
/// <param name="EvidenceCoverage">Share of expected evidence matched by retrieved chunks.</param>
/// <param name="RelevantRetrievedCount">Number of retrieved chunks credited as relevant.</param>
public sealed record SearchChunkDiagnostics(
    int RetrievedChunkCount,
    int UniqueSourceCount,
    int DuplicateSourceCount,
    double AverageRetrievedChunkLength,
    double EvidenceCoverage,
    int RelevantRetrievedCount);

