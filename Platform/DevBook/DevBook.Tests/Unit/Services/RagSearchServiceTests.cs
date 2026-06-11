namespace DevBook.Tests.Unit.Services;

using FluentAssertions;
using DevBook.Data.Models;
using DevBook.Data.Options;
using DevBook.Data.Repositories;
using DevBook.Data.Services;
using DevBook.Data.Services.Reranking;
using DevBook.Tests.Common;
using Microsoft.Extensions.Options;
using Moq;

public sealed class RagSearchServiceTests
{
    private const string QueryWithWhitespace = "  vector search  ";
    private const string NormalizedQuery = "vector search";
    private const string SearchMode = "vector+Bm25";

    /// <summary>
    /// Tests that search rejects an empty query before generating embeddings or executing vector search.
    /// </summary>
    [Fact]
    public async Task SearchAsync_EmptyQuery_ThrowsArgumentException()
    {
        // Arrange
        var service = CreateService(new Mock<IChunkRepository>(MockBehavior.Strict));

        // Act
        var action = async () => await service.SearchAsync(new RagSearchRequest("   ", 5));

        // Assert
        await action.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Query is required.");
    }

    /// <summary>
    /// Tests that search normalizes query text and TopK before passing the generated query vector to the repository.
    /// </summary>
    [Theory]
    [InlineData(0, 5)]
    [InlineData(-1, 5)]
    [InlineData(3, 3)]
    [InlineData(50, 10)]
    public async Task SearchAsync_QueryWithWhitespaceAndUnnormalizedTopK_CallsVectorSearchWithExpandedCandidateCount(int requestedTopK, int expectedTopK)
    {
        // Arrange
        var expectedCandidateCount = expectedTopK * 4;
        var expectedResults = new[]
        {
            new RagChunkResponse("chunk-1", "doc-1", "vector search exact match", "Heading", "[[Doc#Heading]]", 0.93),
        };
        float[]? capturedVector = null;
        var repository = new Mock<IChunkRepository>(MockBehavior.Strict);
        repository.Setup(mock => mock.VectorSearchAsync(
                It.IsAny<float[]>(),
                expectedCandidateCount,
                It.IsAny<CancellationToken>()))
            .Callback<float[], int, CancellationToken>((vector, _, _) => capturedVector = vector)
            .ReturnsAsync(expectedResults);
        var service = CreateService(repository);

        // Act
        var response = await service.SearchAsync(new RagSearchRequest(QueryWithWhitespace, requestedTopK));

        // Assert
        response.Query.Should().Be(NormalizedQuery);
        response.Mode.Should().Be(SearchMode);
        response.Results.Should().ContainSingle();
        response.Results[0].Should().BeEquivalentTo(expectedResults[0], options => options.Excluding(result => result.Score));
        response.Results[0].Score.Should().BeGreaterThan(0);
        capturedVector.Should().Equal([13f, 0f]);
    }

    [Fact]
    public async Task SearchAsync_FixedSizeStrategy_CreatesFixedSizeRepository()
    {
        // Arrange
        var repository = new Mock<IChunkRepository>(MockBehavior.Strict);
        repository.Setup(mock => mock.VectorSearchAsync(
                It.IsAny<float[]>(),
                20,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        var generator = EmbeddingGeneratorMockFactory.CreateByInputLength();
        var embeddingService = new EmbeddingService(generator.Object, Options.Create(new EmbeddingOptions()));
        var repositoryFactory = new Mock<IChunkRepositoryFactory>(MockBehavior.Strict);
        repositoryFactory.Setup(factory => factory.Create(ChunkingStrategyKind.FixedSize))
            .Returns(repository.Object);
        var service = new RagSearchService(
            embeddingService,
            repositoryFactory.Object,
            CreateRerankingStrategyFactory(),
            Options.Create(new RagSearchOptions { ChunkingStrategy = ChunkingStrategyKind.FixedSize }));

        // Act
        await service.SearchAsync(new RagSearchRequest(QueryWithWhitespace, 5));

        // Assert
        repositoryFactory.Verify(factory => factory.Create(ChunkingStrategyKind.FixedSize), Times.Once);
        repository.Verify(mock => mock.VectorSearchAsync(
            It.IsAny<float[]>(),
            20,
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SearchAsync_RerankingStrategy_ReordersCandidatesAndReturnsRequestedTopK()
    {
        // Arrange
        var candidates = new[]
        {
            new RagChunkResponse("chunk-1", "doc-1", "unrelated text", null, "[[Other]]", 0.99),
            new RagChunkResponse("chunk-2", "doc-2", "vector search should use reranking after retrieval", null, "[[Vector]]", 0.80),
            new RagChunkResponse("chunk-3", "doc-3", "another unrelated text", null, "[[Another]]", 0.70),
        };
        var repository = new Mock<IChunkRepository>(MockBehavior.Strict);
        repository.Setup(mock => mock.VectorSearchAsync(
                It.IsAny<float[]>(),
                8,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(candidates);
        var service = CreateService(repository, RerankingStrategyKind.ReciprocalRankFusion);

        // Act
        var response = await service.SearchAsync(new RagSearchRequest(QueryWithWhitespace, 2));

        // Assert
        response.Results.Should().HaveCount(2);
        response.Results[0].ChunkId.Should().Be("chunk-2");
    }

    private static RagSearchService CreateService(
        Mock<IChunkRepository> repository,
        RerankingStrategyKind rerankingStrategy = RerankingStrategyKind.Bm25)
    {
        var generator = EmbeddingGeneratorMockFactory.CreateByInputLength();
        var embeddingService = new EmbeddingService(generator.Object, Options.Create(new EmbeddingOptions()));
        var repositoryFactory = new Mock<IChunkRepositoryFactory>(MockBehavior.Strict);
        repositoryFactory.Setup(factory => factory.Create(ChunkingStrategyKind.MarkdownSection))
            .Returns(repository.Object);

        return new RagSearchService(
            embeddingService,
            repositoryFactory.Object,
            CreateRerankingStrategyFactory(),
            Options.Create(new RagSearchOptions { RerankingStrategy = rerankingStrategy }));
    }

    private static IRerankingStrategyFactory CreateRerankingStrategyFactory() => new RerankingStrategyFactory(
    [
        new Bm25RerankingStrategy(),
        new MaximalMarginalRelevanceRerankingStrategy(),
        new ReciprocalRankFusionRerankingStrategy(),
        new NoRerankingStrategy(),
    ]);
}
