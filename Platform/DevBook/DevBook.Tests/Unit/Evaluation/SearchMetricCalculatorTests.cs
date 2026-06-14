namespace DevBook.Tests.Unit.Evaluation;

using FluentAssertions;
using DevBook.Data.Models;
using DevBook.Evaluations.Common.Evaluators.SummaryGeneration;
using DevBook.Evaluations.Scenarios.RAG.Search;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;

/// <summary>
/// Contains tests for search metric calculator.
/// </summary>
public sealed class SearchMetricCalculatorTests
{
    private const string EvaluationPath = "Software Engineering/11 AI & ML/LLM/RAG/Evaluation.md";
    private const string ChunkingPath = "Software Engineering/11 AI & ML/LLM/RAG/Chunking.md";
    private const string IrrelevantPath = "Software Engineering/05 Architecture/Patterns/Design Patterns/Composite.md";
    private const string RetrievalHeading = "Retrieval Metrics";
    private const string RetrievalSnippet = "Recall@k is primary";

    /// <summary>
    /// Tests that scoring returns perfect retrieval metrics when the first retrieved document exactly matches expected evidence.
    /// </summary>
    [Fact]
    public void ScoreQuery_PerfectHit_ReturnsPerfectMetrics()
    {
        // Arrange
        var prediction = Prediction("perfect hit", [Document(EvaluationPath, RetrievalHeading, RetrievalSnippet)], [Document(EvaluationPath, "Retrieval Metrics and more", "Recall@k is primary because the generator cannot use evidence it never sees.")]);

        // Act
        var result = SearchMetricCalculator.ScoreQuery(prediction);

        // Assert
        result.Should().BeEquivalentTo(new
        {
            RecallAtK = 1d,
            PrecisionAtK = 1d,
            HitRateAtK = 1d,
            ReciprocalRank = 1d,
        });
        result.Diagnostics.MissingExpectedSourcePaths.Should().BeEmpty();
        result.Diagnostics.DuplicateRetrievedSourcePaths.Should().BeEmpty();
    }

    /// <summary>
    /// Tests that scoring returns partial retrieval metrics when only one of multiple expected sources is retrieved.
    /// </summary>
    [Fact]
    public void ScoreQuery_PartialHit_ReturnsPartialMetrics()
    {
        // Arrange
        var prediction = Prediction(
            "partial hit",
            [Document(EvaluationPath, RetrievalHeading, RetrievalSnippet), Document(ChunkingPath, "Parent-Child Chunking", "search child chunks")],
            [Document(EvaluationPath, RetrievalHeading, "Recall@k is primary because the generator cannot use evidence it never sees."), Document(IrrelevantPath, "Composite", "irrelevant")]);

        // Act
        var result = SearchMetricCalculator.ScoreQuery(prediction);

        // Assert
        result.RecallAtK.Should().Be(0.5);
        result.PrecisionAtK.Should().Be(0.5);
        result.HitRateAtK.Should().Be(1);
        result.ReciprocalRank.Should().Be(1);
        result.Diagnostics.MissingExpectedSourcePaths.Should().ContainSingle().Which.Should().Be(ChunkingPath);
    }

    /// <summary>
    /// Tests that scoring returns zero metrics when no retrieved document matches expected evidence.
    /// </summary>
    [Fact]
    public void ScoreQuery_NoHit_ReturnsZeroMetrics()
    {
        // Arrange
        var prediction = Prediction(
            "no hit",
            [Document(EvaluationPath, RetrievalHeading, "MRR rewards pushing the first relevant result higher")],
            [Document(ChunkingPath, "Parent-Child Chunking", "different source")]);

        // Act
        var result = SearchMetricCalculator.ScoreQuery(prediction);

        // Assert
        result.Should().BeEquivalentTo(new
        {
            RecallAtK = 0d,
            PrecisionAtK = 0d,
            HitRateAtK = 0d,
            ReciprocalRank = 0d,
        });
        result.Diagnostics.MissingExpectedSourcePaths.Should().ContainSingle();
    }

