namespace DevBook.Evaluations.Common.Evaluation.Judging;

using DevBook.Evaluations.Common.Evaluation.Metrics;
using Microsoft.Extensions.AI.Evaluation;

/// <summary>
/// Scores one unit of work (<typeparamref name="TInput"/>) into a MEAI <see cref="EvaluationResult"/>.
/// The result <em>is</em> the report payload, so judges no longer return a bespoke "verdict" type that
/// mirrors <see cref="EvaluationMetric"/>. Bridge a judge into the MEAI evaluator pipeline with
/// <see cref="JudgeEvaluator{TInput, TContext}"/>; an LLM-as-judge can reuse <see cref="LlmJudge{TInput, TResult}"/>.
/// </summary>
/// <typeparam name="TInput">The unit being judged (e.g. an answer together with its case).</typeparam>
public interface IJudge<in TInput>
{
    /// <summary>The metric panel this judge reports, in report-display order.</summary>
    IReadOnlyList<MetricDescriptor> Metrics { get; }

    /// <summary>Scores a single input into an evaluation result.</summary>
    /// <param name="input">The unit to score.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    Task<EvaluationResult> JudgeAsync(TInput input, CancellationToken cancellationToken = default);
}