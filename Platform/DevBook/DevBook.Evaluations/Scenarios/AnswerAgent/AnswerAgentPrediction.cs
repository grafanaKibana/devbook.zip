namespace DevBook.Evaluations.Scenarios.AnswerAgent;

using Microsoft.Extensions.AI.Evaluation;

/// <summary>Captured agent case plus the metrics the judge produced, used to compute summary aggregates.</summary>
public sealed record AnswerAgentPrediction(AgentCase Case, IReadOnlyList<EvaluationMetric> Metrics);
