namespace KnowledgeHub.Tests.Unit.Evaluation;

using FluentAssertions;
using KnowledgeHub.Evaluations.Common.Calculators;
using KnowledgeHub.Evaluations.Scenarios.RAGSearch;

public sealed class RAGSearchMetricCalculatorTests
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
        var result = RAGSearchMetricCalculator.ScoreQuery(prediction);

        // Assert
        result.Should().BeEquivalentTo(new
        {
            CaseId = string.Empty,
            Query = "perfect hit",
            ExpectedSourceDocuments = new[] { EvaluationPath },
            RetrievedSourceDocuments = new[] { EvaluationPath },
            RecallAtK = 1d,
            PrecisionAtK = 1d,
            ReciprocalRank = 1d,
            FailureReason = (string?)null,
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
        var result = RAGSearchMetricCalculator.ScoreQuery(prediction);

        // Assert
        result.RecallAtK.Should().Be(0.5);
        result.PrecisionAtK.Should().Be(0.5);
        result.ReciprocalRank.Should().Be(1);
        result.Diagnostics.MissingExpectedSourcePaths.Should().ContainSingle().Which.Should().Be(ChunkingPath);
    }

    /// <summary>
    /// Tests that scoring returns zero metrics and a failure reason when no retrieved document matches expected evidence.
    /// </summary>
    [Fact]
    public void ScoreQuery_NoHit_ReturnsZeroMetricsAndFailureReason()
    {
        // Arrange
        var prediction = Prediction(
            "no hit",
            [Document(EvaluationPath, RetrievalHeading, "MRR rewards pushing the first relevant result higher")],
            [Document(ChunkingPath, "Parent-Child Chunking", "different source")]);

        // Act
        var result = RAGSearchMetricCalculator.ScoreQuery(prediction);

        // Assert
        result.Should().BeEquivalentTo(new
        {
            RecallAtK = 0d,
            PrecisionAtK = 0d,
            ReciprocalRank = 0d,
            FailureReason = "No relevant source document appeared in the retrieved results.",
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
        var result = RAGSearchMetricCalculator.ScoreQuery(prediction);

        // Assert
        result.RecallAtK.Should().Be(0);
        result.PrecisionAtK.Should().Be(0);
        result.ReciprocalRank.Should().Be(0);
        result.Diagnostics.Matches.Should().ContainSingle().Which.Should().BeEquivalentTo(new
        {
            IsRelevant = false,
            HeadingMatched = false,
            SnippetMatched = false,
        });
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
        var result = RAGSearchMetricCalculator.ScoreQuery(prediction);

        // Assert
        result.RecallAtK.Should().Be(1);
        result.PrecisionAtK.Should().Be(1);
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
        var result = RAGSearchMetricCalculator.ScoreQuery(prediction);

        // Assert
        result.RecallAtK.Should().Be(1);
        result.PrecisionAtK.Should().Be(1d / 3d);
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
        var result = RAGSearchMetricCalculator.ScoreQuery(prediction);

        // Assert
        result.RecallAtK.Should().Be(1);
        result.PrecisionAtK.Should().Be(0.5);
        result.ReciprocalRank.Should().Be(0.5);
    }

    /// <summary>
    /// Tests that evaluation aggregates query metrics, empty-result rate, query order, and per-source summaries for reports.
    /// </summary>
    [Fact]
    public void Evaluate_MixedQueryResults_ReturnsAggregateMetricsAndSourceSummaries()
    {
        // Arrange
        var predictions = new[]
        {
            new RAGSearchPrediction("case-1", "first query", [Document(EvaluationPath)], [Document(EvaluationPath)]),
            new RAGSearchPrediction("case-2", "second query", [Document(EvaluationPath)], []),
            new RAGSearchPrediction("case-3", "third query", [Document(ChunkingPath)], [Document(IrrelevantPath), Document(ChunkingPath)]),
        };

        // Act
        var report = RAGSearchMetricCalculator.Evaluate(predictions, topK: 5);

        // Assert
        report.RecallAtK.Should().BeApproximately(2d / 3d, 0.000001);
        report.PrecisionAtK.Should().BeApproximately(0.5, 0.000001);
        report.MeanReciprocalRank.Should().BeApproximately(0.5, 0.000001);
        report.EmptyResultRate.Should().BeApproximately(1d / 3d, 0.000001);
        report.Queries.Select(query => query.CaseId).Should().Equal("case-1", "case-2", "case-3");
        report.SourceDocuments.Should().ContainEquivalentOf(new
        {
            SourceDocument = EvaluationPath,
            CaseCount = 2,
            AverageRecallAtK = 0.5,
            AveragePrecisionAtK = 0.5,
            AverageReciprocalRank = 0.5,
            EmptyResultCount = 1
        });
        report.SourceDocuments.Should().ContainEquivalentOf(new
        {
            SourceDocument = ChunkingPath,
            CaseCount = 1,
            AverageRecallAtK = 1,
            AveragePrecisionAtK = 0.5,
            AverageReciprocalRank = 0.5,
            EmptyResultCount = 0
        });
    }

    private static RAGSearchPrediction Prediction(
        string query,
        IReadOnlyList<RAGSearchDocument> expectedDocuments,
        IReadOnlyList<RAGSearchDocument> retrievedDocuments) =>
        new(string.Empty, query, expectedDocuments, retrievedDocuments);

    private static RAGSearchDocument Document(string sourcePath, string? heading = null, string? snippet = null) =>
        new(sourcePath, heading, snippet);
}
