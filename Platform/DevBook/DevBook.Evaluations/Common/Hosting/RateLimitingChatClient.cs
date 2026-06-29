namespace DevBook.Evaluations.Common.Hosting;

using Microsoft.Extensions.AI;

/// <summary>
/// A chat-client middleware that retries OpenAI 429 responses via <see cref="RateLimitRetry"/>. Wrapping
/// the judge's (and answer agent's) chat client with this moves retry out of the test body, which is
/// what lets an LLM-as-judge run as a plain MEAI <c>IEvaluator</c> inside the reporting pipeline rather
/// than being precomputed. Only the non-streaming path is wrapped — the evaluation scenarios use
/// <c>GetResponseAsync</c> (the judge's structured-output call and the agent's <c>RunAsync</c>).
/// </summary>
/// <param name="innerClient">The chat client being wrapped.</param>
/// <param name="rateLimitOptions">Retry budget and policy.</param>
public sealed class RateLimitingChatClient(IChatClient innerClient, EvaluationRateLimitOptions rateLimitOptions)
    : DelegatingChatClient(innerClient)
{
    /// <inheritdoc />
    public override Task<ChatResponse> GetResponseAsync(
        IEnumerable<ChatMessage> messages,
        ChatOptions? options = null,
        CancellationToken cancellationToken = default)
        => RateLimitRetry.ExecuteAsync(
            () => base.GetResponseAsync(messages, options, cancellationToken),
            rateLimitOptions,
            cancellationToken);
}
