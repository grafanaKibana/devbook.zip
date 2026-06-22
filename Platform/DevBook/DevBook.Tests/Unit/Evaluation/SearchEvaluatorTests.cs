namespace DevBook.Tests.Unit.Evaluation;

using FluentAssertions;
using DevBook.Evaluations.Common.Evaluation.Summary;
using DevBook.Evaluations.Scenarios.RAG.Search;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;
using static DevBook.Tests.Unit.Evaluation.SearchEvaluationTestData;

/// <summary>
/// Unit tests for <see cref="SearchEvaluator"/> per-query evaluation and summary metric aggregation.
/// </summary>
public sealed class SearchEvaluatorTests
{
    private readonly SearchEvaluator evaluator = new();

    #region EvaluateAsync

    /// <summary>
    /// Adds report-facing reasons and interpretations to the dashboard metrics for a query that retrieves no expected evidence.
    /// </summary>
    [Fact]
    public async Task EvaluateAsync_NoHitQuery_AddsReportFacingInterpretations()
    {
        // Arrange
        var prediction = Prediction(
            "report diagnostic query",
            expectedDocuments: [Document(EvaluationPath, RetrievalHeading, UnmatchedSnippet)],
            retrievedDocuments: [Document(EvaluationPath, QuestionsHeading, "different chunk", score: 0.87)]);

        // Act
        var result = await EvaluateQuery(prediction, "[[Evaluation#Questions]]", topK: 10);

        // Assert
        var hitRateMetric = result.Metrics["HitRateAt1"];
        hitRateMetric.Reason.Should().Be("HitRate@1 checks whether the first retrieved chunk is credited against expected evidence. Read 1.000 as the top result is immediately useful and 0.000 as the top result is not credited.");
        hitRateMetric.Interpretation!.Rating.Should().Be(EvaluationRating.Unacceptable);
        hitRateMetric.Interpretation.Reason.Should().Be("Score 0.000 (Unacceptable): no expected evidence item appeared within top-1.");

        var reciprocalRankMetric = result.Metrics["MRRAt10"];
        reciprocalRankMetric.Reason.Should().Be("MRR@10 is reciprocal rank for the first credited evidence chunk. Read 1.000 as the first result is relevant, 0.500 as the first relevant result is rank 2, 0.100 as rank 10, and 0.000 as no relevant chunk appears in top-10.");
        reciprocalRankMetric.Interpretation!.Rating.Should().Be(EvaluationRating.Unacceptable);
        reciprocalRankMetric.Interpretation.Reason.Should().Be("Score 0.000 (Unacceptable): no retrieved chunk matched the expected evidence.");
        reciprocalRankMetric.Diagnostics.Should().BeNullOrEmpty();

        var recallAtRMetric = result.Metrics["RecallAtR"];
        recallAtRMetric.Reason.Should().Contain("Read 1.000 as all required evidence found");
        recallAtRMetric.Interpretation!.Reason.Should().Be("Score 0.000 (Unacceptable): matched 0/1 expected evidence items within top-1.");
        result.Metrics.Should().NotContainKeys("PrecisionAtR", "SectionPrecisionAtR");

        var sectionRecallAtRMetric = result.Metrics["SectionRecallAtR"];
        sectionRecallAtRMetric.Reason.Should().Contain("collapsing expected chunks by source path and heading");
        sectionRecallAtRMetric.Reason.Should().Contain("shows whether retrieval reached the right section");
        sectionRecallAtRMetric.Interpretation!.Reason.Should().Be("Score 0.000 (Unacceptable): matched 0/1 expected sections within top-1.");
        result.Metrics.Keys.Should().Equal(PerQueryDashboardMetrics());
        result.Metrics.Should().NotContainKeys("RecallAt1", "RecallAt5", "RecallAt10", "PrecisionAt1", "PrecisionAt5", "PrecisionAt10", "HitRateAt5", "HitRateAt10", "MRRAt1", "MRRAt3", "MRRAt5", "MAPAt1", "MAPAt3", "MAPAt5", "NDCGAt1", "NDCGAt3", "NDCGAt5", "CreditedScoreAverage", "UncreditedScoreAverage", "CreditedToUncreditedSameSourceScoreGap");

        var scoreAverageMetric = result.Metrics["ScoreAverage"];
        ((NumericMetric)scoreAverageMetric).Value.Should().Be(0.87);
        scoreAverageMetric.Reason.Should().NotContain("CreditedScoreAverage");
        scoreAverageMetric.Interpretation!.Reason.Should().Be("Score 0.870 (Diagnostic): average raw score across scored retrieved chunks. Compare this metric only within the same reranker and scorer scale.");
        scoreAverageMetric.Diagnostics.Should().Contain(diagnostic => diagnostic.Message == "CreditedScoreAverage=n/a" && diagnostic.Severity == EvaluationDiagnosticSeverity.Informational);
        scoreAverageMetric.Diagnostics.Should().Contain(diagnostic => diagnostic.Message == "UncreditedScoreAverage=0.870" && diagnostic.Severity == EvaluationDiagnosticSeverity.Informational);
        scoreAverageMetric.Diagnostics.Should().Contain(diagnostic => diagnostic.Message == "CreditedToUncreditedSameSourceScoreGap=n/a" && diagnostic.Severity == EvaluationDiagnosticSeverity.Informational);
        scoreAverageMetric.Diagnostics.Should().NotContain(diagnostic => diagnostic.Message.Contains("same reranker", StringComparison.Ordinal));
        evaluator.EvaluationMetricNames.Should().Equal(result.Metrics.Keys);
    }

