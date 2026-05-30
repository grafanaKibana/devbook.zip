namespace KnowledgeHub.Tests.Evaluation;

using FluentAssertions;
using KnowledgeHub.Evaluations.Common.Calculators;
using KnowledgeHub.Evaluations.Scenarios.RAGSearch;

public sealed class RAGSearchMetricCalculatorTests
{
    [Fact]
    public void ScoreQuery_ReturnsPerfectMetricsForPerfectHit()
    {
        var result = RAGSearchMetricCalculator.ScoreQuery(
            new RAGSearchPrediction(
                string.Empty,
                "perfect hit",
                [new RAGSearchDocument("Software Engineering/11 AI & ML/LLM/RAG/Evaluation.md", "Retrieval Metrics", "Recall@k is primary")],
                [new RAGSearchDocument("Software Engineering/11 AI & ML/LLM/RAG/Evaluation.md", "Retrieval Metrics and more", "Recall@k is primary because the generator cannot use evidence it never sees.")]
            ));

        result.CaseId.Should().BeEmpty();
        result.Query.Should().Be("perfect hit");
        result.ExpectedSourceDocuments.Should().Equal("Software Engineering/11 AI & ML/LLM/RAG/Evaluation.md");
        result.RetrievedSourceDocuments.Should().Equal("Software Engineering/11 AI & ML/LLM/RAG/Evaluation.md");
        result.RecallAtK.Should().Be(1);
        result.PrecisionAtK.Should().Be(1);
        result.ReciprocalRank.Should().Be(1);
        result.FailureReason.Should().BeNull();
        result.Diagnostics.MissingExpectedSourcePaths.Should().BeEmpty();
        result.Diagnostics.DuplicateRetrievedSourcePaths.Should().BeEmpty();
    }

    [Fact]
    public void ScoreQuery_ReturnsPartialMetricsForPartialHit()
    {
        var result = RAGSearchMetricCalculator.ScoreQuery(
            new RAGSearchPrediction(
                string.Empty,
                "partial hit",
                [
                    new RAGSearchDocument("Software Engineering/11 AI & ML/LLM/RAG/Evaluation.md", "Retrieval Metrics", "Recall@k is primary"),
                    new RAGSearchDocument("Software Engineering/11 AI & ML/LLM/RAG/Chunking.md", "Parent-Child Chunking", "search child chunks")
                ],
                [
                    new RAGSearchDocument("Software Engineering/11 AI & ML/LLM/RAG/Evaluation.md", "Retrieval Metrics", "Recall@k is primary because the generator cannot use evidence it never sees."),
                    new RAGSearchDocument("Software Engineering/05 Architecture/Patterns/Design Patterns/Composite.md", "Composite", "irrelevant")
                ]
            ));

        result.RecallAtK.Should().Be(0.5);
        result.PrecisionAtK.Should().Be(0.5);
        result.ReciprocalRank.Should().Be(1);
        result.Diagnostics.MissingExpectedSourcePaths.Should().ContainSingle()
            .Which.Should().Be("Software Engineering/11 AI & ML/LLM/RAG/Chunking.md");
    }

    [Fact]
    public void ScoreQuery_ReturnsZeroMetricsForNoHit()
    {
        var result = RAGSearchMetricCalculator.ScoreQuery(
            new RAGSearchPrediction(
                string.Empty,
                "no hit",
                [new RAGSearchDocument("Software Engineering/11 AI & ML/LLM/RAG/Evaluation.md", "Retrieval Metrics", "MRR rewards pushing the first relevant result higher")],
                [new RAGSearchDocument("Software Engineering/11 AI & ML/LLM/RAG/Chunking.md", "Parent-Child Chunking", "different source")]
            ));

        result.RecallAtK.Should().Be(0);
        result.PrecisionAtK.Should().Be(0);
        result.ReciprocalRank.Should().Be(0);
        result.FailureReason.Should().Be("No relevant source document appeared in the retrieved results.");
        result.Diagnostics.MissingExpectedSourcePaths.Should().ContainSingle();
    }

    [Fact]
    public void ScoreQuery_DoesNotMatchExpectedEvidenceBySourceDocumentOnly()
    {
        var result = RAGSearchMetricCalculator.ScoreQuery(
            new RAGSearchPrediction(
                string.Empty,
                "source document match",
                [new RAGSearchDocument("Software Engineering/11 AI & ML/LLM/RAG/Evaluation.md", "Retrieval Metrics", "MRR rewards pushing the first relevant result higher")],
                [new RAGSearchDocument("Software Engineering/11 AI & ML/LLM/RAG/Evaluation.md", "Other heading", "different snippet")]
            ));

        result.RecallAtK.Should().Be(0);
        result.PrecisionAtK.Should().Be(0);
        result.ReciprocalRank.Should().Be(0);
        result.Diagnostics.Matches.Should().ContainSingle().Which.IsRelevant.Should().BeFalse();
        result.Diagnostics.Matches[0].HeadingMatched.Should().BeFalse();
        result.Diagnostics.Matches[0].SnippetMatched.Should().BeFalse();
    }

