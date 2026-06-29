namespace DevBook.Evaluations.Scenarios.RAG.Search.Model;

/// <summary>
/// Mean ranking metrics and bootstrap confidence intervals for one cutoff.
/// </summary>
/// <param name="Recall">Mean recall across queries.</param>
/// <param name="Precision">Mean precision across queries.</param>
/// <param name="HitRate">Mean hit rate across queries.</param>
/// <param name="MeanReciprocalRank">Mean reciprocal rank across queries.</param>
/// <param name="MeanAveragePrecision">Mean average precision across queries.</param>
/// <param name="NormalizedDiscountedCumulativeGain">Mean normalized discounted cumulative gain across queries.</param>
/// <param name="ConfidenceIntervals">Bootstrap confidence intervals for the mean metrics.</param>
public sealed record SearchRankingSummary(
    double Recall,
    double Precision,
    double HitRate,
    double MeanReciprocalRank,
    double MeanAveragePrecision,
    double NormalizedDiscountedCumulativeGain,
    SearchRankingConfidenceIntervals ConfidenceIntervals);

