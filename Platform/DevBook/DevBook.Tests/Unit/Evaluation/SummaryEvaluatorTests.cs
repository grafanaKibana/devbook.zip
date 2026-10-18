namespace DevBook.Tests.Unit.Evaluation;

using FluentAssertions;
using DevBook.Evaluations.Common.Evaluation.Summary;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;

/// <summary>
/// Unit tests for <see cref="SummaryEvaluator"/> report rendering.
/// </summary>
public sealed class SummaryEvaluatorTests
{
    /// <summary>
    /// Formats a fractional summary score with invariant culture so the interpretation reason does not depend on the host locale.
    /// </summary>
    [Fact]
    public async Task EvaluateAsync_FractionalScore_FormatsWithInvariantCulture()
    {
        // Arrange
        var evaluator = new SummaryEvaluator([
            new SummaryMetric("Fractional", 2d / 3d, "Fractional summary", SummaryMetricKind.PlainNumber, EvaluationRating.Average)
        ]);

        // Act
        var result = await evaluator.EvaluateAsync(
            [new ChatMessage(ChatRole.System, "summary")],
            new ChatResponse(new ChatMessage(ChatRole.Assistant, "summary")));

        // Assert
        result.Metrics["Fractional"].Interpretation!.Reason.Should().Be("Summary score 0.667 rated Average.");
    }
}
