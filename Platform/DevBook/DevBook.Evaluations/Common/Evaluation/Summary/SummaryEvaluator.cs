namespace DevBook.Evaluations.Common.Evaluation.Summary;

using System.Globalization;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;

/// <summary>
/// Evaluates summary results.
/// </summary>
/// <param name="metrics">Summary metrics to expose.</param>
public sealed class SummaryEvaluator(IEnumerable<SummaryMetric> metrics) : IEvaluator
{
    private readonly List<SummaryMetric> metricsList = metrics.ToList();

    /// <summary>
    /// Gets evaluation metric names.
    /// </summary>
    public IReadOnlyCollection<string> EvaluationMetricNames => metricsList.Select(metric => metric.Name).ToArray();

    /// <summary>
    /// Emits the configured summary metrics into an evaluation result.
    /// </summary>
    /// <param name="messages">Messages associated with the summary evaluation.</param>
    /// <param name="modelResponse">Model response associated with the summary evaluation.</param>
    /// <param name="chatConfiguration">Optional chat configuration for the evaluation.</param>
    /// <param name="additionalContext">Optional evaluation context values.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    /// <returns>The evaluation result produced by the operation.</returns>
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
            Diagnostics = metric.Diagnostics?.ToArray() ?? [],
            Interpretation = new EvaluationMetricInterpretation(
                metric.Rating,
                failed: false,
                reason: $"Summary score {FormatNumber(roundedValue)} rated {metric.Rating}."),
        };
    }

    private static string FormatNumber(double value)
        => value.ToString("0.000", CultureInfo.InvariantCulture);
}
