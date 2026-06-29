namespace DevBook.Evaluations.Scenarios.RAG.Answer;

using Microsoft.Extensions.AI.Evaluation;

/// <summary>
/// Captured answer case plus the metrics the judge produced for it (the same
/// <see cref="EvaluationMetric"/>s written to the report), used to compute summary aggregates.
/// </summary>
public sealed record AnswerPrediction(RagGoldenCase Case, IReadOnlyList<EvaluationMetric> Metrics);
