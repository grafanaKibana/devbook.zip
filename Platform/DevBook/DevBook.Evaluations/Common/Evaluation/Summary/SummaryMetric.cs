namespace DevBook.Evaluations.Common.Evaluation.Summary;

using Microsoft.Extensions.AI.Evaluation;

/// <summary>
/// Aggregate metric written to the evaluation report.
/// </summary>
/// <param name="Name">Metric name shown in the report.</param>
/// <param name="Value">Numeric metric value.</param>
/// <param name="Description">Report-facing metric description.</param>
/// <param name="Kind">Metric formatting kind.</param>
/// <param name="Rating">Interpretation rating for the metric.</param>
/// <param name="Diagnostics">Optional diagnostics attached to the emitted MEAI metric.</param>
public sealed record SummaryMetric(
    string Name,
    double Value,
    string Description,
    SummaryMetricKind Kind = SummaryMetricKind.PlainNumber,
    EvaluationRating Rating = EvaluationRating.Unknown,
    IReadOnlyList<EvaluationDiagnostic>? Diagnostics = null);
