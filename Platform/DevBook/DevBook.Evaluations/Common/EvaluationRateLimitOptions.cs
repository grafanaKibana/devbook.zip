namespace DevBook.Evaluations.Common;

public sealed class EvaluationRateLimitOptions
{
    public int MaxRetryAttempts { get; init; } = 5;
}