    /// <summary>
    /// Tests that scoring does not count a source-path match as relevant when required heading and snippet evidence differ.
    /// </summary>
    [Fact]
    public void ScoreQuery_SourcePathMatchesButEvidenceDiffers_ReturnsNoRelevantMatch()
    {
        // Arrange
        var prediction = Prediction(
            "source document match",
            [Document(EvaluationPath, RetrievalHeading, "MRR rewards pushing the first relevant result higher")],
            [Document(EvaluationPath, "Other heading", "different snippet")]);

        // Act
        var result = SearchMetricCalculator.ScoreQuery(prediction);

        // Assert
        result.RecallAtK.Should().Be(0);
        result.PrecisionAtK.Should().Be(0);
        result.HitRateAtK.Should().Be(0);
        result.ReciprocalRank.Should().Be(0);
        result.Diagnostics.Matches.Should().ContainSingle().Which.Should().BeEquivalentTo(new
        {
            IsRelevant = false,
            Score = (double?)null,
            HeadingMatched = false,
            SnippetMatched = false,
            SourcePathMatched = true,
            MatchedExpectedHeading = RetrievalHeading,
            Reason = "Source path matched an expected document, but the normalized expected snippet did not appear in the retrieved chunk.",
        });
    }

    /// <summary>
    /// Scores query mixed evidence returns readable diagnostics.
    /// </summary>
    [Fact]
    public void ScoreQuery_MixedEvidence_ReturnsReadableDiagnostics()
    {
        var prediction = Prediction(
            "diagnostic query",
            [Document(EvaluationPath, RetrievalHeading, RetrievalSnippet), Document(ChunkingPath, "Parent-Child Chunking", "search child chunks")],
            [
                Document(EvaluationPath, "Questions", "different chunk"),
                Document(ChunkingPath, "Parent-Child Chunking", "different chunk with search child chunks evidence"),
                Document(ChunkingPath, "Parent-Child Chunking", "different chunk")
            ]);

        var result = SearchMetricCalculator.ScoreQuery(prediction);

        result.Diagnostics.ExpectedDocuments.Should().BeEquivalentTo([
            new { Index = 1, SourcePath = EvaluationPath, Heading = RetrievalHeading, SnippetPreview = RetrievalSnippet, Matched = false },
            new { Index = 2, SourcePath = ChunkingPath, Heading = "Parent-Child Chunking", SnippetPreview = "search child chunks", Matched = true }
        ]);
        result.Diagnostics.Matches.Should().BeEquivalentTo([
            new
            {
                Rank = 1,
                SourcePath = EvaluationPath,
                Heading = "Questions",
                Score = (double?)null,
                MatchedExpectedSourcePath = EvaluationPath,
                SourcePathMatched = true,
                HeadingMatched = false,
                SnippetMatched = false,
                IsRelevant = false,
                Reason = "Source path matched an expected document, but the normalized expected snippet did not appear in the retrieved chunk."
            },
            new
            {
                Rank = 2,
                SourcePath = ChunkingPath,
                Heading = "Parent-Child Chunking",
                Score = (double?)null,
                MatchedExpectedSourcePath = ChunkingPath,
                SourcePathMatched = true,
                HeadingMatched = true,
                SnippetMatched = true,
                IsRelevant = true,
                Reason = "Matched expected source path, heading, and snippet."
            },
            new
            {
                Rank = 3,
                SourcePath = ChunkingPath,
                Heading = "Parent-Child Chunking",
                Score = (double?)null,
                MatchedExpectedSourcePath = ChunkingPath,
                SourcePathMatched = true,
                HeadingMatched = true,
                SnippetMatched = false,
                IsRelevant = false,
                Reason = "Source path matched an expected document that was already credited by an earlier retrieved result; duplicate retrieval does not add recall credit."
            }
        ]);
    }

