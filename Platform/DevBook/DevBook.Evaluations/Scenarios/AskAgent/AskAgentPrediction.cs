namespace DevBook.Evaluations.Scenarios.AskAgent;

using Microsoft.Extensions.AI.Evaluation;

/// <summary>Captured agent case plus the metrics the judge produced, used to compute summary aggregates.</summary>
public sealed record AskAgentPrediction(AgentCase Case, IReadOnlyList<EvaluationMetric> Metrics);
