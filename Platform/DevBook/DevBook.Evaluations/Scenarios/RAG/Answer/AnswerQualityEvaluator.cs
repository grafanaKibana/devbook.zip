namespace DevBook.Evaluations.Scenarios.RAG.Answer;

using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;

/// <summary>
/// Maps the precomputed judge verdicts into MEAI metrics. The judge runs once in the test method and
/// its verdicts ride along on <see cref="AnswerCaseContext"/>, so this evaluator does not make a
/// second model call. Presentation hints, per-metric judge context and evaluator metadata are carried
/// on metric metadata so the report can render them generically.
/// </summary>
public sealed class AnswerQualityEvaluator(IReadOnlyList<AnswerMetricDefinition> metrics) : IEvaluator
{
    /// <inheritdoc />
    public IReadOnlyCollection<string> EvaluationMetricNames { get; } = metrics.Select(metric => metric.MetricName).ToArray();

    /// <inheritdoc />
    public ValueTask<EvaluationResult> EvaluateAsync(
        IEnumerable<ChatMessage> messages,
        ChatResponse modelResponse,
        ChatConfiguration? chatConfiguration = null,
        IEnumerable<EvaluationContext>? additionalContext = null,
        CancellationToken cancellationToken = default)
    {
        var context = additionalContext?.OfType<AnswerCaseContext>().FirstOrDefault();
        if (context is null)
        {
            return ValueTask.FromResult(new EvaluationResult(new NumericMetric("Faithfulness", 0, "AnswerCaseContext not provided.")
            {
                Interpretation = new EvaluationMetricInterpretation(EvaluationRating.Inconclusive, failed: true, reason: "AnswerCaseContext not provided."),
            }));
        }

        return ValueTask.FromResult(new EvaluationResult(context.Verdicts.Select(ToMetric)));
    }

    private static NumericMetric ToMetric(AnswerMetricVerdict verdict)
    {
        var metric = new NumericMetric(verdict.Definition.MetricName, verdict.Value, verdict.Definition.Description)
        {
            Interpretation = new EvaluationMetricInterpretation(verdict.Rating, failed: verdict.Failed, reason: verdict.Reason),
            Diagnostics = verdict.Diagnostics.ToArray(),
        };

        foreach (var (key, value) in verdict.Metadata)
        {
            metric.AddOrUpdateMetadata(key, value);
        }

        return metric;
    }
}