    /// <summary>
    /// Scores query scored results returns score analysis metrics.
    /// </summary>
    [Fact]
    public void ScoreQuery_ScoredResults_ReturnsScoreAnalysisMetrics()
    {
        var prediction = Prediction(
            "score analysis query",
            [Document(EvaluationPath, RetrievalHeading, RetrievalSnippet)],
            [
                Document(EvaluationPath, RetrievalHeading, "Recall@k is primary because the generator cannot use evidence it never sees.", score: 0.8),
                Document(EvaluationPath, RetrievalHeading, "Recall@k is primary because the generator cannot use evidence it never sees.", score: 0.75),
                Document(IrrelevantPath, "Composite", "irrelevant", score: 0.7)
            ]);

        var result = SearchMetricCalculator.ScoreQuery(prediction);

        result.ScoreAverage.Should().BeApproximately(0.75, 0.000001);
        result.CreditedScoreAverage.Should().BeApproximately(0.8, 0.000001);
        result.UncreditedScoreAverage.Should().BeApproximately(0.725, 0.000001);
        result.CreditedToUncreditedSameSourceScoreGap.Should().BeApproximately(0.05, 0.000001);
    }

    /// <summary>
    /// Searches evaluator evaluate adds report facing interpretations.
    /// </summary>
    [Fact]
    public async Task SearchEvaluator_EvaluateAsync_AddsReportFacingInterpretations()
    {
        var prediction = Prediction(
            "report diagnostic query",
            [Document(EvaluationPath, RetrievalHeading, "MRR rewards pushing the first relevant result higher")],
            [Document(EvaluationPath, "Questions", "different chunk", score: 0.87)]);
        var evaluator = new SearchEvaluator();

        var result = await evaluator.EvaluateAsync(
            [new ChatMessage(ChatRole.User, prediction.Query)],
            new ChatResponse(new ChatMessage(ChatRole.Assistant, "[[Evaluation#Questions]]")),
            additionalContext: [new SearchEvaluationContext(prediction, topK: 5)]);

        var recallMetric = result.Metrics["RecallAt5"];

        recallMetric.Reason.Should().Be("Recall@k measures evidence coverage: matched expected evidence divided by expected evidence. High means required evidence was present in top-k; low means generation is capped by missing context.");
        recallMetric.Interpretation!.Rating.Should().Be(EvaluationRating.Unacceptable);
        recallMetric.Interpretation.Reason.Should().Be("Score 0.000 (Unacceptable): matched 0/1 expected evidence items within top-5.");
        recallMetric.Diagnostics.Should().BeNullOrEmpty();

        var precisionMetric = result.Metrics["PrecisionAt5"];

        precisionMetric.Reason.Should().Be("Precision@k measures annotated context purity: relevant retrieved chunks divided by retrieved chunks. With sparse expected evidence, precision can look low even when the needed evidence is found.");
        precisionMetric.Interpretation!.Rating.Should().Be(EvaluationRating.Unacceptable);
        precisionMetric.Interpretation.Reason.Should().Be("Score 0.000 (Unacceptable): 0/1 retrieved chunks counted as relevant evidence within top-5.");
        precisionMetric.Diagnostics.Should().BeNullOrEmpty();

        var hitRateMetric = result.Metrics["HitRateAt5"];
        hitRateMetric.Reason.Should().Be("HitRate@k measures whether at least one expected evidence item appeared in top-k.");
        hitRateMetric.Interpretation!.Rating.Should().Be(EvaluationRating.Unacceptable);
        hitRateMetric.Interpretation.Reason.Should().Be("Score 0.000 (Unacceptable): no expected evidence item appeared within top-5.");

        var reciprocalRankMetric = result.Metrics["MRRAt5"];
        reciprocalRankMetric.Reason.Should().Be("MRR@k measures ranking quality: 1 divided by the rank of the first relevant evidence chunk within k. High means useful evidence appears early; 0 means no relevant evidence appeared in top-k.");
        reciprocalRankMetric.Interpretation!.Rating.Should().Be(EvaluationRating.Unacceptable);
        reciprocalRankMetric.Interpretation.Reason.Should().Be("Score 0.000 (Unacceptable): no retrieved chunk matched the expected evidence.");
        reciprocalRankMetric.Diagnostics.Should().BeNullOrEmpty();
        result.Metrics.Keys.Should().Equal(PerQueryDashboardMetrics());
        result.Metrics.Should().NotContainKeys("RecallAt3", "PrecisionAt3", "MRRAt1", "MRRAt3", "MRRAt10", "MAPAt1", "MAPAt3", "MAPAt10", "NDCGAt1", "NDCGAt3", "NDCGAt10", "CreditedScoreAverage", "UncreditedScoreAverage", "CreditedToUncreditedSameSourceScoreGap");
        var scoreAverageMetric = result.Metrics["ScoreAverage"];
        ((NumericMetric)scoreAverageMetric).Value.Should().Be(0.87);
        scoreAverageMetric.Interpretation!.Reason.Should().Be("Score 0.870 (Diagnostic): average score across scored retrieved chunks. Related diagnostics: CreditedScoreAverage=n/a, UncreditedScoreAverage=0.870, CreditedToUncreditedSameSourceScoreGap=n/a. Compare only within the same reranker scale.");
        evaluator.EvaluationMetricNames.Should().BeEquivalentTo(result.Metrics.Keys);
    }

