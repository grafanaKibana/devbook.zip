namespace KnowledgeHub.Tests.Unit.Services.Reranking;

using FluentAssertions;
using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Services.Reranking;

public sealed class RerankingStrategyTests
{
    [Fact]
    public async Task NoReranking_Rerank_PreservesVectorOrderAndScores()
    {
        var strategy = new NoRerankingStrategy();

        var results = await strategy.RerankAsync("reciprocal rank fusion", Candidates(), topK: 2);

        results.Should().HaveCount(2);
        results.Select(result => result.ChunkId).Should().Equal("generic", "rrf");
        results[0].Score.Should().Be(0.99);
    }

    [Fact]
    public async Task Bm25_Rerank_PromotesBestLexicalMatch()
    {
        var strategy = new Bm25RerankingStrategy();

        var results = await strategy.RerankAsync("reciprocal rank fusion", Candidates(), topK: 2);

        results.Should().HaveCount(2);
        results[0].ChunkId.Should().Be("rrf");
        results[0].Score.Should().BeInRange(0, 1);
        results[0].Score.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task MaximalMarginalRelevance_Rerank_PromotesRelevantDiverseMatches()
    {
        var strategy = new MaximalMarginalRelevanceRerankingStrategy();
        var candidates = new[]
        {
            new RagChunkResponse("duplicate-1", "doc-1", "reciprocal rank fusion reciprocal rank fusion reciprocal rank fusion", null, "[[Duplicate1]]", 0.99),
            new RagChunkResponse("duplicate-2", "doc-2", "reciprocal rank fusion reciprocal rank fusion reciprocal rank fusion", null, "[[Duplicate2]]", 0.98),
            new RagChunkResponse("diverse", "doc-3", "reciprocal rank fusion reranking compares BM25 and MMR", null, "[[Diverse]]", 0.70),
        };

        var results = await strategy.RerankAsync("reciprocal rank fusion reranking", candidates, topK: 2);

        results.Should().HaveCount(2);
        results.Select(result => result.ChunkId).Should().Contain("diverse");
        results.Select(result => result.ChunkId).Should().NotContain("duplicate-2");
        results[0].Score.Should().BeInRange(0, 1);
    }

    [Fact]
    public async Task ReciprocalRankFusion_Rerank_FusesVectorAndLexicalRanks()
    {
        var strategy = new ReciprocalRankFusionRerankingStrategy();

        var results = await strategy.RerankAsync("reciprocal rank fusion", Candidates(), topK: 2);

        results.Should().HaveCount(2);
        results[0].ChunkId.Should().Be("rrf");
        results[0].Score.Should().BeInRange(0, 1);
        results[0].Score.Should().BeGreaterThan(0.95);
    }

    [Fact]
    public async Task Rerankers_ReturnExpectedScoreRangesForRepeatedQueryTerms()
    {
        var candidates = new[]
        {
            new RagChunkResponse("repeated", "doc-1", "fusion fusion fusion fusion reciprocal rank", null, "[[Repeated]]", 0.9),
            new RagChunkResponse("other", "doc-2", "unrelated content", null, "[[Other]]", 0.8),
        };

        (await new Bm25RerankingStrategy()
            .RerankAsync("reciprocal rank fusion", candidates, topK: 2))
            .Select(result => result.Score)
            .Should().OnlyContain(score => score >= 0 && score <= 1);

        (await new MaximalMarginalRelevanceRerankingStrategy()
            .RerankAsync("reciprocal rank fusion", candidates, topK: 2))
            .Select(result => result.Score)
            .Should().OnlyContain(score => score >= 0 && score <= 1);

        (await new ReciprocalRankFusionRerankingStrategy()
            .RerankAsync("reciprocal rank fusion", candidates, topK: 2))
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
