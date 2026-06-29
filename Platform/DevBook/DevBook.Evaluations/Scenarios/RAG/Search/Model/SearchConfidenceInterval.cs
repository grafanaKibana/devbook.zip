namespace DevBook.Evaluations.Scenarios.RAG.Search.Model;

/// <summary>
/// Lower and upper bounds for a bootstrap confidence interval.
/// </summary>
/// <param name="Lower">Lower interval bound.</param>
/// <param name="Upper">Upper interval bound.</param>
public sealed record SearchConfidenceInterval(double Lower, double Upper);

