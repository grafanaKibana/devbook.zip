namespace DevBook.Evaluations.Scenarios.RAG.Search.Model;

/// <summary>
/// Metrics calculated at R, where R is the expected evidence count for the query.
/// </summary>
/// <param name="RecallAtR">Matched expected evidence within top-R divided by expected evidence.</param>
/// <param name="RPrecision">Relevant retrieved chunks within top-R divided by R.</param>
/// <param name="ExpectedCount">Expected evidence count used as R.</param>
/// <param name="MatchedAtR">Expected evidence matched within top-R.</param>
public sealed record SearchRBasedMetrics(
    double RecallAtR,
    double RPrecision,
    int ExpectedCount,
    int MatchedAtR)
{
    /// <summary>
    /// Gets empty R-based metrics.
    /// </summary>
    public static SearchRBasedMetrics Empty { get; } = new(0, 0, 0, 0);
}

