namespace DevBook.Evaluations.Scenarios.RAG.Search.Model;

/// <summary>
/// Aggregate retrieval-quality report for a set of search predictions.
/// </summary>
/// <param name="QueryCount">Number of queries included in the report.</param>
/// <param name="RankingMetrics">Ranking summaries keyed by rank cutoff.</param>
/// <param name="RBasedMetrics">Aggregate metrics calculated at R, where R is the expected evidence count.</param>
/// <param name="SectionMetrics">Aggregate source or section-level metrics.</param>
/// <param name="EmptyResultRate">Fraction of queries that returned no chunks.</param>
/// <param name="ScoreAverage">Average score across all scored retrieved chunks.</param>
/// <param name="CreditedScoreAverage">Average score for chunks credited against expected evidence.</param>
/// <param name="UncreditedScoreAverage">Average score for retrieved chunks not credited by the expected-evidence set.</param>
/// <param name="CreditedToUncreditedSameSourceScoreGap">Score gap between credited chunks and higher-scored uncredited chunks from the same source.</param>
public sealed record SearchReport(
    int QueryCount,
    IReadOnlyDictionary<int, SearchRankingSummary> RankingMetrics,
    SearchRBasedMetrics RBasedMetrics,
    SearchSectionMetrics SectionMetrics,
    double EmptyResultRate,
    double ScoreAverage,
    double CreditedScoreAverage,
    double UncreditedScoreAverage,
    double CreditedToUncreditedSameSourceScoreGap)
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
    /// Gets mean reciprocal rank at the primary rank cutoff.
    /// </summary>
    public double MeanReciprocalRank => this.RankingMetrics[SearchMetricCalculator.PrimaryCutoffValue].MeanReciprocalRank;
}

