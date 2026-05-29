namespace KnowledgeHub.Evaluations.Common.Evaluators.RAGSearch;

using KnowledgeHub.Evaluations.Common.Calculators;
using KnowledgeHub.Evaluations.Common.Evaluators.SummaryGeneration;
using KnowledgeHub.Evaluations.Scenarios.RAGSearch;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;

public sealed class RAGSearchEvaluator : IEvaluator
{
    private const string RecallAtKMetricName = "RecallAtK";
    private const string PrecisionAtKMetricName = "PrecisionAtK";
    private const string ReciprocalRankMetricName = "ReciprocalRank";

    public IReadOnlyCollection<string> EvaluationMetricNames { get; } =
    [
        RecallAtKMetricName,
        PrecisionAtKMetricName,
        ReciprocalRankMetricName,
    ];

    public ValueTask<EvaluationResult> EvaluateAsync(
        IEnumerable<ChatMessage> messages,
        ChatResponse modelResponse,
        ChatConfiguration? chatConfiguration = null,
        IEnumerable<EvaluationContext>? additionalContext = null,
        CancellationToken cancellationToken = default)
    {
        var context = additionalContext?.OfType<RAGSearchEvaluationContext>().FirstOrDefault();
        if (context is null)
        {
            return ValueTask.FromResult(new EvaluationResult(CreateFailedMetric(RecallAtKMetricName, "RAGSearchEvaluationContext not provided.")));
        }

        var metrics = RAGSearchMetricCalculator.ScoreQuery(context.Prediction, context.TopK);

        return ValueTask.FromResult(new EvaluationResult([
            CreateMetric(RecallAtKMetricName, metrics.RecallAtK, "Relevant expected sources retrieved in top-k results.", metrics),
            CreateMetric(PrecisionAtKMetricName, metrics.PrecisionAtK, "Retrieved top-k sources that were relevant.", metrics),
            CreateMetric(ReciprocalRankMetricName, metrics.ReciprocalRank, "Reciprocal rank of the first relevant source.", metrics),
        ]));
    }

    public static Dictionary<string, IEnumerable<SummaryMetric>> ComputeSummaryMetrics(
        IReadOnlyList<RAGSearchPrediction> predictions,
        int topK)
    {
        var report = RAGSearchMetricCalculator.Evaluate(predictions, topK);

        return new Dictionary<string, IEnumerable<SummaryMetric>>
        {
            ["Overall"] =
            [
                new SummaryMetric("SampleCount", report.Queries.Count, "Total RAG search cases evaluated.", SummaryMetricKind.Count),
                new SummaryMetric(RecallAtKMetricName, report.RecallAtK, "Average Recall@k across all RAG search cases.", SummaryMetricKind.Percentage),
                new SummaryMetric(PrecisionAtKMetricName, report.PrecisionAtK, "Average Precision@k across all RAG search cases.", SummaryMetricKind.Percentage),
                new SummaryMetric(ReciprocalRankMetricName, report.MeanReciprocalRank, "Mean reciprocal rank across all RAG search cases.", SummaryMetricKind.PlainNumber),
                new SummaryMetric("EmptyResultRate", report.EmptyResultRate, "Share of RAG search cases with no retrieved chunks.", SummaryMetricKind.Percentage),
            ]
        };
    }

    private static NumericMetric CreateMetric(string name, double value, string description, RAGSearchQueryMetrics metrics)
    {
        var failed = name == RecallAtKMetricName && value < 1;
        var metric = new NumericMetric(name, value, description)
        {
            Interpretation = new EvaluationMetricInterpretation(
                failed ? EvaluationRating.Unacceptable : EvaluationRating.Unknown,
                failed: failed,
                reason: metrics.FailureReason ?? $"{name}: {value:0.###}"),
        };

        metric.AddDiagnostics(EvaluationDiagnostic.Informational($"Expected: {string.Join(", ", metrics.ExpectedSourceDocuments)}"));
        metric.AddDiagnostics(EvaluationDiagnostic.Informational($"Retrieved: {string.Join(", ", metrics.RetrievedSourceDocuments)}"));

        return metric;
    }

    private static NumericMetric CreateFailedMetric(string name, string reason)
        => new(name, 0, reason)
        {
            Interpretation = new EvaluationMetricInterpretation(
                EvaluationRating.Inconclusive,
                failed: true,
                reason: reason),
        };
}
