namespace DevBook.Tests.Unit.Services.Reranking;

using FluentAssertions;
using DevBook.Data.Models;
using DevBook.Data.Services.Reranking;

/// <summary>
/// Contains tests for the reranking strategies.
/// </summary>
public sealed class RerankingStrategyTests
{
    private const string Query = "reciprocal rank fusion";

    /// <summary>
    /// Tests that no-op reranking preserves the original vector order and scores.
    /// </summary>
    [Fact]
    public async Task NoReranking_Rerank_PreservesVectorOrderAndScores()
    {
        // Arrange
        var strategy = new NoRerankingStrategy();

        // Act
        var results = await strategy.RerankAsync(Query, Candidates(), topK: 2);

        // Assert
        results.Should().HaveCount(2);
        results.Select(result => result.ChunkId).Should().Equal("generic", "rrf");
        results[0].Score.Should().Be(0.99);
    }

    /// <summary>
    /// Tests that BM25 reranking promotes the best lexical match.
    /// </summary>
    [Fact]
    public async Task Bm25_Rerank_PromotesBestLexicalMatch()
    {
        // Arrange
        var strategy = new Bm25RerankingStrategy();

        // Act
        var results = await strategy.RerankAsync(Query, Candidates(), topK: 2);

        // Assert
        results.Should().HaveCount(2);
        results[0].ChunkId.Should().Be("rrf");
        results[0].Score.Should().BeInRange(0, 1);
        results[0].Score.Should().BeGreaterThan(0);
    }

    /// <summary>
    /// Tests that maximal marginal relevance reranking promotes relevant but diverse matches.
    /// </summary>
    [Fact]
    public async Task MaximalMarginalRelevance_Rerank_PromotesRelevantDiverseMatches()
    {
        // Arrange
        var strategy = new MaximalMarginalRelevanceRerankingStrategy();
        var candidates = new[]
        {
            new RagChunkResponse("duplicate-1", "doc-1", "reciprocal rank fusion reciprocal rank fusion reciprocal rank fusion", null, "[[Duplicate1]]", 0.99),
            new RagChunkResponse("duplicate-2", "doc-2", "reciprocal rank fusion reciprocal rank fusion reciprocal rank fusion", null, "[[Duplicate2]]", 0.98),
            new RagChunkResponse("diverse", "doc-3", "reciprocal rank fusion reranking compares BM25 and MMR", null, "[[Diverse]]", 0.70),
        };

        // Act
        var results = await strategy.RerankAsync($"{Query} reranking", candidates, topK: 2);

        // Assert
        results.Should().HaveCount(2);
        results.Select(result => result.ChunkId).Should().Contain("diverse");
        results.Select(result => result.ChunkId).Should().NotContain("duplicate-2");
        results[0].Score.Should().BeInRange(0, 1);
    }

    /// <summary>
    /// Tests that reciprocal rank fusion reranking fuses the vector rank and the lexical rank.
    /// </summary>
    [Fact]
    public async Task ReciprocalRankFusion_Rerank_FusesVectorAndLexicalRanks()
    {
        // Arrange
        var strategy = new ReciprocalRankFusionRerankingStrategy();

        // Act
        var results = await strategy.RerankAsync(Query, Candidates(), topK: 2);

        // Assert
        results.Should().HaveCount(2);
        results[0].ChunkId.Should().Be("rrf");
        results[0].Score.Should().BeInRange(0, 1);
        results[0].Score.Should().BeGreaterThan(0.95);
    }

    /// <summary>
    /// Tests that every reranking strategy returns normalized scores within [0, 1] for repeated query terms.
    /// </summary>
    [Fact]
    public async Task Rerankers_ReturnExpectedScoreRangesForRepeatedQueryTerms()
    {
        // Arrange
        var candidates = new[]
        {
            new RagChunkResponse("repeated", "doc-1", "fusion fusion fusion fusion reciprocal rank", null, "[[Repeated]]", 0.9),
            new RagChunkResponse("other", "doc-2", "unrelated content", null, "[[Other]]", 0.8),
        };

        // Act
        var bm25Scores = (await new Bm25RerankingStrategy().RerankAsync(Query, candidates, topK: 2)).Select(result => result.Score);
        var mmrScores = (await new MaximalMarginalRelevanceRerankingStrategy().RerankAsync(Query, candidates, topK: 2)).Select(result => result.Score);
        var rrfScores = (await new ReciprocalRankFusionRerankingStrategy().RerankAsync(Query, candidates, topK: 2)).Select(result => result.Score);

        // Assert
        bm25Scores.Should().OnlyContain(score => score >= 0 && score <= 1);
        mmrScores.Should().OnlyContain(score => score >= 0 && score <= 1);
        rrfScores.Should().OnlyContain(score => score >= 0 && score <= 1);
    }

    private static IReadOnlyList<RagChunkResponse> Candidates() =>
    [
        new RagChunkResponse("generic", "doc-1", "Generic vector match with high embedding score", null, "[[Generic]]", 0.99),
        new RagChunkResponse("rrf", "doc-2", "Reciprocal rank fusion combines vector rank and lexical rank safely", "Score Fusion", "[[RRF]]", 0.70),
        new RagChunkResponse("semantic", "doc-3", "Semantic chunking keeps related code blocks and prose together", "Chunking", "[[Semantic]]", 0.65),
    ];
}
