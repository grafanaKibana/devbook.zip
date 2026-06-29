namespace DevBook.Evaluations.Scenarios.RAG.Search.Model;

/// <summary>
/// Score statistics for retrieved chunks.
/// </summary>
/// <param name="ScoreAverage">Average score across scored retrieved chunks.</param>
/// <param name="CreditedScoreAverage">Average score for chunks credited against expected evidence.</param>
/// <param name="UncreditedScoreAverage">Average score for chunks not credited by expected evidence.</param>
/// <param name="CreditedToUncreditedSameSourceScoreGap">Score gap between credited and uncredited same-source chunks.</param>
public sealed record SearchScoreMetrics(
    double? ScoreAverage,
    double? CreditedScoreAverage,
    double? UncreditedScoreAverage,
    double? CreditedToUncreditedSameSourceScoreGap);