    /// <summary>
    /// Searches evaluator evaluate exposes only the dashboard metric surface.
    /// </summary>
    [Fact]
    public async Task SearchEvaluator_EvaluateAsync_ExposesOnlyDashboardMetrics()
    {
        var prediction = Prediction(
            "dashboard query",
            [Document(EvaluationPath, RetrievalHeading, RetrievalSnippet)],
            [
                Document(EvaluationPath, RetrievalHeading, "Recall@k is primary because the generator cannot use evidence it never sees.", score: 0.87654),
                Document(IrrelevantPath, "Composite", "irrelevant", score: 0.18765)
            ]);
        var evaluator = new SearchEvaluator();

        var result = await evaluator.EvaluateAsync(
            [new ChatMessage(ChatRole.User, prediction.Query)],
            new ChatResponse(new ChatMessage(ChatRole.Assistant, "[[Evaluation#Retrieval Metrics]]")),
            additionalContext: [new SearchEvaluationContext(prediction, topK: 5)]);

        result.Metrics.Keys.Should().Equal(PerQueryDashboardMetrics());
        var scoreAverageMetric = result.Metrics["ScoreAverage"];
        ((NumericMetric)scoreAverageMetric).Value.Should().Be(0.532);
        scoreAverageMetric.Interpretation!.Reason.Should().Contain("CreditedScoreAverage=0.877");
        scoreAverageMetric.Interpretation.Reason.Should().Contain("UncreditedScoreAverage=0.188");
        result.Metrics.Should().NotContainKey("MRRAt10");
    }

    /// <summary>
    /// Searches evaluator evaluate formats fractional scores with invariant culture.
    /// </summary>
    [Fact]
    public async Task SearchEvaluator_EvaluateAsync_FormatsFractionalScoresWithInvariantCulture()
    {
        var prediction = Prediction(
            "fractional score query",
            [Document(EvaluationPath)],
            [Document(IrrelevantPath), Document(EvaluationPath)]);
        var evaluator = new SearchEvaluator();

        var result = await evaluator.EvaluateAsync(
            [new ChatMessage(ChatRole.User, prediction.Query)],
            new ChatResponse(new ChatMessage(ChatRole.Assistant, "[[Composite]]\n[[Evaluation]]")),
            additionalContext: [new SearchEvaluationContext(prediction, topK: 5)]);

        result.Metrics["PrecisionAt5"].Interpretation!.Reason.Should().Contain("Score 0.500 (Good)");
        result.Metrics["MRRAt5"].Interpretation!.Reason.Should().Contain("Score 0.500 (Average)");
    }

