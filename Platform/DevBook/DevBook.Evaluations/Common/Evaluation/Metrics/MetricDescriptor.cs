namespace DevBook.Evaluations.Common.Evaluation.Metrics;

/// <summary>
/// Declares one metric once: its identity plus the presentation hints carried into report metadata
/// (kind / group / better / short / info). Shared by every judged scenario — this replaces
/// <c>AnswerMetricDefinition</c> and <c>AgentMetricDefinition</c>. A scenario's metric panel is just an
/// <c>IReadOnlyList&lt;MetricDescriptor&gt;</c>, and a metric value is produced by handing a descriptor
/// to <see cref="MetricFactory"/>.
/// </summary>
/// <param name="Name">Metric name shown in the report and used as the MEAI metric key.</param>
/// <param name="Group">Report grouping label (e.g. "Grounding", "Quality", "Stats").</param>
/// <param name="Kind">How the value is read and formatted.</param>
/// <param name="Better">Direction hint surfaced to the report: "high", "low" or "none".</param>
/// <param name="Informational">True for metrics with no pass/fail interpretation (counts, diagnostics-only).</param>
/// <param name="Description">Report-facing description of what the metric measures.</param>
/// <param name="ShortName">Optional abbreviated label for compact report columns.</param>
public sealed record MetricDescriptor(
    string Name,
    string Group,
    MetricKind Kind,
    string Better,
    bool Informational,
    string Description,
    string? ShortName = null);