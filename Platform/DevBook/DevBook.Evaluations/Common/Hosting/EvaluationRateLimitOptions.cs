namespace DevBook.Evaluations.Common.Hosting;

public sealed class EvaluationRateLimitOptions
{
    public int MaxRetryAttempts { get; init; } = 5;
}