    /// <summary>
    /// Computes summary metrics rates aggregate metrics.
    /// </summary>
    [Fact]
    public void ComputeSummaryMetrics_RatesAggregateMetrics()
    {
        var predictions = new[]
        {
            new SearchPrediction("first query", [Document(EvaluationPath)], [Document(EvaluationPath)]),
            new SearchPrediction("second query", [Document(EvaluationPath)], []),
            new SearchPrediction("third query", [Document(ChunkingPath)], [Document(IrrelevantPath), Document(ChunkingPath)]),
        };

        var metrics = SearchEvaluator.ComputeSummaryMetrics(predictions, topK: 5)["MarkdownSection.Bm25"].ToDictionary(metric => metric.Name);

        metrics["RecallAt5"].Rating.Should().Be(EvaluationRating.Average);
        metrics["PrecisionAt5"].Rating.Should().Be(EvaluationRating.Good);
        metrics["HitRateAt5"].Rating.Should().Be(EvaluationRating.Average);
        metrics["MRRAt5"].Rating.Should().Be(EvaluationRating.Average);
        metrics["EmptyResultRate"].Rating.Should().Be(EvaluationRating.Poor);
        metrics.Keys.Should().Equal([
            "SampleCount",
            "RecallAt1",
            "RecallAt5",
            "RecallAt10",
            "PrecisionAt1",
            "PrecisionAt5",
            "PrecisionAt10",
            "HitRateAt1",
            "HitRateAt5",
            "HitRateAt10",
            "MRRAt5",
            "MAPAt5",
            "NDCGAt5",
            "EmptyResultRate",
            "ScoreAverage"
        ]);
        metrics["ScoreAverage"].Description.Should().Contain("CreditedScoreAverage=0");
        metrics["ScoreAverage"].Description.Should().Contain("UncreditedScoreAverage=0");
        metrics.Should().NotContainKeys("RecallAt3", "MRRAt10", "CreditedScoreAverage", "UncreditedScoreAverage", "CreditedToUncreditedSameSourceScoreGap");
    }

    /// <summary>
    /// Gets summary evaluator evaluate formats fractional scores with invariant culture.
    /// </summary>
    [Fact]
    public async Task SummaryEvaluator_EvaluateAsync_FormatsFractionalScoresWithInvariantCulture()
    {
        var evaluator = new SummaryEvaluator([
            new SummaryMetric("Fractional", 2d / 3d, "Fractional summary", SummaryMetricKind.PlainNumber, EvaluationRating.Average)
        ]);

        var result = await evaluator.EvaluateAsync(
            [new ChatMessage(ChatRole.System, "summary")],
            new ChatResponse(new ChatMessage(ChatRole.Assistant, "summary")));

        result.Metrics["Fractional"].Interpretation!.Reason.Should().Be("Summary score 0.667 rated Average.");
    }

    /// <summary>
    /// Tests that scoring counts a retrieved document as relevant when the heading matches expected evidence.
    /// </summary>
    [Fact]
    public void ScoreQuery_HeadingMatchesExpectedEvidence_ReturnsRelevantMatch()
    {
        // Arrange
        var prediction = Prediction(
            "evidence hit",
            [Document(EvaluationPath, RetrievalHeading)],
            [Document(EvaluationPath, RetrievalHeading, "different chunk text")]);

        // Act
        var result = SearchMetricCalculator.ScoreQuery(prediction);

        // Assert
        result.RecallAtK.Should().Be(1);
        result.PrecisionAtK.Should().Be(1);
        result.HitRateAtK.Should().Be(1);
        result.ReciprocalRank.Should().Be(1);
        result.Diagnostics.Matches.Should().ContainSingle().Which.HeadingMatched.Should().BeTrue();
    }

