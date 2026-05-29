namespace KnowledgeHub.Evaluations.Common.Calculators;

public sealed record RAGSearchQueryMetrics(
    string CaseId,
    string Query,
    IReadOnlyList<string> ExpectedSourceDocuments,
    IReadOnlyList<string> RetrievedSourceDocuments,
    double RecallAtK,
    double PrecisionAtK,
    double ReciprocalRank,
    bool IsEmptyResult,
    string? FailureReason,
    RAGSearchQueryDiagnostics Diagnostics);
