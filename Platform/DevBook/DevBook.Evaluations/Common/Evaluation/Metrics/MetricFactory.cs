namespace DevBook.Evaluations.Common.Evaluation.Metrics;

using Microsoft.Extensions.AI.Evaluation;

/// <summary>
/// Builds MEAI <see cref="NumericMetric"/> values from a <see cref="MetricDescriptor"/> plus a score,
/// applying the base <c>kind</c>/<c>group</c>/<c>better</c>/<c>short</c>/<c>info</c> metadata hints in one
/// place. This is the single seam judges and evaluators funnel through, so no scenario hand-rolls metric
/// metadata or a parallel "verdict" type that mirrors <see cref="EvaluationMetric"/>.
/// </summary>
public static class MetricFactory
{
    /// <summary>
    /// Builds a numeric metric for <paramref name="descriptor"/>, rounding by kind (counts to whole
    /// numbers, everything else to three places) and attaching the standard report metadata.
    /// </summary>
    /// <param name="metadata">Optional extra metadata merged verbatim onto the metric; the base hints are added automatically.</param>
    public static NumericMetric Numeric(
        MetricDescriptor descriptor,
        double value,
        EvaluationRating rating,
        bool failed,
        string reason,
        IEnumerable<EvaluationDiagnostic>? diagnostics = null,
        IReadOnlyDictionary<string, string>? metadata = null)
    {
        var rounded = descriptor.Kind == MetricKind.Count ? Math.Round(value, 0) : Math.Round(value, 3);
        var metric = new NumericMetric(descriptor.Name, rounded, descriptor.Description)
        {
            Interpretation = new EvaluationMetricInterpretation(rating, failed, reason),
            Diagnostics = diagnostics?.ToArray() ?? [],
        };

        metric.AddOrUpdateMetadata("kind", descriptor.Kind.ToString().ToLowerInvariant());
        metric.AddOrUpdateMetadata("group", descriptor.Group);
        metric.AddOrUpdateMetadata("better", descriptor.Better);
        if (descriptor.ShortName is { Length: > 0 } shortName)
        {
            metric.AddOrUpdateMetadata("short", shortName);
        }

        if (descriptor.Informational)
        {
            metric.AddOrUpdateMetadata("info", "true");
        }

        foreach (var (key, value2) in metadata ?? EmptyMetadata)
        {
            metric.AddOrUpdateMetadata(key, value2);
        }

        return metric;
    }

    /// <summary>
    /// Builds a metric from a numerator/denominator ratio, rated on the fraction scale. A zero
    /// denominator scores 0. Used by claim/point-grounded metrics so answer length cannot inflate them.
    /// </summary>
    public static NumericMetric Ratio(
        MetricDescriptor descriptor,
        int numerator,
        int denominator,
        string reason,
        IReadOnlyDictionary<string, string>? metadata = null)
    {
        var value = denominator == 0 ? 0 : (double)numerator / denominator;
        var rating = Ratings.ForFraction(value);
        return Numeric(descriptor, value, rating, Ratings.IsFailing(rating), reason, RatingDiagnostics(rating), metadata);
    }

    /// <summary>Builds an inconclusive (failed) metric — e.g. the judge returned nothing to score.</summary>
    public static NumericMetric Inconclusive(
        MetricDescriptor descriptor,
        string reason,
        IReadOnlyDictionary<string, string>? metadata = null)
        => Numeric(descriptor, 0, EvaluationRating.Inconclusive, failed: true, reason, [EvaluationDiagnostic.Error(reason)], metadata);

    /// <summary>
    /// The whole panel reported as inconclusive when the expected <see cref="EvaluationContext"/> is
    /// missing — returned by <see cref="JudgeEvaluator{TInput, TContext}"/> as a safety net.
    /// </summary>
    public static EvaluationResult MissingContext(IReadOnlyList<MetricDescriptor> metrics, string contextName)
    {
        var reason = $"{contextName} not provided.";
        return new EvaluationResult(metrics.Select(metric => Inconclusive(metric, reason)));
    }

    /// <summary>Standard diagnostics for a rating: an error at the failure floor, a warning just above it.</summary>
    public static IReadOnlyList<EvaluationDiagnostic> RatingDiagnostics(EvaluationRating rating) => rating switch
    {
        EvaluationRating.Unacceptable => [EvaluationDiagnostic.Error("Judge marked this metric below the failure threshold; gating this scenario.")],
        EvaluationRating.Poor => [EvaluationDiagnostic.Warning("Judge cited a missing or unsupported element.")],
        _ => [],
    };

    private static readonly IReadOnlyDictionary<string, string> EmptyMetadata = new Dictionary<string, string>();
}