    [Fact]
    public void ScoreQuery_ChunkIdMatchesExpectedEvidence_ReturnsRelevantMatchWithoutSnippetCheck()
    {
        var prediction = Prediction(
            "generated chunk hit",
            [Document("[[Prompt Composition]]", chunkId: "chunk-1", documentId: "doc-1")],
            [Document("Software Engineering/11 AI & ML/LLM/Prompt Composition.md", "Different heading", "retrieved chunk text without generated preview", chunkId: "chunk-1", documentId: "doc-1")]);

        var result = SearchMetricCalculator.ScoreQuery(prediction);

        result.RecallAtK.Should().Be(1);
        result.PrecisionAtK.Should().Be(1);
        result.HitRateAtK.Should().Be(1);
        result.Diagnostics.Matches.Should().ContainSingle().Which.Should().BeEquivalentTo(new
        {
            IsRelevant = true,
            SourcePathMatched = true,
            HeadingMatched = false,
            SnippetMatched = false,
            Reason = "Matched expected chunk id.",
        });
    }

    /// <summary>
    /// Scores query semantic strategy uses same heading fallback as other chunkers returns no relevant match.
    /// </summary>
    [Fact]
    public void ScoreQuery_SemanticStrategyUsesSameHeadingFallbackAsOtherChunkers_ReturnsNoRelevantMatch()
    {
        var prediction = Prediction(
            "semantic evidence hit",
            [Document(EvaluationPath, RetrievalHeading)],
            [Document(EvaluationPath, heading: null, snippet: "semantic chunk crosses source sections")],
            ChunkingStrategyKind.Semantic);

        var result = SearchMetricCalculator.ScoreQuery(prediction);

        result.RecallAtK.Should().Be(0);
        result.PrecisionAtK.Should().Be(0);
        result.Diagnostics.Matches.Should().ContainSingle().Which.Should().BeEquivalentTo(new
        {
            IsRelevant = false,
            SourcePathMatched = true,
            HeadingMatched = false,
            SnippetMatched = false,
            Reason = "Source path matched an expected document, but the normalized expected heading did not appear in the retrieved chunk.",
        });
    }

    /// <summary>
    /// Tests that scoring records duplicate retrieved source paths while counting precision against all retrieved results.
    /// </summary>
    [Fact]
    public void ScoreQuery_DuplicateRetrievedSources_ReturnsDuplicateDiagnostics()
    {
        // Arrange
        var prediction = Prediction(
            "duplicate retrieved source",
            [Document(EvaluationPath, RetrievalHeading, RetrievalSnippet)],
            [
                Document(EvaluationPath, RetrievalHeading, "Recall@k is primary because the generator cannot use evidence it never sees."),
                Document(EvaluationPath, RetrievalHeading, "Recall@k is primary because the generator cannot use evidence it never sees."),
                Document(IrrelevantPath, "Composite", "irrelevant")
            ]);

        // Act
        var result = SearchMetricCalculator.ScoreQuery(prediction);

        // Assert
        result.RecallAtK.Should().Be(1);
        result.PrecisionAtK.Should().Be(1d / 3d);
        result.HitRateAtK.Should().Be(1);
        result.ReciprocalRank.Should().Be(1);
        result.Diagnostics.DuplicateRetrievedSourcePaths.Should().ContainSingle().Which.Should().Be(EvaluationPath);
        result.Diagnostics.ChunkDiagnostics.Should().BeEquivalentTo(new
        {
            RetrievedChunkCount = 3,
            UniqueSourceCount = 2,
            DuplicateSourceCount = 1,
            EvidenceCoverage = 1d,
            RelevantRetrievedCount = 1,
        }, options => options.ExcludingMissingMembers());
    }