    /// <summary>
    /// Exposes only the dashboard metric surface and folds credited/uncredited score breakdowns into diagnostics.
    /// </summary>
    [Fact]
    public async Task EvaluateAsync_ScoredResults_ExposesOnlyDashboardMetrics()
    {
        // Arrange
        var prediction = Prediction(
            "dashboard query",
            expectedDocuments: [Document(EvaluationPath, RetrievalHeading, RetrievalSnippet)],
            retrievedDocuments:
            [
                Document(EvaluationPath, RetrievalHeading, RetrievalChunkText, score: 0.87654),
                Document(IrrelevantPath, CompositeHeading, IrrelevantSnippet, score: 0.18765)
            ]);

        // Act
        var result = await EvaluateQuery(prediction, "[[Evaluation#Retrieval Metrics]]", topK: 10);

        // Assert
        result.Metrics.Keys.Should().Equal(PerQueryDashboardMetrics());
        var scoreAverageMetric = result.Metrics["ScoreAverage"];
        ((NumericMetric)scoreAverageMetric).Value.Should().Be(0.532);
        scoreAverageMetric.Interpretation!.Reason.Should().NotContain("CreditedScoreAverage");
        scoreAverageMetric.Diagnostics.Should().Contain(diagnostic => diagnostic.Message == "CreditedScoreAverage=0.877");
        scoreAverageMetric.Diagnostics.Should().Contain(diagnostic => diagnostic.Message == "UncreditedScoreAverage=0.188");
        result.Metrics.Should().NotContainKey("MRRAt5");
    }

    /// <summary>
    /// Returns a single failed RecallAtR metric when no <see cref="SearchEvaluationContext"/> is supplied.
    /// </summary>
    [Fact]
    public async Task EvaluateAsync_WithoutSearchContext_FailsRecallAtR()
    {
        // Arrange
        var messages = new[] { new ChatMessage(ChatRole.User, "missing context") };
        var response = new ChatResponse(new ChatMessage(ChatRole.Assistant, "missing context"));

        // Act: no SearchEvaluationContext is passed as additional context.
        var result = await evaluator.EvaluateAsync(messages, response);

        // Assert
        result.Metrics.Keys.Should().Equal("RecallAtR");
        result.Metrics["RecallAtR"].Interpretation!.Failed.Should().BeTrue();
        result.Metrics.Should().NotContainKeys("RecallAt5", "RecallAt10");
    }

    /// <summary>
    /// Names ranking metrics with the fixed report cutoff (top-10) regardless of the requested top-K.
    /// </summary>
    [Fact]
    public async Task EvaluateAsync_TopKBelowReportCutoff_UsesFixedReportCutoffNames()
    {
        // Arrange
        var prediction = Prediction(
            "fixed report cutoff",
            expectedDocuments: [Document(EvaluationPath)],
            retrievedDocuments: [Document(EvaluationPath)]);

        // Act
        var result = await EvaluateQuery(prediction, "fixed report cutoff", topK: 5);

        // Assert
        result.Metrics.Keys.Should().Equal(PerQueryDashboardMetrics());
        result.Metrics.Should().ContainKeys("MRRAt10", "MAPAt10", "NDCGAt10");
        result.Metrics.Should().NotContainKeys("MRRAt5", "MAPAt5", "NDCGAt5");
    }

