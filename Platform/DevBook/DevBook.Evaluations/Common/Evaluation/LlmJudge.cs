namespace DevBook.Evaluations.Common.Evaluation;

using System.Diagnostics;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;

/// <summary>
/// Reusable base for an LLM-as-judge: one structured-output model call per input, decomposed into the
/// scenario's metric panel. It owns the request/response plumbing — schema-bound structured output via
/// <c>GetResponseAsync&lt;TResult&gt;</c> (MEAI generates the JSON schema from <typeparamref name="TResult"/>
/// and deserialises for us), elapsed timing, and a parse-failure guard — so a concrete judge supplies
/// only the system prompt, the user payload, and the per-metric scoring. Wrap the supplied
/// <paramref name="judgeClient"/> with <see cref="RateLimitingChatClient"/> so the judge can run as a
/// plain MEAI <see cref="IEvaluator"/> (via <see cref="JudgeEvaluator{TInput, TContext}"/>) without a
/// test-body retry wrapper.
/// </summary>
/// <typeparam name="TInput">The unit being judged.</typeparam>
/// <typeparam name="TResult">The structured judge output MEAI deserialises the response into.</typeparam>
/// <param name="judgeClient">Chat client used for the judge model.</param>
/// <param name="judgeModelId">Judge model id, surfaced as <c>meta:judge</c> in the report.</param>
/// <param name="metrics">The metric panel to score.</param>
public abstract class LlmJudge<TInput, TResult>(
    IChatClient judgeClient,
    string judgeModelId,
    IReadOnlyList<MetricDescriptor> metrics) : IJudge<TInput>
    where TResult : class
{
    /// <inheritdoc />
    public IReadOnlyList<MetricDescriptor> Metrics => metrics;

    /// <summary>The judge model id, surfaced as <c>meta:judge</c> in the report.</summary>
    protected string JudgeModelId => judgeModelId;

    /// <inheritdoc />
    public async Task<EvaluationResult> JudgeAsync(TInput input, CancellationToken cancellationToken = default)
    {
        var (result, error, elapsedMs) = await CallJudgeAsync(input, cancellationToken);
        return new EvaluationResult(Metrics.Select(metric => Score(metric, input, result, error, elapsedMs)));
    }

    /// <summary>The judge system prompt (the rubric); constant per judge.</summary>
    protected abstract string SystemPrompt { get; }

    /// <summary>Renders the user payload (question / sources / answer / …) for one input.</summary>
    protected abstract string BuildPayload(TInput input);

    /// <summary>
    /// Scores one metric from the judge result. <paramref name="result"/> is null when the model call
    /// did not produce a parseable structured result (see <paramref name="judgeError"/>); deterministic
    /// metrics that need no model output can ignore it.
    /// </summary>
    protected abstract NumericMetric Score(MetricDescriptor metric, TInput input, TResult? result, string? judgeError, long elapsedMs);

    private async Task<(TResult? Result, string? Error, long ElapsedMs)> CallJudgeAsync(TInput input, CancellationToken cancellationToken)
    {
        var messages = new List<ChatMessage>
        {
            new(ChatRole.System, SystemPrompt),
            new(ChatRole.User, BuildPayload(input)),
        };

        // Transport faults (e.g. 429) propagate so the chat client's rate-limit retry handles them; an
        // unparseable result is surfaced per metric (via judgeError) rather than throwing.
        var stopwatch = Stopwatch.StartNew();
        var response = await judgeClient.GetResponseAsync<TResult>(messages, cancellationToken: cancellationToken);
        stopwatch.Stop();

        return response.TryGetResult(out var result) && result is not null
            ? (result, null, stopwatch.ElapsedMilliseconds)
            : (null, "Judge did not return a parseable structured result.", stopwatch.ElapsedMilliseconds);
    }
}
