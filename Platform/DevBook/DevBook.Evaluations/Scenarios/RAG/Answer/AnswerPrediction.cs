namespace DevBook.Evaluations.Scenarios.RAG.Answer;

/// <summary>Captured answer case plus the judge verdicts, used to compute summary aggregates.</summary>
public sealed record AnswerPrediction(RagGoldenCase Case, IReadOnlyList<AnswerMetricVerdict> Verdicts);