    /// <summary>
    /// Applies the fixed top-10 cutoff to section ranking metrics, so a hit at rank eleven scores zero.
    /// </summary>
    [Fact]
    public async Task EvaluateAsync_HitAtRankEleven_SectionRankingUsesFixedTopTenCutoff()
    {
        // Arrange
        var retrieved = Enumerable.Range(0, 10)
            .Select(index => Document($"[[Irrelevant {index}]]"))
            .Append(Document(EvaluationPath))
            .ToArray();
        var prediction = Prediction(
            "section rank eleven",
            expectedDocuments: [Document(EvaluationPath)],
            retrievedDocuments: retrieved);

        // Act
        var result = await EvaluateQuery(prediction, "section rank eleven", topK: 11);

        // Assert
        ((NumericMetric)result.Metrics["SectionMRRAt10"]).Value.Should().Be(0);
        ((NumericMetric)result.Metrics["SectionMAPAt10"]).Value.Should().Be(0);
        ((NumericMetric)result.Metrics["SectionNDCGAt10"]).Value.Should().Be(0);
        ((NumericMetric)result.Metrics["MRRAt10"]).Value.Should().Be(0);
        result.Metrics.Should().NotContainKey("SectionMRRAt11");
    }

    /// <summary>
    /// Fails RecallAtR for near-complete recall before the displayed value rounds up to 1.000.
    /// </summary>
    [Fact]
    public async Task EvaluateAsync_NearCompleteRecall_FailsRecallAtRBeforeRounding()
    {
        // Arrange
        var expected = Enumerable.Range(0, 2_500)
            .Select(index => Document($"[[Expected {index}]]", chunkId: $"expected-{index}"))
            .ToArray();
        var retrieved = Enumerable.Range(0, 2_499)
            .Select(index => Document($"[[Expected {index}]]", chunkId: $"expected-{index}"))
            .ToArray();
        var prediction = Prediction("rounding gate", expectedDocuments: expected, retrievedDocuments: retrieved);

        // Act
        var result = await EvaluateQuery(prediction, "rounding gate", topK: 2_500);

        // Assert
        ((NumericMetric)result.Metrics["RecallAtR"]).Value.Should().Be(1);
        result.Metrics["RecallAtR"].Interpretation!.Failed.Should().BeTrue();
    }

    /// <summary>
    /// Formats fractional metric scores with invariant culture so reports do not depend on the host locale.
    /// </summary>
    [Fact]
    public async Task EvaluateAsync_FractionalScores_FormatsWithInvariantCulture()
    {
        // Arrange
        var prediction = Prediction(
            "fractional score query",
            expectedDocuments: [Document(EvaluationPath)],
            retrievedDocuments: [Document(IrrelevantPath), Document(EvaluationPath)]);

        // Act
        var result = await EvaluateQuery(prediction, "[[Composite]]\n[[Evaluation]]", topK: 10);

        // Assert
        result.Metrics["RecallAtR"].Interpretation!.Reason.Should().Contain("Score 0.000 (Unacceptable)");
        result.Metrics["MRRAt10"].Interpretation!.Reason.Should().Contain("Score 0.500 (Average)");
    }

    /// <summary>
    /// Fails RecallAtR and reports the late first-hit reciprocal rank when an expected document is found only after several misses.
    /// </summary>
    [Fact]
    public async Task EvaluateAsync_LateFirstHit_FailsIncompleteRecallAtR()
    {
        // Arrange
        var prediction = Prediction(
            "late hit query",
            expectedDocuments: [Document(EvaluationPath)],
            retrievedDocuments:
            [
                Document(IrrelevantPath),
                Document(ChunkingPath),
                Document(IrrelevantPath, "second irrelevant"),
                Document(ChunkingPath, "second chunking"),
                Document(IrrelevantPath, "third irrelevant"),
                Document(EvaluationPath)
            ]);

        // Act
        var result = await EvaluateQuery(prediction, "late hit", topK: 10);

        // Assert
        result.Metrics["RecallAtR"].Interpretation!.Failed.Should().BeTrue();
        ((NumericMetric)result.Metrics["RecallAtR"]).Value.Should().Be(0);
        ((NumericMetric)result.Metrics["MRRAt10"]).Value.Should().BeApproximately(0.167, 0.000001);
    }

    #endregion

    #region ComputeSummaryMetrics