    [Fact]
    public void ScoreQuery_MatchesExpectedEvidenceWhenHeadingOrSnippetMatches()
    {
        var result = RAGSearchMetricCalculator.ScoreQuery(
            new RAGSearchPrediction(
                string.Empty,
                "evidence hit",
                [new RAGSearchDocument("Software Engineering/11 AI & ML/LLM/RAG/Evaluation.md", "Retrieval Metrics", "MRR rewards pushing the first relevant result higher")],
                [new RAGSearchDocument("Software Engineering/11 AI & ML/LLM/RAG/Evaluation.md", "Retrieval Metrics", "different chunk text")]
            ));

        result.RecallAtK.Should().Be(1);
        result.PrecisionAtK.Should().Be(1);
        result.ReciprocalRank.Should().Be(1);
        result.Diagnostics.Matches.Should().ContainSingle().Which.HeadingMatched.Should().BeTrue();
    }

    [Fact]
    public void ScoreQuery_DoesNotCountDuplicateRetrievedSourcesTwice()
    {
        var result = RAGSearchMetricCalculator.ScoreQuery(
            new RAGSearchPrediction(
                string.Empty,
                "duplicate retrieved source",
                [new RAGSearchDocument("Software Engineering/11 AI & ML/LLM/RAG/Evaluation.md", "Retrieval Metrics", "Recall@k is primary")],
                [
                    new RAGSearchDocument("Software Engineering/11 AI & ML/LLM/RAG/Evaluation.md", "Retrieval Metrics", "Recall@k is primary because the generator cannot use evidence it never sees."),
                    new RAGSearchDocument("Software Engineering/11 AI & ML/LLM/RAG/Evaluation.md", "Retrieval Metrics", "Recall@k is primary because the generator cannot use evidence it never sees."),
                    new RAGSearchDocument("Software Engineering/05 Architecture/Patterns/Design Patterns/Composite.md", "Composite", "irrelevant")
                ]
            ));

        result.RecallAtK.Should().Be(1);
        result.PrecisionAtK.Should().Be(1d / 3d);
        result.ReciprocalRank.Should().Be(1);
        result.Diagnostics.DuplicateRetrievedSourcePaths.Should().ContainSingle();
    }

    [Fact]
    public void ScoreQuery_ReturnsMrrForFirstRelevantSourceRank()
    {
        var result = RAGSearchMetricCalculator.ScoreQuery(
            new RAGSearchPrediction(
                string.Empty,
                "rank two hit",
                [new RAGSearchDocument("Software Engineering/11 AI & ML/LLM/RAG/Evaluation.md")],
                [
                    new RAGSearchDocument("Software Engineering/11 AI & ML/LLM/RAG/Chunking.md"),
                    new RAGSearchDocument("Software Engineering/11 AI & ML/LLM/RAG/Evaluation.md")
                ]));

        result.RecallAtK.Should().Be(1);
        result.PrecisionAtK.Should().Be(0.5);
        result.ReciprocalRank.Should().Be(0.5);
    }

    [Fact]
    public void Evaluate_ReturnsEmptyResultRateAndPerSourceDocumentSummaries()
    {
        var report = RAGSearchMetricCalculator.Evaluate(
            [
                new RAGSearchPrediction(
                    "case-1",
                    "first query",
                    [new RAGSearchDocument("Software Engineering/11 AI & ML/LLM/RAG/Evaluation.md")],
                    [new RAGSearchDocument("Software Engineering/11 AI & ML/LLM/RAG/Evaluation.md")]),
                new RAGSearchPrediction(
                    "case-2",
                    "second query",
                    [new RAGSearchDocument("Software Engineering/11 AI & ML/LLM/RAG/Evaluation.md")],
                    []),
                new RAGSearchPrediction(
                    "case-3",
                    "third query",
                    [new RAGSearchDocument("Software Engineering/11 AI & ML/LLM/RAG/Chunking.md")],
                    [
                        new RAGSearchDocument("Software Engineering/05 Architecture/Patterns/Design Patterns/Composite.md"),
                        new RAGSearchDocument("Software Engineering/11 AI & ML/LLM/RAG/Chunking.md")
                    ])
            ],
            topK: 5);

        report.RecallAtK.Should().BeApproximately(2d / 3d, 0.000001);
        report.PrecisionAtK.Should().BeApproximately(0.5, 0.000001);
        report.MeanReciprocalRank.Should().BeApproximately(0.5, 0.000001);
        report.EmptyResultRate.Should().BeApproximately(1d / 3d, 0.000001);
        report.Queries.Select(query => query.CaseId).Should().Equal("case-1", "case-2", "case-3");
        report.SourceDocuments.Should().ContainEquivalentOf(new
        {
            SourceDocument = "Software Engineering/11 AI & ML/LLM/RAG/Evaluation.md",
            CaseCount = 2,
            AverageRecallAtK = 0.5,
            AveragePrecisionAtK = 0.5,
            AverageReciprocalRank = 0.5,
            EmptyResultCount = 1
        });
        report.SourceDocuments.Should().ContainEquivalentOf(new
        {
            SourceDocument = "Software Engineering/11 AI & ML/LLM/RAG/Chunking.md",
            CaseCount = 1,
            AverageRecallAtK = 1,
            AveragePrecisionAtK = 0.5,
            AverageReciprocalRank = 0.5,
            EmptyResultCount = 0
        });
    }
}
