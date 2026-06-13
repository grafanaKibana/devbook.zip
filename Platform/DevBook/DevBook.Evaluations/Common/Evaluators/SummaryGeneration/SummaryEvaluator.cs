namespace DevBook.Evaluations.Common.Evaluators.SummaryGeneration;

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
            : Math.Round(metric.Value, 2);

        return new NumericMetric(metric.Name, roundedValue, metric.Description)
        {
            Interpretation = new EvaluationMetricInterpretation(
                metric.Rating,
                failed: false,
                reason: $"Summary score {FormatNumber(roundedValue)} rated {metric.Rating}."),
        };
    }

    private static string FormatNumber(double value)
        => value.ToString("0.00", CultureInfo.InvariantCulture);
}

/// <summary>
/// Aggregate metric written to the evaluation report.
/// </summary>
/// <param name="Name">Metric name shown in the report.</param>
/// <param name="Value">Numeric metric value.</param>
/// <param name="Description">Report-facing metric description.</param>
/// <param name="Kind">Metric formatting kind.</param>
/// <param name="Rating">Interpretation rating for the metric.</param>
public sealed record SummaryMetric(
    string Name,
    double Value,
    string Description,
    SummaryMetricKind Kind = SummaryMetricKind.PlainNumber,
    EvaluationRating Rating = EvaluationRating.Unknown);

/// <summary>
/// Selects how a summary metric value should be rounded and displayed in reports.
/// </summary>
public enum SummaryMetricKind
{
    /// <summary>
    /// Whole-number metric such as evaluated sample count.
    /// </summary>
    Count,

    /// <summary>
    /// Decimal metric shown as a plain number, such as an average score.
    /// </summary>
    PlainNumber,

    /// <summary>
    /// Fractional metric interpreted as a rate, such as recall or empty-result rate.
    /// </summary>
    Percentage,
}
