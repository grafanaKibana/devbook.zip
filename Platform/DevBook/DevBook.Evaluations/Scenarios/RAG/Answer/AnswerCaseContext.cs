namespace DevBook.Evaluations.Scenarios.RAG.Answer;

using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;

/// <summary>
/// Carries the golden case into the evaluation pipeline. The judge runs inside the MEAI evaluator
/// (see <c>JudgeEvaluator</c>) and reads the question, gold sources and optional reference answer from
/// here — the chat transcript only carries the question and the produced answer.
/// </summary>
public sealed class AnswerCaseContext(RagGoldenCase answerCase)
    : EvaluationContext(nameof(AnswerCaseContext), BuildContents(answerCase))
{
    /// <summary>Gets the scored case.</summary>
    public RagGoldenCase Case { get; } = answerCase;

    private static TextContent BuildContents(RagGoldenCase answerCase)
        => new(answerCase.ReferenceAnswer
               ?? string.Join("\n\n", answerCase.Expected.Select(chunk => $"[{chunk.CitationLabel}] {chunk.Text}")));
}
