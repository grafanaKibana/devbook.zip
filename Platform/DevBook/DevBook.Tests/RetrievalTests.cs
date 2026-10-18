namespace DevBook.Tests;

using DevBook.Data.Models;
using DevBook.Data.Options;
using DevBook.Data.Repositories;
using DevBook.Data.Services;
using DevBook.Data.Services.Reranking;
using Microsoft.Extensions.Options;
using Moq;

public sealed class RetrievalTests
{
    [Theory]
    [InlineData(0, 5)]
    [InlineData(3, 3)]
    [InlineData(50, 10)]
    public async Task Search_normalizes_query_limits_topK_and_uses_configured_repository(int requested, int expected)
    {
        var embeddings = new Mock<IEmbeddingService>(MockBehavior.Strict);
        embeddings.Setup(e => e.GenerateEmbeddingAsync("vector search", It.IsAny<CancellationToken>())).ReturnsAsync([1f, 0f]);
        var repository = new Mock<IChunkRepository>(MockBehavior.Strict);
        var candidates = Enumerable.Range(0, 12).Select(i => new RagChunkResponse($"chunk-{i}", "doc", "vector search", null, "[[Doc]]", 0.9)).ToArray();
        repository.Setup(r => r.VectorSearchAsync(It.Is<float[]>(v => v.SequenceEqual(new[] { 1f, 0f })),
                RagRetrievalPolicy.GetRerankingCandidateCount(expected), It.IsAny<CancellationToken>())).ReturnsAsync(candidates);
        var factory = new Mock<IChunkRepositoryFactory>(MockBehavior.Strict);
        factory.Setup(f => f.Create(ChunkingStrategyKind.FixedSize)).Returns(repository.Object);
        var service = new RagSearchService(embeddings.Object, factory.Object,
            new RerankingStrategyFactory([new NoRerankingStrategy()]),
            Options.Create(new RagSearchOptions { ChunkingStrategy = ChunkingStrategyKind.FixedSize, RerankingStrategy = RerankingStrategyKind.NoReranking }));
        var result = await service.SearchAsync(new(" vector search ", requested));
        result.Query.Should().Be("vector search");
        result.Mode.Should().Be("vector+NoReranking");
        result.Results.Should().Equal(candidates.Take(expected));
        await Assert.ThrowsAsync<ArgumentException>(() => service.SearchAsync(new("   ", 5)));
        repository.VerifyAll();
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Embedding_batches_respect_provider_limits_and_preserve_order(bool tokenLimit)
    {
        var calls = new List<IReadOnlyList<string>>();
        var service = Embeddings(values =>
        {
            calls.Add(values);
            return values.Select(v => new[] { (float)v.Length }).ToArray();
        });
        var values = tokenLimit
            ? new[] { new string('a', EmbeddingOptions.MaxBatchTokens * 4 - 4), "second", "third" }
            : Enumerable.Range(0, EmbeddingOptions.MaxBatchItems + 1).Select(i => $"chunk-{i}").ToArray();
        (await service.GenerateEmbeddingsAsync([])).Should().BeEmpty();
        calls.Should().BeEmpty();
        var vectors = await service.GenerateEmbeddingsAsync(values);
        calls.Should().HaveCount(2);
        calls[0].Should().HaveCount(tokenLimit ? 1 : EmbeddingOptions.MaxBatchItems);
        calls.SelectMany(batch => batch).Should().Equal(values);
        vectors.Select(v => v.Single()).Should().Equal(values.Select(v => (float)v.Length));
    }

    [Theory]
    [InlineData(RerankingStrategyKind.Bm25)]
    [InlineData(RerankingStrategyKind.ReciprocalRankFusion)]
    public async Task Lexical_and_fused_ranking_promote_relevant_evidence(RerankingStrategyKind kind)
    {
        IRerankingStrategy strategy = kind == RerankingStrategyKind.Bm25
            ? new Bm25RerankingStrategy() : new ReciprocalRankFusionRerankingStrategy();
        var results = await strategy.RerankAsync("reciprocal rank fusion", Candidates(), 2);
        results.Should().HaveCount(2);
        results[0].ChunkId.Should().Be("relevant");
        results.Should().OnlyContain(r => r.Score >= 0 && r.Score <= 1);
    }

    [Fact]
    public async Task Diversity_ranking_avoids_duplicate_evidence()
    {
        var candidates = new[]
        {
            new RagChunkResponse("duplicate-1", "1", "reciprocal rank fusion reciprocal rank fusion reciprocal rank fusion", null, "[[One]]", 0.99),
            new RagChunkResponse("duplicate-2", "2", "reciprocal rank fusion reciprocal rank fusion reciprocal rank fusion", null, "[[Two]]", 0.98),
            new RagChunkResponse("diverse", "3", "reciprocal rank fusion reranking compares BM25 and MMR", null, "[[Three]]", 0.70),
        };
        var results = await new MaximalMarginalRelevanceRerankingStrategy().RerankAsync("reciprocal rank fusion reranking", candidates, 2);
        results.Select(r => r.ChunkId).Should().Contain("diverse").And.NotContain("duplicate-2");
        results.Should().OnlyContain(r => r.Score >= 0 && r.Score <= 1);
    }

    private static RagChunkResponse[] Candidates() =>
    [
        new("generic", "1", "generic vector match", null, "[[Generic]]", 0.99),
        new("relevant", "2", "reciprocal rank fusion combines vector rank and lexical rank safely", null, "[[RRF]]", 0.70),
        new("other", "3", "semantic chunking", null, "[[Other]]", 0.65),
    ];
}
