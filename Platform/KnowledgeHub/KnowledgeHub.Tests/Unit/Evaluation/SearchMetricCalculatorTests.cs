namespace KnowledgeHub.Tests.Unit.Evaluation;

using FluentAssertions;
using KnowledgeHub.Evaluations.Common.Evaluators.SummaryGeneration;
using KnowledgeHub.Evaluations.Scenarios.RAG.Search;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;

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
        result.ReciprocalRank.Should().Be(0);
        result.Diagnostics.Matches.Should().ContainSingle().Which.Should().BeEquivalentTo(new
        {
            IsRelevant = false,
            HeadingMatched = false,
            SnippetMatched = false,
            SourcePathMatched = true,
            MatchedExpectedHeading = RetrievalHeading,
            Reason = "Source path matched an expected document, but neither the expected heading nor expected snippet appeared in the retrieved chunk.",
        });
    }

    [Fact]
    public void ScoreQuery_MixedEvidence_ReturnsReadableDiagnostics()
    {
        var prediction = Prediction(
            "diagnostic query",
            [Document(EvaluationPath, RetrievalHeading, RetrievalSnippet), Document(ChunkingPath, "Parent-Child Chunking", "search child chunks")],
            [
                Document(EvaluationPath, "Questions", "different chunk"),
                Document(ChunkingPath, "Parent-Child Chunking", "different chunk"),
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
                MatchedExpectedSourcePath = EvaluationPath,
                SourcePathMatched = true,
                HeadingMatched = false,
                SnippetMatched = false,
                IsRelevant = false,
                Reason = "Source path matched an expected document, but neither the expected heading nor expected snippet appeared in the retrieved chunk."
            },
            new
            {
                Rank = 2,
                SourcePath = ChunkingPath,
                Heading = "Parent-Child Chunking",
                MatchedExpectedSourcePath = ChunkingPath,
                SourcePathMatched = true,
                HeadingMatched = true,
                SnippetMatched = false,
                IsRelevant = true,
                Reason = "Matched expected source path and heading."
            },
            new
            {
                Rank = 3,
                SourcePath = ChunkingPath,
                Heading = "Parent-Child Chunking",
                MatchedExpectedSourcePath = ChunkingPath,
                SourcePathMatched = true,
                HeadingMatched = true,
                SnippetMatched = false,
                IsRelevant = false,
                Reason = "Source path matched an expected document that was already credited by an earlier retrieved result; duplicate retrieval does not add recall credit."
            }
        ]);
    }

    [Fact]
    public async Task SearchEvaluator_EvaluateAsync_AddsReportFacingDiagnostics()
    {
        var prediction = Prediction(
            "report diagnostic query",
            [Document(EvaluationPath, RetrievalHeading, "MRR rewards pushing the first relevant result higher")],
            [Document(EvaluationPath, "Questions", "different chunk")]);
        var evaluator = new SearchEvaluator();

        var result = await evaluator.EvaluateAsync(
            [new ChatMessage(ChatRole.User, prediction.Query)],
            new ChatResponse(new ChatMessage(ChatRole.Assistant, "[[Evaluation#Questions]]")),
            additionalContext: [new SearchEvaluationContext(prediction, topK: 5)]);

        var recallMetric = result.Metrics["RecallAtK"];
        var diagnosticMessages = recallMetric.Diagnostics.Should().NotBeNull().And.Subject!.Select(diagnostic => diagnostic.Message);

        recallMetric.Reason.Should().Be("Recall@k measures evidence coverage: matched expected evidence divided by expected evidence. High means required evidence was present in top-k; low means generation is capped by missing context.");
        recallMetric.Interpretation!.Rating.Should().Be(EvaluationRating.Unacceptable);
        recallMetric.Interpretation.Reason.Should().Be("Score 0 (Unacceptable): matched 0/1 expected evidence items.");
        diagnosticMessages.Should().Contain(message => message.Contains("Recall affected: missing 1/1 expected evidence: #1 Software Engineering/11 AI & ML/LLM/RAG/Evaluation.md heading=\"Retrieval Metrics\"."));
        diagnosticMessages.Should().Contain(message => message.Contains("Closest same-source misses: rank 1 heading=\"Questions\" expectedHeading=\"Retrieval Metrics\" reason=expected heading/snippet absent."));
        diagnosticMessages.Should().HaveCount(2);

        var precisionMetric = result.Metrics["PrecisionAtK"];
        precisionMetric.Reason.Should().Be("Precision@k measures annotated context purity: relevant retrieved chunks divided by retrieved chunks. With sparse expected evidence, a case with one credited chunk in top-5 scores 0.2 even when that chunk is sufficient.");
        precisionMetric.Interpretation!.Rating.Should().Be(EvaluationRating.Unacceptable);
        precisionMetric.Interpretation.Reason.Should().Be("Score 0 (Unacceptable): 0/1 retrieved chunks counted as relevant evidence.");

        var hitRateMetric = result.Metrics["HitRateAtK"];
        hitRateMetric.Reason.Should().Be("HitRate@k measures whether at least one expected evidence item appeared in top-k.");
        hitRateMetric.Interpretation!.Rating.Should().Be(EvaluationRating.Unacceptable);
        hitRateMetric.Interpretation.Reason.Should().Be("Score 0 (Unacceptable): no expected evidence item appeared in top-k.");

        var reciprocalRankMetric = result.Metrics["ReciprocalRank"];
        reciprocalRankMetric.Reason.Should().Be("ReciprocalRank measures ranking quality: 1 divided by the rank of the first relevant evidence chunk. High means useful evidence appears early; 0 means no relevant evidence appeared in top-k.");
        reciprocalRankMetric.Interpretation!.Rating.Should().Be(EvaluationRating.Unacceptable);
        reciprocalRankMetric.Interpretation.Reason.Should().Be("Score 0 (Unacceptable): no retrieved chunk matched the expected evidence.");
    }

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

        result.Metrics["PrecisionAtK"].Interpretation!.Reason.Should().Contain("Score 0.5 (Good)");
        result.Metrics["ReciprocalRank"].Interpretation!.Reason.Should().Contain("Score 0.5 (Good)");
    }

    [Fact]
    public void ComputeSummaryMetrics_RatesAggregateMetrics()
    {
        var predictions = new[]
        {
            new SearchPrediction("first query", [Document(EvaluationPath)], [Document(EvaluationPath)]),
            new SearchPrediction("second query", [Document(EvaluationPath)], []),
            new SearchPrediction("third query", [Document(ChunkingPath)], [Document(IrrelevantPath), Document(ChunkingPath)]),
        };

        var metrics = SearchEvaluator.ComputeSummaryMetrics(predictions, topK: 5)["MarkdownSection"].ToDictionary(metric => metric.Name);

        metrics["RecallAtK"].Rating.Should().Be(EvaluationRating.Average);
        metrics["PrecisionAtK"].Rating.Should().Be(EvaluationRating.Good);
        metrics["HitRateAtK"].Rating.Should().Be(EvaluationRating.Average);
        metrics["ReciprocalRank"].Rating.Should().Be(EvaluationRating.Good);
        metrics["EmptyResultRate"].Rating.Should().Be(EvaluationRating.Poor);
    }

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
            [Document(EvaluationPath, RetrievalHeading, "MRR rewards pushing the first relevant result higher")],
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
            new SearchPrediction("first query", [Document(EvaluationPath)], [Document(EvaluationPath)]),
            new SearchPrediction("second query", [Document(EvaluationPath)], []),
            new SearchPrediction("third query", [Document(ChunkingPath)], [Document(IrrelevantPath), Document(ChunkingPath)]),
        };

        // Act
        var report = SearchMetricCalculator.Evaluate(predictions, topK: 5);

        // Assert
        report.QueryCount.Should().Be(3);
        report.RecallAtK.Should().BeApproximately(2d / 3d, 0.000001);
        report.PrecisionAtK.Should().BeApproximately(0.5, 0.000001);
        report.HitRateAtK.Should().BeApproximately(2d / 3d, 0.000001);
        report.MeanReciprocalRank.Should().BeApproximately(0.5, 0.000001);
        report.EmptyResultRate.Should().BeApproximately(1d / 3d, 0.000001);
    }

    private static SearchPrediction Prediction(
        string query,
        IReadOnlyList<SearchDocument> expectedDocuments,
        IReadOnlyList<SearchDocument> retrievedDocuments) =>
        new(query, expectedDocuments, retrievedDocuments);

    private static SearchDocument Document(string sourcePath, string? heading = null, string? snippet = null) =>
        new(sourcePath, heading, snippet);
}
