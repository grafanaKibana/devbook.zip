namespace DevBook.Tests.Unit.Evaluation;

using FluentAssertions;
using DevBook.Data.Models;
using DevBook.Evaluations.Scenarios.RAG.Search;
using static DevBook.Tests.Unit.Evaluation.SearchEvaluationTestData;

/// <summary>
/// Unit tests for <see cref="SearchMetricCalculator"/> per-query scoring and aggregate evaluation.
/// </summary>
public sealed class SearchMetricCalculatorTests
{
    #region ScoreQuery

    /// <summary>
    /// Returns perfect retrieval metrics when the first retrieved document exactly matches the expected evidence.
    /// </summary>
    [Fact]
    public void ScoreQuery_PerfectHit_ReturnsPerfectMetrics()
    {
        // Arrange
        var prediction = Prediction(
            "perfect hit",
            expectedDocuments: [Document(EvaluationPath, RetrievalHeading, RetrievalSnippet)],
            retrievedDocuments: [Document(EvaluationPath, "Retrieval Metrics and more", RetrievalChunkText)]);

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
    /// Matches a chunk-id-free expectation against a retrieval that uses a different source representation
    /// (citation label vs. vault path) and chunk boundaries, so one golden case can score any chunking strategy.
    /// </summary>
    [Fact]
    public void ScoreQuery_ChunkerNeutralIdentity_MatchesAcrossSourceRepresentations()
    {
        // Arrange: expected evidence is keyed only by citation label + snippet (no chunk id); the retrieval uses
        // the full vault path and a differently-cut chunk that still contains the gold snippet.
        var prediction = Prediction(
            "chunker-neutral",
            expectedDocuments: [Document("Evaluation", RetrievalHeading, RetrievalSnippet)],
            retrievedDocuments: [Document(EvaluationPath, RetrievalHeading, RetrievalChunkText)]);

        // Act
        var result = SearchMetricCalculator.ScoreQuery(prediction);

        // Assert
        result.RBasedMetrics.RecallAtR.Should().Be(1);
        result.SectionMetrics.RecallAtR.Should().Be(1);
        result.Diagnostics.MissingExpectedSourcePaths.Should().BeEmpty();
    }

    /// <summary>
    /// Credits a headingless retrieved chunk (as produced by FixedSize and Semantic chunking) against a shared
    /// golden section when its text contains the expected snippet, so chunkers that drop heading metadata are
    /// not unfairly zeroed on section-level metrics.
    /// </summary>
    [Fact]
    public void ScoreQuery_HeadinglessRetrieval_CreditsSectionBySnippet()
    {
        // Arrange: the golden section carries a heading, but the retrieved FixedSize chunk has no heading and
        // only matches by containing the snippet.
        var prediction = Prediction(
            "headingless section credit",
            expectedDocuments: [Document(EvaluationPath, RetrievalHeading, RetrievalSnippet)],
            retrievedDocuments: [Document(EvaluationPath, heading: null, snippet: RetrievalChunkText)],
            chunkingStrategy: ChunkingStrategyKind.FixedSize);

        // Act
        var result = SearchMetricCalculator.ScoreQuery(prediction);

        // Assert
        result.RBasedMetrics.RecallAtR.Should().Be(1);
        result.SectionMetrics.RecallAtR.Should().Be(1);
        result.SectionMetrics.HitRateAt1.Should().Be(1);
    }

    /// <summary>
    /// Returns partial retrieval metrics when only one of multiple expected sources is retrieved.
    /// </summary>
    [Fact]
    public void ScoreQuery_PartialHit_ReturnsPartialMetrics()
    {
        // Arrange
        var prediction = Prediction(
            "partial hit",
            expectedDocuments:
            [
                Document(EvaluationPath, RetrievalHeading, RetrievalSnippet),
                Document(ChunkingPath, ParentChildHeading, ChildChunkSnippet)
            ],
            retrievedDocuments:
            [
                Document(EvaluationPath, RetrievalHeading, RetrievalChunkText),
                Document(IrrelevantPath, CompositeHeading, IrrelevantSnippet)
            ]);

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
    /// Returns zero metrics when no retrieved document matches the expected evidence.
    /// </summary>
    [Fact]
    public void ScoreQuery_NoHit_ReturnsZeroMetrics()
    {
        // Arrange
        var prediction = Prediction(
            "no hit",
            expectedDocuments: [Document(EvaluationPath, RetrievalHeading, UnmatchedSnippet)],
            retrievedDocuments: [Document(ChunkingPath, ParentChildHeading, "different source")]);

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
    /// Does not count a source-path match as relevant when the required heading and snippet evidence differ.
    /// </summary>
    [Fact]
    public void ScoreQuery_SourcePathMatchesButEvidenceDiffers_ReturnsNoRelevantMatch()
    {
        // Arrange
        var prediction = Prediction(
            "source document match",
            expectedDocuments: [Document(EvaluationPath, RetrievalHeading, UnmatchedSnippet)],
            retrievedDocuments: [Document(EvaluationPath, "Other heading", "different snippet")]);

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
    /// Credits the right chunk id even when the retrieved heading and snippet differ, because chunk identity
    /// is authoritative when present.
    /// </summary>
    [Fact]
    public void ScoreQuery_ChunkIdMatchesExpectedEvidence_ReturnsRelevantMatchWithoutSnippetCheck()
    {
        // Arrange
        var prediction = Prediction(
            "generated chunk hit",
            expectedDocuments: [Document("[[Prompt Composition]]", chunkId: "chunk-1", documentId: "doc-1")],
            retrievedDocuments:
            [
                Document(
                    "Home/11 AI & ML/LLM/Prompt Composition.md",
                    "Different heading",
                    "retrieved chunk text without generated preview",
                    chunkId: "chunk-1",
                    documentId: "doc-1")
            ]);

        // Act
        var result = SearchMetricCalculator.ScoreQuery(prediction);

        // Assert
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
    /// Counts a retrieved document as relevant when the heading matches expected evidence, even with different chunk text.
    /// </summary>
    [Fact]
    public void ScoreQuery_HeadingMatchesExpectedEvidence_ReturnsRelevantMatch()
    {
        // Arrange
        var prediction = Prediction(
            "evidence hit",
            expectedDocuments: [Document(EvaluationPath, RetrievalHeading)],
            retrievedDocuments: [Document(EvaluationPath, RetrievalHeading, "different chunk text")]);

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
    /// Applies the same heading fallback to Semantic chunking as to other chunkers, so a headingless chunk whose
    /// text omits the expected heading earns no relevant match.
    /// </summary>
    [Fact]
    public void ScoreQuery_SemanticStrategyUsesSameHeadingFallbackAsOtherChunkers_ReturnsNoRelevantMatch()
    {
        // Arrange
        var prediction = Prediction(
            "semantic evidence hit",
            expectedDocuments: [Document(EvaluationPath, RetrievalHeading)],
            retrievedDocuments: [Document(EvaluationPath, heading: null, snippet: "semantic chunk crosses source sections")],
            chunkingStrategy: ChunkingStrategyKind.Semantic);

        // Act
        var result = SearchMetricCalculator.ScoreQuery(prediction);

        // Assert
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
    /// Uses the rank of the first relevant result to compute reciprocal rank.
    /// </summary>
    [Fact]
    public void ScoreQuery_FirstRelevantSourceAtSecondRank_ReturnsReciprocalRankForSecondRank()
    {
        // Arrange
        var prediction = Prediction(
            "rank two hit",
            expectedDocuments: [Document(EvaluationPath)],
            retrievedDocuments: [Document(ChunkingPath), Document(EvaluationPath)]);

        // Act
        var result = SearchMetricCalculator.ScoreQuery(prediction);

        // Assert
        result.RecallAtK.Should().Be(1);
        result.PrecisionAtK.Should().Be(0.5);
        result.HitRateAtK.Should().Be(1);
        result.ReciprocalRank.Should().Be(0.5);
    }

    /// <summary>
    /// Computes R-based and section ranking metrics across multiple expected chunks spanning two sources.
    /// </summary>
    [Fact]
    public void ScoreQuery_MultipleExpectedChunks_ReturnsRBasedMetrics()
    {
        // Arrange
        var prediction = Prediction(
            "r based query",
            expectedDocuments:
            [
                Document(EvaluationPath, RetrievalHeading, RetrievalSnippet, chunkId: "eval-1"),
                Document(EvaluationPath, QuestionsHeading, "interview", chunkId: "eval-2"),
                Document(ChunkingPath, ParentChildHeading, ChildChunkSnippet, chunkId: "chunking-1")
            ],
            retrievedDocuments:
            [
                Document(EvaluationPath, RetrievalHeading, RetrievalChunkText, chunkId: "eval-1"),
                Document(IrrelevantPath, CompositeHeading, IrrelevantSnippet),
                Document(ChunkingPath, ParentChildHeading, "search child chunks evidence", chunkId: "chunking-1"),
                Document(EvaluationPath, QuestionsHeading, "interview prompts", chunkId: "eval-2")
            ]);

        // Act
        var result = SearchMetricCalculator.ScoreQuery(prediction, topK: 10);

        // Assert
        result.RBasedMetrics.RecallAtR.Should().BeApproximately(2d / 3d, 0.000001);
        result.RBasedMetrics.RPrecision.Should().BeApproximately(2d / 3d, 0.000001);
        result.SectionMetrics.RecallAtR.Should().BeApproximately(2d / 3d, 0.000001);
        result.SectionMetrics.RPrecision.Should().BeApproximately(2d / 3d, 0.000001);
        result.SectionMetrics.HitRateAt1.Should().Be(1);
        result.SectionMetrics.MeanReciprocalRankAtK.Should().Be(1);
        result.SectionMetrics.MeanAveragePrecisionAtK.Should().BeApproximately((1d + (2d / 3d) + (3d / 4d)) / 3d, 0.000001);
        result.SectionMetrics.NormalizedDiscountedCumulativeGainAtK.Should().BeApproximately(
            (1d + (1d / Math.Log2(4)) + (1d / Math.Log2(5))) / (1d + (1d / Math.Log2(3)) + (1d / Math.Log2(4))),
            0.000001);
    }

    /// <summary>
    /// Collapses duplicate expected chunks into one expected section so section metrics differ from chunk-level R metrics.
    /// </summary>
    [Fact]
    public void ScoreQuery_DuplicateExpectedSection_ReturnsSectionLevelMetrics()
    {
        // Arrange
        var prediction = Prediction(
            "section level query",
            expectedDocuments:
            [
                Document("[[RAG Patterns#Pattern Selection Guide]]", chunkId: "patterns-1"),
                Document("[[RAG Patterns#Pattern Selection Guide]]", chunkId: "patterns-2"),
                Document("[[Retrieval#Intro]]", chunkId: "retrieval-1")
            ],
            retrievedDocuments:
            [
                Document("Home/11 AI & ML/LLM/RAG/RAG Patterns.md", "Pattern Selection Guide", "baseline first", chunkId: "patterns-1"),
                Document(IrrelevantPath, CompositeHeading, IrrelevantSnippet),
                Document("Home/11 AI & ML/LLM/RAG/Retrieval.md", "Intro", "retrieval mechanics", chunkId: "retrieval-1")
            ]);

        // Act
        var result = SearchMetricCalculator.ScoreQuery(prediction, topK: 10);

        // Assert
        result.RBasedMetrics.RecallAtR.Should().BeApproximately(2d / 3d, 0.000001);
        result.SectionMetrics.RecallAtR.Should().Be(0.5);
        result.SectionMetrics.RPrecision.Should().Be(0.5);
        result.SectionMetrics.MeanAveragePrecisionAtK.Should().BeApproximately(5d / 6d, 0.000001);
        result.SectionMetrics.NormalizedDiscountedCumulativeGainAtK.Should().BeApproximately(
            (1d + (1d / Math.Log2(4))) / (1d + (1d / Math.Log2(3))),
            0.000001);
    }

    /// <summary>
    /// Reports score-analysis metrics that separate credited from uncredited same-source chunk scores.
    /// </summary>
    [Fact]
    public void ScoreQuery_ScoredResults_ReturnsScoreAnalysisMetrics()
    {
        // Arrange
        var prediction = Prediction(
            "score analysis query",
            expectedDocuments: [Document(EvaluationPath, RetrievalHeading, RetrievalSnippet)],
            retrievedDocuments:
            [
                Document(EvaluationPath, RetrievalHeading, RetrievalChunkText, score: 0.8),
                Document(EvaluationPath, RetrievalHeading, RetrievalChunkText, score: 0.75),
                Document(IrrelevantPath, CompositeHeading, IrrelevantSnippet, score: 0.7)
            ]);

        // Act
        var result = SearchMetricCalculator.ScoreQuery(prediction);

        // Assert
        result.ScoreAverage.Should().BeApproximately(0.75, 0.000001);
        result.CreditedScoreAverage.Should().BeApproximately(0.8, 0.000001);
        result.UncreditedScoreAverage.Should().BeApproximately(0.725, 0.000001);
        result.CreditedToUncreditedSameSourceScoreGap.Should().BeApproximately(0.05, 0.000001);
    }

    /// <summary>
    /// Records duplicate retrieved source paths while still counting precision against every retrieved result.
    /// </summary>
    [Fact]
    public void ScoreQuery_DuplicateRetrievedSources_ReturnsDuplicateDiagnostics()
    {
        // Arrange
        var prediction = Prediction(
            "duplicate retrieved source",
            expectedDocuments: [Document(EvaluationPath, RetrievalHeading, RetrievalSnippet)],
            retrievedDocuments:
            [
                Document(EvaluationPath, RetrievalHeading, RetrievalChunkText),
                Document(EvaluationPath, RetrievalHeading, RetrievalChunkText),
                Document(IrrelevantPath, CompositeHeading, IrrelevantSnippet)
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
    /// Produces report-facing expected-document and per-rank match diagnostics for a query with mixed evidence.
    /// </summary>
    [Fact]
    public void ScoreQuery_MixedEvidence_ReturnsReadableDiagnostics()
    {
        // Arrange
        var prediction = Prediction(
            "diagnostic query",
            expectedDocuments:
            [
                Document(EvaluationPath, RetrievalHeading, RetrievalSnippet),
                Document(ChunkingPath, ParentChildHeading, ChildChunkSnippet)
            ],
            retrievedDocuments:
            [
                Document(EvaluationPath, QuestionsHeading, "different chunk"),
                Document(ChunkingPath, ParentChildHeading, "different chunk with search child chunks evidence"),
                Document(ChunkingPath, ParentChildHeading, "different chunk")
            ]);

        // Act
        var result = SearchMetricCalculator.ScoreQuery(prediction);

        // Assert
        result.Diagnostics.ExpectedDocuments.Should().BeEquivalentTo([
            new { Index = 1, SourcePath = EvaluationPath, Heading = RetrievalHeading, SnippetPreview = RetrievalSnippet, Matched = false },
            new { Index = 2, SourcePath = ChunkingPath, Heading = ParentChildHeading, SnippetPreview = ChildChunkSnippet, Matched = true }
        ]);
        result.Diagnostics.Matches.Should().BeEquivalentTo([
            new
            {
                Rank = 1,
                SourcePath = EvaluationPath,
                Heading = QuestionsHeading,
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
                Heading = ParentChildHeading,
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
                Heading = ParentChildHeading,
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

    #endregion

    #region Evaluate

    /// <summary>
    /// Aggregates query count, ranking metrics, R-based and section metrics, empty-result rate, and score gaps across queries.
    /// </summary>
    [Fact]
    public void Evaluate_MixedQueryResults_ReturnsAggregateMetrics()
    {
        // Arrange
        var predictions = new[]
        {
            Prediction("first query", expectedDocuments: [Document(EvaluationPath)], retrievedDocuments: [Document(EvaluationPath, score: 0.9)]),
            Prediction("second query", expectedDocuments: [Document(EvaluationPath)], retrievedDocuments: []),
            Prediction("third query", expectedDocuments: [Document(ChunkingPath)], retrievedDocuments: [Document(IrrelevantPath, score: 0.7), Document(ChunkingPath, score: 0.8)]),
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
        report.RBasedMetrics.RecallAtR.Should().BeApproximately(1d / 3d, 0.000001);
        report.RBasedMetrics.RPrecision.Should().BeApproximately(1d / 3d, 0.000001);
        report.SectionMetrics.RecallAtR.Should().BeApproximately(1d / 3d, 0.000001);
        report.SectionMetrics.RPrecision.Should().BeApproximately(1d / 3d, 0.000001);
        report.EmptyResultRate.Should().BeApproximately(1d / 3d, 0.000001);
        report.ScoreAverage.Should().BeApproximately(0.825, 0.000001);
        report.CreditedScoreAverage.Should().BeApproximately(0.85, 0.000001);
        report.UncreditedScoreAverage.Should().BeApproximately(0.7, 0.000001);
        report.CreditedToUncreditedSameSourceScoreGap.Should().Be(0);
    }

    #endregion
}
