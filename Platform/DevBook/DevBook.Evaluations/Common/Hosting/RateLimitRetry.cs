namespace DevBook.Evaluations.Common.Hosting;

using System.ClientModel;
using System.ClientModel.Primitives;
using System.Globalization;

/// <summary>
/// Retries OpenAI 429 (rate-limit) responses, honouring the <c>x-ratelimit-reset-requests</c> and
/// <c>x-ratelimit-reset-tokens</c> headers. This is the one place the retry policy lives; both the
/// test-body wrapper (<c>EvaluationTestBase.RunLiveLlmEvaluationAsync</c>, still used by RAG.Search) and
/// the <see cref="RateLimitingChatClient"/> middleware delegate here, so an LLM-as-judge can run inside
/// the MEAI evaluator pipeline without its own retry loop.
/// </summary>
public static class RateLimitRetry
{
    private static readonly TimeSpan DelayBuffer = TimeSpan.FromSeconds(5);

    /// <summary>Runs <paramref name="operation"/>, retrying on rate-limit responses.</summary>
    public static async Task ExecuteAsync(Func<Task> operation, EvaluationRateLimitOptions options, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(operation);
        await ExecuteAsync(
            async () =>
            {
                await operation();
                return true;
            },
            options,
            cancellationToken);
    }

    /// <summary>Runs <paramref name="operation"/> and returns its result, retrying on rate-limit responses.</summary>
    public static async Task<T> ExecuteAsync<T>(Func<Task<T>> operation, EvaluationRateLimitOptions options, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(operation);
        ArgumentNullException.ThrowIfNull(options);

        for (var attempt = 1; ; attempt++)
        {
            try
            {
                return await operation();
            }
            catch (ClientResultException exception) when (exception.Status == 429 && attempt <= options.MaxRetryAttempts)
            {
                var retryDelay = GetRateLimitDelay(exception, out var requestResetDelay, out var tokenResetDelay);
                await TestContext.Progress.WriteLineAsync(
                    $"OpenAI evaluation rate limit hit. Retry {attempt}/{options.MaxRetryAttempts} in {retryDelay.TotalSeconds:F1}s. x-ratelimit-reset-requests={FormatDelay(requestResetDelay)}; x-ratelimit-reset-tokens={FormatDelay(tokenResetDelay)}.");
                await Task.Delay(retryDelay, cancellationToken);
            }
        }
    }

    private static TimeSpan GetRateLimitDelay(ClientResultException exception, out TimeSpan? requestResetDelay, out TimeSpan? tokenResetDelay)
    {
        var response = exception.GetRawResponse();
        requestResetDelay = TryGetHeaderDelay(response, "x-ratelimit-reset-requests");
        tokenResetDelay = TryGetHeaderDelay(response, "x-ratelimit-reset-tokens");

        var delay = Max(requestResetDelay, tokenResetDelay) ?? TimeSpan.Zero;

        return delay + DelayBuffer;
    }

    private static TimeSpan? TryGetHeaderDelay(PipelineResponse? response, string header)
    {
        if (response?.Headers.TryGetValue(header, out var value) == true
            && value is not null
            && TryParseResetDelay(value, out var parsedDelay))
        {
            return parsedDelay;
        }

        return null;
    }

    private static TimeSpan? Max(TimeSpan? first, TimeSpan? second) => first > second ? first : second ?? first;

    private static string FormatDelay(TimeSpan? delay) => delay is null ? "missing" : $"{delay.Value.TotalSeconds:F1}s";

    private static bool TryParseResetDelay(string value, out TimeSpan delay)
    {
        delay = TimeSpan.Zero;

        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var remaining = value.AsSpan().Trim();
        var parsedAny = false;

        while (!remaining.IsEmpty)
        {
            var numberLength = 0;
            while (numberLength < remaining.Length && (char.IsDigit(remaining[numberLength]) || remaining[numberLength] == '.'))
            {
                numberLength++;
            }

            if (numberLength == 0 || !double.TryParse(remaining[..numberLength], NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var amount))
            {
                return false;
            }

            remaining = remaining[numberLength..];

            if (remaining.StartsWith("ms", StringComparison.OrdinalIgnoreCase))
            {
                delay += TimeSpan.FromMilliseconds(amount);
                remaining = remaining[2..];
            }
            else if (remaining.StartsWith("s", StringComparison.OrdinalIgnoreCase))
            {
                delay += TimeSpan.FromSeconds(amount);
                remaining = remaining[1..];
            }
            else if (remaining.StartsWith("m", StringComparison.OrdinalIgnoreCase))
            {
                delay += TimeSpan.FromMinutes(amount);
                remaining = remaining[1..];
            }
            else
            {
                return false;
            }

            parsedAny = true;
            remaining = remaining.TrimStart();
        }

        return parsedAny;
    }
}