    /// <summary>
    /// Rates, describes, and orders the aggregate dashboard metrics, and carries score diagnostics through to the summary evaluator.
    /// </summary>
    [Fact]
    public async Task ComputeSummaryMetrics_MixedQueryResults_RatesAndDescribesAggregateMetrics()
    {
        // Arrange
        var predictions = new[]
        {
            Prediction("first query", expectedDocuments: [Document(EvaluationPath)], retrievedDocuments: [Document(EvaluationPath)]),
            Prediction("second query", expectedDocuments: [Document(EvaluationPath)], retrievedDocuments: []),
            Prediction("third query", expectedDocuments: [Document(ChunkingPath)], retrievedDocuments: [Document(IrrelevantPath), Document(ChunkingPath)]),
        };

        // Act
        var summaryMetrics = SearchEvaluator.ComputeSummaryMetrics(predictions, topK: 10)["MarkdownSection.Bm25"].ToArray();

        // Assert
        var metrics = summaryMetrics.ToDictionary(metric => metric.Name);
        metrics["HitRateAt1"].Rating.Should().Be(EvaluationRating.Poor);
        metrics["MRRAt10"].Rating.Should().Be(EvaluationRating.Average);
        metrics["RecallAtR"].Rating.Should().Be(EvaluationRating.Poor);
        metrics["SectionRecallAtR"].Rating.Should().Be(EvaluationRating.Poor);
        metrics["EmptyResultRate"].Rating.Should().Be(EvaluationRating.Poor);
        summaryMetrics.Select(metric => metric.Name).Should().Equal([
            "RecallAtR",
            "SectionRecallAtR",
            "HitRateAt1",
            "SectionHitRateAt1",
            "MRRAt10",
            "SectionMRRAt10",
            "MAPAt10",
            "SectionMAPAt10",
            "NDCGAt10",
            "SectionNDCGAt10",
            "EmptyResultRate",
            "ScoreAverage",
            "SampleCount"
        ]);
        metrics["RecallAtR"].Description.Should().Contain("Read 1.000 as all required evidence found");
        metrics["SectionRecallAtR"].Description.Should().Contain("shows whether retrieval reached the right section");
        metrics["ScoreAverage"].Description.Should().NotContain("CreditedScoreAverage");
        metrics["ScoreAverage"].Description.Should().Contain("Compare this metric only within the same reranker and scorer scale.");
        metrics["ScoreAverage"].Diagnostics.Should().Contain(diagnostic => diagnostic.Message == "CreditedScoreAverage=0.000");
        metrics["ScoreAverage"].Diagnostics.Should().Contain(diagnostic => diagnostic.Message == "UncreditedScoreAverage=0.000");
        metrics["ScoreAverage"].Diagnostics.Should().NotContain(diagnostic => diagnostic.Message.Contains("same reranker", StringComparison.Ordinal));
        metrics.Should().NotContainKeys("RecallAt1", "RecallAt5", "RecallAt10", "PrecisionAt1", "PrecisionAt5", "PrecisionAt10", "RPrecision", "SectionRPrecision", "HitRateAt5", "HitRateAt10", "RecallAt3", "MRRAt5", "CreditedScoreAverage", "UncreditedScoreAverage", "CreditedToUncreditedSameSourceScoreGap");

        // The computed diagnostics survive when the summary metrics are projected through SummaryEvaluator.
        var summaryResult = await new SummaryEvaluator(summaryMetrics).EvaluateAsync(
            [new ChatMessage(ChatRole.System, "summary")],
            new ChatResponse(new ChatMessage(ChatRole.Assistant, "summary")));
        summaryResult.Metrics["ScoreAverage"].Diagnostics.Should().Contain(diagnostic => diagnostic.Message == "CreditedScoreAverage=0.000");
    }

    #endregion

    /// <summary>
    /// Evaluates one prediction through <see cref="SearchEvaluator"/> using the shared evaluator instance.
    /// </summary>
    /// <param name="prediction">The prediction supplied as evaluation context.</param>
    /// <param name="assistantAnswer">The model answer (citation list) returned for the query.</param>
    /// <param name="topK">Maximum rank cutoff requested for the query.</param>
    private ValueTask<EvaluationResult> EvaluateQuery(SearchPrediction prediction, string assistantAnswer, int topK) =>
        evaluator.EvaluateAsync(
            [new ChatMessage(ChatRole.User, prediction.Query)],
            new ChatResponse(new ChatMessage(ChatRole.Assistant, assistantAnswer)),
            additionalContext: [new SearchEvaluationContext(prediction, topK)]);

    private static string[] PerQueryDashboardMetrics() =>
    [
        "RecallAtR",
        "SectionRecallAtR",
        "HitRateAt1",
        "SectionHitRateAt1",
        "MRRAt10",
        "SectionMRRAt10",
        "MAPAt10",
        "SectionMAPAt10",
        "NDCGAt10",
        "SectionNDCGAt10",
        "ScoreAverage"
    ];
}
