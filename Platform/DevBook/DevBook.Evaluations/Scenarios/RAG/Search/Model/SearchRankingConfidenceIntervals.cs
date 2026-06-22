namespace DevBook.Evaluations.Scenarios.RAG.Search.Model;

/// <summary>
/// Confidence intervals for ranking metrics at one cutoff.
/// </summary>
/// <param name="Recall">Recall confidence interval.</param>
/// <param name="Precision">Precision confidence interval.</param>
/// <param name="HitRate">Hit-rate confidence interval.</param>
/// <param name="MeanReciprocalRank">Mean reciprocal rank confidence interval.</param>
/// <param name="MeanAveragePrecision">Mean average precision confidence interval.</param>
/// <param name="NormalizedDiscountedCumulativeGain">Normalized discounted cumulative gain confidence interval.</param>
public sealed record SearchRankingConfidenceIntervals(
    SearchConfidenceInterval Recall,
    SearchConfidenceInterval Precision,
    SearchConfidenceInterval HitRate,
    SearchConfidenceInterval MeanReciprocalRank,
    SearchConfidenceInterval MeanAveragePrecision,
    SearchConfidenceInterval NormalizedDiscountedCumulativeGain)
{
    /// <summary>
    /// Gets zero-width intervals used when no query metrics exist.
    /// </summary>
    public static SearchRankingConfidenceIntervals Empty { get; } = new(
        new SearchConfidenceInterval(0, 0),
        new SearchConfidenceInterval(0, 0),
        new SearchConfidenceInterval(0, 0),
        new SearchConfidenceInterval(0, 0),
        new SearchConfidenceInterval(0, 0),
        new SearchConfidenceInterval(0, 0));
}

