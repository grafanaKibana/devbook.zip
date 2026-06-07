namespace KnowledgeHub.Tests.Unit.Services.Reranking;

using FluentAssertions;
using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Services.Reranking;

public sealed class RerankingStrategyTests
{
    [Fact]
    public void NoReranking_Rerank_PreservesVectorOrderAndScores()
    {
        var strategy = new NoRerankingStrategy();

        var results = strategy.Rerank("reciprocal rank fusion", Candidates(), topK: 2);

        results.Should().HaveCount(2);
        results.Select(result => result.ChunkId).Should().Equal("generic", "rrf");
        results[0].Score.Should().Be(0.99);
    }

    [Fact]
    public void CrossEncoderLexical_Rerank_PromotesBestJointLexicalMatch()
    {
        var strategy = new CrossEncoderLexicalRerankingStrategy();

        var results = strategy.Rerank("reciprocal rank fusion", Candidates(), topK: 2);

        results.Should().HaveCount(2);
        results[0].ChunkId.Should().Be("rrf");
        results[0].Score.Should().BeInRange(0, 1);
        results[0].Score.Should().BeGreaterThan(0.7);
    }

    [Fact]
    public void LateInteraction_Rerank_PromotesTokenLevelApproximateMatch()
    {
        var strategy = new LateInteractionRerankingStrategy();

        var results = strategy.Rerank("semantic chunking", Candidates(), topK: 2);

        results.Should().HaveCount(2);
        results[0].ChunkId.Should().Be("semantic");
        results[0].Score.Should().BeInRange(0, 1);
    }

    [Fact]
    public void ReciprocalRankFusion_Rerank_FusesVectorAndLexicalRanks()
    {
        var strategy = new ReciprocalRankFusionRerankingStrategy();

        var results = strategy.Rerank("reciprocal rank fusion", Candidates(), topK: 2);

        results.Should().HaveCount(2);
        results[0].ChunkId.Should().Be("rrf");
        results[0].Score.Should().BeInRange(0, 1);
        results[0].Score.Should().BeGreaterThan(0.95);
    }

    [Fact]
    public void Rerankers_ReturnBoundedScoresForRepeatedQueryTerms()
    {
        var candidates = new[]
        {
            new RagChunkResponse("repeated", "doc-1", "fusion fusion fusion fusion reciprocal rank", null, "[[Repeated]]", 0.9),
            new RagChunkResponse("other", "doc-2", "unrelated content", null, "[[Other]]", 0.8),
        };

        new CrossEncoderLexicalRerankingStrategy()
            .Rerank("reciprocal rank fusion", candidates, topK: 2)
            .Select(result => result.Score)
            .Should().OnlyContain(score => score >= 0 && score <= 1);

        new ReciprocalRankFusionRerankingStrategy()
            .Rerank("reciprocal rank fusion", candidates, topK: 2)
            .Select(result => result.Score)
            .Should().OnlyContain(score => score >= 0 && score <= 1);
    }

    private static IReadOnlyList<RagChunkResponse> Candidates() =>
    [
        new RagChunkResponse("generic", "doc-1", "Generic vector match with high embedding score", null, "[[Generic]]", 0.99),
        new RagChunkResponse("rrf", "doc-2", "Reciprocal rank fusion combines vector rank and lexical rank safely", "Score Fusion", "[[RRF]]", 0.70),
        new RagChunkResponse("semantic", "doc-3", "Semantic chunking keeps related code blocks and prose together", "Chunking", "[[Semantic]]", 0.65),
    ];
}