    /// <summary>
    /// Tests that scoring uses the first relevant result rank to calculate reciprocal rank.
    /// </summary>
    [Fact]
    public void ScoreQuery_FirstRelevantSourceAtSecondRank_ReturnsReciprocalRankForSecondRank()
    {
        // Arrange
        var prediction = Prediction("rank two hit", [Document(EvaluationPath)], [Document(ChunkingPath), Document(EvaluationPath)]);

        // Act
        var result = SearchMetricCalculator.ScoreQuery(prediction);

        // Assert
        result.RecallAtK.Should().Be(1);
        result.PrecisionAtK.Should().Be(0.5);
        result.HitRateAtK.Should().Be(1);
        result.ReciprocalRank.Should().Be(0.5);
    }

    /// <summary>
    /// Tests that evaluation aggregates query count, retrieval metrics, and empty-result rate for reports.
    /// </summary>
    [Fact]
    public void Evaluate_MixedQueryResults_ReturnsAggregateMetrics()
    {
        // Arrange
        var predictions = new[]
        {
            new SearchPrediction("first query", [Document(EvaluationPath)], [Document(EvaluationPath, score: 0.9)]),
            new SearchPrediction("second query", [Document(EvaluationPath)], []),
            new SearchPrediction("third query", [Document(ChunkingPath)], [Document(IrrelevantPath, score: 0.7), Document(ChunkingPath, score: 0.8)]),
        };

        // Act
        var report = SearchMetricCalculator.Evaluate(predictions, topK: 5);

        // Assert
        report.QueryCount.Should().Be(3);
        report.RecallAtK.Should().BeApproximately(2d / 3d, 0.000001);
        report.PrecisionAtK.Should().BeApproximately(0.5, 0.000001);
        report.HitRateAtK.Should().BeApproximately(2d / 3d, 0.000001);
        report.MeanReciprocalRank.Should().BeApproximately(0.5, 0.000001);
        report.RankingMetrics[1].Recall.Should().BeApproximately(1d / 3d, 0.000001);
        report.RankingMetrics[3].MeanAveragePrecision.Should().BeApproximately(0.5, 0.000001);
        report.RankingMetrics[5].NormalizedDiscountedCumulativeGain.Should().BeApproximately((1d + (1d / Math.Log2(3))) / 3d, 0.000001);
        report.EmptyResultRate.Should().BeApproximately(1d / 3d, 0.000001);
        report.ScoreAverage.Should().BeApproximately(0.825, 0.000001);
        report.CreditedScoreAverage.Should().BeApproximately(0.85, 0.000001);
        report.UncreditedScoreAverage.Should().BeApproximately(0.7, 0.000001);
        report.CreditedToUncreditedSameSourceScoreGap.Should().Be(0);
    }


    private static string[] PerQueryDashboardMetrics() =>
    [
        "RecallAt1",
        "RecallAt5",
        "RecallAt10",
        "PrecisionAt1",
        "PrecisionAt5",
        "PrecisionAt10",
        "HitRateAt1",
        "HitRateAt5",
        "HitRateAt10",
        "MRRAt5",
        "MAPAt5",
        "NDCGAt5",
        "ScoreAverage"
    ];

    private static SearchPrediction Prediction(
        string query,
        IReadOnlyList<SearchDocument> expectedDocuments,
        IReadOnlyList<SearchDocument> retrievedDocuments,
        ChunkingStrategyKind chunkingStrategy = ChunkingStrategyKind.MarkdownSection) =>
        new(query, expectedDocuments, retrievedDocuments, chunkingStrategy);

    private static SearchDocument Document(
        string sourcePath,
        string? heading = null,
        string? snippet = null,
        double? score = null,
        string? chunkId = null,
        string? documentId = null) =>
        new(sourcePath, heading, snippet, Score: score, ChunkId: chunkId, DocumentId: documentId);
}
