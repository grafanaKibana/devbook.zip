namespace DevBook.Evaluations.Common.Evaluation;

using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;

/// <summary>
/// Adapts an <see cref="IJudge{TInput}"/> into the MEAI <see cref="IEvaluator"/> pipeline. It pulls the
/// scenario's <typeparamref name="TContext"/> off the evaluation call's additional context, projects it
/// (with the model response) into the judge's input via <paramref name="toInput"/>, and returns the
/// judge's result directly. This one generic class replaces the per-scenario <c>*QualityEvaluator</c>
/// copies: there is no precomputation and no verdict-replay — the judge runs inside
/// <see cref="EvaluateAsync"/>, and any rate-limit retry lives in the judge's chat client.
/// </summary>
/// <typeparam name="TInput">The judge's input type.</typeparam>
/// <typeparam name="TContext">The evaluation context carrying the scenario case.</typeparam>
/// <param name="judge">The judge invoked for each evaluation.</param>
/// <param name="toInput">Projects the context and model response into the judge's input.</param>
public sealed class JudgeEvaluator<TInput, TContext>(
    IJudge<TInput> judge,
    Func<TContext, ChatResponse, TInput> toInput) : IEvaluator
    where TContext : EvaluationContext
{
    /// <inheritdoc />
    public IReadOnlyCollection<string> EvaluationMetricNames { get; } = judge.Metrics.Select(metric => metric.Name).ToArray();

    /// <inheritdoc />
    public async ValueTask<EvaluationResult> EvaluateAsync(
        IEnumerable<ChatMessage> messages,
        ChatResponse modelResponse,
        ChatConfiguration? chatConfiguration = null,
        IEnumerable<EvaluationContext>? additionalContext = null,
        CancellationToken cancellationToken = default)
    {
        var context = additionalContext?.OfType<TContext>().FirstOrDefault();
        return context is null
            ? MetricFactory.MissingContext(judge.Metrics, typeof(TContext).Name)
            : await judge.JudgeAsync(toInput(context, modelResponse), cancellationToken);
    }
}
