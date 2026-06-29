namespace DevBook.Evaluations.Scenarios.RAG.Search.Model;

/// <summary>
/// Ranking metrics calculated at one cutoff.
/// </summary>
/// <param name="Recall">Matched expected evidence divided by expected evidence.</param>
/// <param name="Precision">Relevant retrieved chunks divided by retrieved chunks at the cutoff.</param>
/// <param name="HitRate">Whether at least one relevant chunk appears at the cutoff.</param>
/// <param name="MeanReciprocalRank">Reciprocal rank of the first relevant chunk.</param>
/// <param name="MeanAveragePrecision">Average precision over relevant chunks at the cutoff.</param>
/// <param name="NormalizedDiscountedCumulativeGain">Discounted ranking quality normalized against the ideal ordering.</param>
public sealed record SearchRankingMetrics(
    double Recall,
    double Precision,
    double HitRate,
    double MeanReciprocalRank,
    double MeanAveragePrecision,
    double NormalizedDiscountedCumulativeGain);

