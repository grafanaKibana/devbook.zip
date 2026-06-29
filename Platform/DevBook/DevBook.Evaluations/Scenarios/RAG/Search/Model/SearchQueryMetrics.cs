namespace DevBook.Evaluations.Scenarios.RAG.Search.Model;

/// <summary>
/// Retrieval metrics and diagnostics for one search query.
/// </summary>
/// <param name="RankingMetrics">Ranking metrics keyed by rank cutoff.</param>
/// <param name="IsEmptyResult">Whether the query returned no chunks.</param>
/// <param name="RBasedMetrics">Metrics calculated at R, where R is the expected evidence count.</param>
/// <param name="SectionMetrics">Source or section-level metrics.</param>
/// <param name="ScoreAverage">Average score across scored retrieved chunks.</param>
/// <param name="CreditedScoreAverage">Average score for chunks credited against expected evidence.</param>
/// <param name="UncreditedScoreAverage">Average score for chunks not credited by expected evidence.</param>
/// <param name="CreditedToUncreditedSameSourceScoreGap">Score gap between credited and uncredited same-source chunks.</param>
/// <param name="Diagnostics">Diagnostics explaining expected, missing, duplicate, and matched evidence.</param>
public sealed record SearchQueryMetrics(
    IReadOnlyDictionary<int, SearchRankingMetrics> RankingMetrics,
    bool IsEmptyResult,
    SearchRBasedMetrics RBasedMetrics,
    SearchSectionMetrics SectionMetrics,
    double? ScoreAverage,
    double? CreditedScoreAverage,
    double? UncreditedScoreAverage,
    double? CreditedToUncreditedSameSourceScoreGap,
    SearchQueryDiagnostics Diagnostics)
{
    /// <summary>
    /// Gets recall at the primary rank cutoff.
    /// </summary>
    public double RecallAtK => this.RankingMetrics[SearchMetricCalculator.PrimaryCutoffValue].Recall;

    /// <summary>
    /// Gets precision at the primary rank cutoff.
    /// </summary>
    public double PrecisionAtK => this.RankingMetrics[SearchMetricCalculator.PrimaryCutoffValue].Precision;

    /// <summary>
    /// Gets hit rate at the primary rank cutoff.
    /// </summary>
    public double HitRateAtK => this.RankingMetrics[SearchMetricCalculator.PrimaryCutoffValue].HitRate;

    /// <summary>
    /// Gets reciprocal rank at the primary rank cutoff.
    /// </summary>
    public double ReciprocalRank => this.RankingMetrics[SearchMetricCalculator.PrimaryCutoffValue].MeanReciprocalRank;
}

