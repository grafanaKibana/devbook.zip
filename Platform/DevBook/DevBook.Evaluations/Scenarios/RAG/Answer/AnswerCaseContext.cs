namespace DevBook.Evaluations.Scenarios.RAG.Answer;

using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;

/// <summary>Carries the case and its precomputed verdicts into the evaluation pipeline.</summary>
public sealed class AnswerCaseContext(RagGoldenCase answerCase, IReadOnlyList<AnswerMetricVerdict> verdicts)
    : EvaluationContext(nameof(AnswerCaseContext), new TextContent(answerCase.Query))
{
    /// <summary>Gets the scored case.</summary>
    public RagGoldenCase Case { get; } = answerCase;

    /// <summary>Gets the verdicts produced by the judge for this case.</summary>
    public IReadOnlyList<AnswerMetricVerdict> Verdicts { get; } = verdicts;
}