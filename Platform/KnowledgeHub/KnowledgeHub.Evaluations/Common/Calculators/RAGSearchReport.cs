namespace KnowledgeHub.Evaluations.Common.Calculators;

public sealed record RAGSearchReport(
    int TopK,
    double RecallAtK,
    double PrecisionAtK,
    double MeanReciprocalRank,
    double EmptyResultRate,
    IReadOnlyList<RAGSearchSourceDocumentSummary> SourceDocuments,
    IReadOnlyList<RAGSearchQueryMetrics> Queries);
