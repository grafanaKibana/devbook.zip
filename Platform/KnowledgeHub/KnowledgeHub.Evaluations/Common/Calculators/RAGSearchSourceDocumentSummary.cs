namespace KnowledgeHub.Evaluations.Common.Calculators;

public sealed record RAGSearchSourceDocumentSummary(
    string SourceDocument,
    int CaseCount,
    double AverageRecallAtK,
    double AveragePrecisionAtK,
    double AverageReciprocalRank,
    int EmptyResultCount);
