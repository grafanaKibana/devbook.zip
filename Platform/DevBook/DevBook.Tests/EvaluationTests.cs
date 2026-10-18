namespace DevBook.Tests;

using DevBook.Data.Models;
using DevBook.Evaluations.Scenarios.RAG.Search;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;

public sealed class EvaluationTests
{
    [Fact]
    public void Ranking_math_credits_evidence_once_and_accounts_for_rank_and_missing_items()
    {
        var prediction = new SearchPrediction("ranking",
            [Evidence("A", "one"), Evidence("A", "two"), Evidence("B", "three")],
            [Evidence("A", "one"), Evidence("Other", "miss"), Evidence("B", "three"), Evidence("A", "two")]);
        var result = SearchMetricCalculator.ScoreQuery(prediction, topK: 10);
        result.RBasedMetrics.RecallAtR.Should().BeApproximately(2d / 3, 0.000001);
        result.RBasedMetrics.RPrecision.Should().BeApproximately(2d / 3, 0.000001);
        result.SectionMetrics.HitRateAt1.Should().Be(1);
        result.SectionMetrics.MeanReciprocalRankAtK.Should().Be(1);
        result.SectionMetrics.MeanAveragePrecisionAtK.Should().BeApproximately((1d + 2d / 3 + 3d / 4) / 3, 0.000001);
        result.SectionMetrics.NormalizedDiscountedCumulativeGainAtK.Should().BeApproximately(
            (1d + 1d / Math.Log2(4) + 1d / Math.Log2(5)) / (1d + 1d / Math.Log2(3) + 1d / Math.Log2(4)), 0.000001);
        var duplicate = SearchMetricCalculator.ScoreQuery(new("duplicates", [Evidence("A", "one")],
            [Evidence("Other", "miss"), Evidence("A", "one"), Evidence("A", "one")]));
        duplicate.ReciprocalRank.Should().Be(0.5);
        duplicate.RBasedMetrics.RecallAtR.Should().Be(0);
        duplicate.Diagnostics.DuplicateRetrievedSourcePaths.Should().ContainSingle();
        var noHit = SearchMetricCalculator.ScoreQuery(new("miss", [Evidence("A", "one")], [Evidence("A", "wrong")]));
        noHit.RecallAtK.Should().Be(0);
        noHit.ReciprocalRank.Should().Be(0);
        noHit.Diagnostics.MissingExpectedSourcePaths.Should().ContainSingle();
    }

    [Theory]
    [InlineData(ChunkingStrategyKind.FixedSize)]
    [InlineData(ChunkingStrategyKind.MarkdownSection)]
    [InlineData(ChunkingStrategyKind.Semantic)]
    public void Evidence_identity_is_chunker_neutral_and_requires_expected_content(ChunkingStrategyKind kind)
    {
        var expected = new SearchDocument("Evaluation", "Metrics", "required evidence");
        var retrieved = new SearchDocument("Home/AI/Evaluation.md", null, "paragraph with required evidence inside");
        var result = SearchMetricCalculator.ScoreQuery(new("identity", [expected], [retrieved], kind));
        result.RBasedMetrics.RecallAtR.Should().Be(1);
        result.SectionMetrics.RecallAtR.Should().Be(1);
        SearchMetricCalculator.ScoreQuery(new("wrong evidence", [expected],
            [new SearchDocument("Home/AI/Evaluation.md", "Other", "wrong text")], kind)).RecallAtK.Should().Be(0);
        SearchMetricCalculator.ScoreQuery(new("chunk identity", [Evidence("A", "stable")],
            [new SearchDocument("A", "Different", "Different", ChunkId: "stable")], kind)).RecallAtK.Should().Be(1);
    }

    [Fact]
    public async Task Evaluation_reports_fail_without_context_and_keep_fixed_ranking_cutoff()
    {
        var evaluator = new SearchEvaluator();
        var messages = new[] { new ChatMessage(ChatRole.User, "query") };
        var response = new ChatResponse(new ChatMessage(ChatRole.Assistant, "result"));
        var missingContext = await evaluator.EvaluateAsync(messages, response);
        missingContext.Metrics["RecallAtR"].Interpretation!.Failed.Should().BeTrue();
        var retrieved = Enumerable.Range(0, 10).Select(i => Evidence($"Other{i}", $"miss{i}"))
            .Append(Evidence("A", "hit")).ToArray();
        var prediction = new SearchPrediction("query", [Evidence("A", "hit")], retrieved);
        var result = await evaluator.EvaluateAsync(messages, response,
            additionalContext: [new SearchEvaluationContext(prediction, 11)]);
        result.Metrics.Keys.Should().BeEquivalentTo(evaluator.EvaluationMetricNames);
        result.Metrics.Should().ContainKey("RetrievalOutcome");
        foreach (var name in new[] { "MRRAt10", "MAPAt10", "NDCGAt10", "SectionMRRAt10" })
        {
            ((NumericMetric)result.Metrics[name]).Value.Should().Be(0);
        }
        result.Metrics["RecallAtR"].Interpretation!.Failed.Should().BeTrue();
    }

    [Fact]
    public void Aggregate_metrics_include_empty_queries_in_denominators()
    {
        SearchPrediction[] predictions =
        [
            new("hit", [Evidence("A", "a")], [Evidence("A", "a")]),
            new("empty", [Evidence("A", "a")], []),
            new("late", [Evidence("B", "b")], [Evidence("Other", "miss"), Evidence("B", "b")]),
        ];
        var report = SearchMetricCalculator.Evaluate(predictions);
        report.QueryCount.Should().Be(3);
        report.EmptyResultRate.Should().BeApproximately(1d / 3, 0.000001);
        report.MeanReciprocalRank.Should().Be(0.5);
        report.RBasedMetrics.RecallAtR.Should().BeApproximately(1d / 3, 0.000001);
        SearchEvaluator.ComputeSummaryMetrics(predictions, 10).Should().ContainKey("MarkdownSection.Bm25");
    }

    private static SearchDocument Evidence(string source, string id) => new(source, id, id, ChunkId: id);
}
