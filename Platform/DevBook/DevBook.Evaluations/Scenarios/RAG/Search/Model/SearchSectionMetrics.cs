namespace DevBook.Evaluations.Scenarios.RAG.Search.Model;

/// <summary>
/// Source or section-level metrics after deduplicating expected evidence by section.
/// </summary>
/// <param name="RecallAtR">Matched expected sections within top-R divided by expected sections.</param>
/// <param name="RPrecision">Relevant retrieved sections within top-R divided by R.</param>
/// <param name="HitRateAt1">Whether the first result matched an expected section.</param>
/// <param name="MeanReciprocalRankAtK">Reciprocal rank of the first matching section within the fixed ranking cutoff.</param>
/// <param name="MeanAveragePrecisionAtK">Average precision over matching sections within the fixed ranking cutoff.</param>
/// <param name="NormalizedDiscountedCumulativeGainAtK">Discounted section ranking quality within the fixed ranking cutoff.</param>
/// <param name="ExpectedSectionCount">Expected section count used as R.</param>
/// <param name="MatchedSectionsAtR">Expected sections matched within top-R.</param>
public sealed record SearchSectionMetrics(
    double RecallAtR,
    double RPrecision,
    double HitRateAt1,
    double MeanReciprocalRankAtK,
    double MeanAveragePrecisionAtK,
    double NormalizedDiscountedCumulativeGainAtK,
    int ExpectedSectionCount,
    int MatchedSectionsAtR)
{
    /// <summary>
    /// Gets empty section-level metrics.
    /// </summary>
    public static SearchSectionMetrics Empty { get; } = new(0, 0, 0, 0, 0, 0, 0, 0);
}

