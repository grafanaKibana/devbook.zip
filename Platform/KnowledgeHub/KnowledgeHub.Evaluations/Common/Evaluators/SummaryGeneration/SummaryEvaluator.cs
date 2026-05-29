namespace KnowledgeHub.Evaluations.Common.Evaluators.SummaryGeneration;

using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;

public sealed class SummaryEvaluator(IEnumerable<SummaryMetric> metrics) : IEvaluator
{
    private readonly List<SummaryMetric> metricsList = metrics.ToList();

    public IReadOnlyCollection<string> EvaluationMetricNames => metricsList.Select(metric => metric.Name).ToArray();

    public ValueTask<EvaluationResult> EvaluateAsync(
        IEnumerable<ChatMessage> messages,
        ChatResponse modelResponse,
        ChatConfiguration? chatConfiguration = null,
        IEnumerable<EvaluationContext>? additionalContext = null,
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult(new EvaluationResult(metricsList.Select(CreateMetric)));
    }

    private static NumericMetric CreateMetric(SummaryMetric metric)
    {
        var roundedValue = metric.Kind == SummaryMetricKind.Count
            ? Math.Round(metric.Value, 0)
            : Math.Round(metric.Value, 3);

        return new NumericMetric(metric.Name, roundedValue, metric.Description)
        {
            Interpretation = new EvaluationMetricInterpretation(
                EvaluationRating.Unknown,
                failed: false,
                reason: metric.Description),
        };
    }
}

public sealed record SummaryMetric(
    string Name,
    double Value,
    string Description,
    SummaryMetricKind Kind = SummaryMetricKind.PlainNumber);

public enum SummaryMetricKind
{
    Count,
    PlainNumber,
    Percentage,
}
