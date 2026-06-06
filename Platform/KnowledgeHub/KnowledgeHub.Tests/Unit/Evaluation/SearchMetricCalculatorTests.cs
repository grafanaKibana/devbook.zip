namespace KnowledgeHub.Tests.Unit.Evaluation;

using FluentAssertions;
using KnowledgeHub.Data.Models;
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
                Score = (double?)null,
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
                Score = (double?)null,
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

        var recallMetric = result.Metrics["RecallAtK"];

        recallMetric.Reason.Should().Be("Recall@k measures evidence coverage: matched expected evidence divided by expected evidence. High means required evidence was present in top-k; low means generation is capped by missing context.");
        recallMetric.Interpretation!.Rating.Should().Be(EvaluationRating.Unacceptable);
        recallMetric.Interpretation.Reason.Should().Be("Score 0 (Unacceptable): matched 0/1 expected evidence items.");
        recallMetric.Diagnostics.Should().BeNullOrEmpty();

        var precisionMetric = result.Metrics["PrecisionAtK"];

        precisionMetric.Reason.Should().Be("Precision@k measures annotated context purity: relevant retrieved chunks divided by retrieved chunks. With sparse expected evidence, a case with one credited chunk in top-5 scores 0.2 even when that chunk is sufficient.");
        precisionMetric.Interpretation!.Rating.Should().Be(EvaluationRating.Unacceptable);
        precisionMetric.Interpretation.Reason.Should().Be("Score 0 (Unacceptable): 0/1 retrieved chunks counted as relevant evidence.");
        precisionMetric.Diagnostics.Should().BeNullOrEmpty();

        var hitRateMetric = result.Metrics["HitRateAtK"];
        hitRateMetric.Reason.Should().Be("HitRate@k measures whether at least one expected evidence item appeared in top-k.");
        hitRateMetric.Interpretation!.Rating.Should().Be(EvaluationRating.Unacceptable);
        hitRateMetric.Interpretation.Reason.Should().Be("Score 0 (Unacceptable): no expected evidence item appeared in top-k.");

        var reciprocalRankMetric = result.Metrics["ReciprocalRank"];
        reciprocalRankMetric.Reason.Should().Be("ReciprocalRank measures ranking quality: 1 divided by the rank of the first relevant evidence chunk. High means useful evidence appears early; 0 means no relevant evidence appeared in top-k.");
        reciprocalRankMetric.Interpretation!.Rating.Should().Be(EvaluationRating.Unacceptable);
        reciprocalRankMetric.Interpretation.Reason.Should().Be("Score 0 (Unacceptable): no retrieved chunk matched the expected evidence.");
        reciprocalRankMetric.Diagnostics.Should().BeNullOrEmpty();

        var scoreAverageMetric = result.Metrics["ScoreAverage"];
        ((NumericMetric)scoreAverageMetric).Value.Should().Be(0.87);
        scoreAverageMetric.Reason.Should().Be("ScoreAverage measures the average vector score across all scored retrieved chunks in top-k.");
        scoreAverageMetric.Interpretation!.Rating.Should().Be(EvaluationRating.Exceptional);
        scoreAverageMetric.Interpretation.Reason.Should().Be("Score 0.87 (Exceptional): average score across scored retrieved chunks.");
        scoreAverageMetric.Diagnostics.Should().BeNullOrEmpty();

        var creditedScoreMetric = result.Metrics["CreditedScoreAverage"];
        ((NumericMetric)creditedScoreMetric).Value.Should().Be(0);
        creditedScoreMetric.Interpretation!.Rating.Should().Be(EvaluationRating.Inconclusive);
        creditedScoreMetric.Interpretation.Reason.Should().Be("Score 0 (Inconclusive): no credited retrieved chunks included vector scores.");

        var uncreditedScoreMetric = result.Metrics["UncreditedScoreAverage"];
        ((NumericMetric)uncreditedScoreMetric).Value.Should().Be(0.87);
        uncreditedScoreMetric.Interpretation!.Rating.Should().Be(EvaluationRating.Exceptional);
        uncreditedScoreMetric.Interpretation.Reason.Should().Be("Score 0.87 (Exceptional): average score across scored uncredited retrieved chunks; uncredited means absent from the sparse expected-evidence set, not necessarily irrelevant.");

        var gapMetric = result.Metrics["CreditedToUncreditedSameSourceScoreGap"];
        ((NumericMetric)gapMetric).Value.Should().Be(0);
        gapMetric.Interpretation!.Rating.Should().Be(EvaluationRating.Inconclusive);
        gapMetric.Interpretation.Reason.Should().Be("Score 0 (Inconclusive): no scored credited and uncredited same-source pair was available.");
    }

    [Fact]
    public async Task SearchEvaluator_EvaluateAsync_RoundsScoreMetricsAndRatesThresholds()
    {
        var prediction = Prediction(
            "rounded score query",
            [Document(EvaluationPath, RetrievalHeading, RetrievalSnippet)],
            [
                Document(EvaluationPath, RetrievalHeading, "Recall@k is primary because the generator cannot use evidence it never sees.", score: 0.87654),
                Document(EvaluationPath, RetrievalHeading, "Recall@k is primary because the generator cannot use evidence it never sees.", score: 0.84321),
                Document(IrrelevantPath, "Composite", "irrelevant", score: 0.18765)
            ]);
        var evaluator = new SearchEvaluator();

        var result = await evaluator.EvaluateAsync(
            [new ChatMessage(ChatRole.User, prediction.Query)],
            new ChatResponse(new ChatMessage(ChatRole.Assistant, "[[Evaluation#Retrieval Metrics]]")),
            additionalContext: [new SearchEvaluationContext(prediction, topK: 5)]);

        var scoreAverageMetric = result.Metrics["ScoreAverage"];
        ((NumericMetric)scoreAverageMetric).Value.Should().Be(0.636);
        scoreAverageMetric.Interpretation!.Rating.Should().Be(EvaluationRating.Good);
        scoreAverageMetric.Interpretation.Reason.Should().Be("Score 0.636 (Good): average score across scored retrieved chunks.");

        var creditedScoreMetric = result.Metrics["CreditedScoreAverage"];
        ((NumericMetric)creditedScoreMetric).Value.Should().Be(0.877);
        creditedScoreMetric.Interpretation!.Rating.Should().Be(EvaluationRating.Exceptional);

        var uncreditedScoreMetric = result.Metrics["UncreditedScoreAverage"];
        ((NumericMetric)uncreditedScoreMetric).Value.Should().Be(0.515);
        uncreditedScoreMetric.Interpretation!.Rating.Should().Be(EvaluationRating.Average);
        uncreditedScoreMetric.Interpretation.Reason.Should().Be("Score 0.515 (Average): average score across scored uncredited retrieved chunks; uncredited means absent from the sparse expected-evidence set, not necessarily irrelevant.");

        var gapMetric = result.Metrics["CreditedToUncreditedSameSourceScoreGap"];
        ((NumericMetric)gapMetric).Value.Should().Be(0.033);
        gapMetric.Interpretation!.Rating.Should().Be(EvaluationRating.Unknown);
        gapMetric.Interpretation.Reason.Should().Be("Score 0.033 (Unknown): credited score minus highest uncredited same-source score; descriptive only.");
    }

    [Fact]
    public async Task SearchEvaluator_EvaluateAsync_RatesLowScoreAverageAsUnacceptable()
    {
        var prediction = Prediction(
            "low score query",
            [Document(EvaluationPath, RetrievalHeading, RetrievalSnippet)],
            [Document(EvaluationPath, RetrievalHeading, "Recall@k is primary because the generator cannot use evidence it never sees.", score: 0.2)]);
        var evaluator = new SearchEvaluator();

        var result = await evaluator.EvaluateAsync(
            [new ChatMessage(ChatRole.User, prediction.Query)],
            new ChatResponse(new ChatMessage(ChatRole.Assistant, "[[Evaluation#Retrieval Metrics]]")),
            additionalContext: [new SearchEvaluationContext(prediction, topK: 5)]);

        var scoreAverageMetric = result.Metrics["ScoreAverage"];

        ((NumericMetric)scoreAverageMetric).Value.Should().Be(0.2);
        scoreAverageMetric.Interpretation!.Rating.Should().Be(EvaluationRating.Unacceptable);
        scoreAverageMetric.Interpretation.Reason.Should().Be("Score 0.2 (Unacceptable): average score across scored retrieved chunks.");

        var creditedScoreMetric = result.Metrics["CreditedScoreAverage"];
        creditedScoreMetric.Interpretation!.Rating.Should().Be(EvaluationRating.Unacceptable);
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

        var metrics = SearchEvaluator.ComputeSummaryMetrics(predictions, topK: 5)["MarkdownSection.CrossEncoderLexical"].ToDictionary(metric => metric.Name);

        metrics["RecallAtK"].Rating.Should().Be(EvaluationRating.Average);
        metrics["PrecisionAtK"].Rating.Should().Be(EvaluationRating.Good);
        metrics["HitRateAtK"].Rating.Should().Be(EvaluationRating.Average);
        metrics["ReciprocalRank"].Rating.Should().Be(EvaluationRating.Good);
        metrics["EmptyResultRate"].Rating.Should().Be(EvaluationRating.Poor);
        metrics.Should().ContainKeys("ScoreAverage", "CreditedScoreAverage", "UncreditedScoreAverage", "CreditedToUncreditedSameSourceScoreGap");
        metrics["ScoreAverage"].Rating.Should().Be(EvaluationRating.Unacceptable);
        metrics["CreditedScoreAverage"].Rating.Should().Be(EvaluationRating.Unacceptable);
        metrics["UncreditedScoreAverage"].Rating.Should().Be(EvaluationRating.Unacceptable);
        metrics["CreditedToUncreditedSameSourceScoreGap"].Rating.Should().Be(EvaluationRating.Unknown);
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

    [Fact]
    public void ScoreQuery_SemanticStrategyDoesNotRequireHeadingEvidence_ReturnsRelevantSourceMatch()
    {
        var prediction = Prediction(
            "semantic evidence hit",
            [Document(EvaluationPath, RetrievalHeading)],
            [Document(EvaluationPath, heading: null, snippet: "semantic chunk crosses source sections")],
            ChunkingStrategyKind.Semantic);

        var result = SearchMetricCalculator.ScoreQuery(prediction);

        result.RecallAtK.Should().Be(1);
        result.PrecisionAtK.Should().Be(1);
        result.Diagnostics.Matches.Should().ContainSingle().Which.Should().BeEquivalentTo(new
        {
            IsRelevant = true,
            SourcePathMatched = true,
            HeadingMatched = false,
            SnippetMatched = false,
            Reason = "Matched expected source path; no heading or snippet was required.",
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
        report.EmptyResultRate.Should().BeApproximately(1d / 3d, 0.000001);
        report.ScoreAverage.Should().BeApproximately(0.825, 0.000001);
        report.CreditedScoreAverage.Should().BeApproximately(0.85, 0.000001);
        report.UncreditedScoreAverage.Should().BeApproximately(0.7, 0.000001);
        report.CreditedToUncreditedSameSourceScoreGap.Should().Be(0);
    }

    private static SearchPrediction Prediction(
        string query,
        IReadOnlyList<SearchDocument> expectedDocuments,
        IReadOnlyList<SearchDocument> retrievedDocuments,
        ChunkingStrategyKind chunkingStrategy = ChunkingStrategyKind.MarkdownSection) =>
        new(query, expectedDocuments, retrievedDocuments, chunkingStrategy);

    private static SearchDocument Document(string sourcePath, string? heading = null, string? snippet = null, double? score = null) =>
        new(sourcePath, heading, snippet, Score: score);
}
