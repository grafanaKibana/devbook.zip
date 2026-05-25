namespace KnowledgeHub.Tests.Services;

using FluentAssertions;
using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Options;
using KnowledgeHub.Data.Repositories;
using KnowledgeHub.Data.Services;
using KnowledgeHub.Tests.TestSupport;
using Microsoft.Extensions.Options;
using Moq;

public sealed class RagSearchServiceTests
{
    [Fact]
    public async Task SearchAsync_RejectsBlankQuery()
    {
        var service = CreateService(new Mock<IChunkRepository>(MockBehavior.Strict));

        var action = async () => await service.SearchAsync(new RagSearchRequest("   ", 5));

        await action.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Query is required.");
    }

    [Theory]
    [InlineData(0, 5)]
    [InlineData(-1, 5)]
    [InlineData(3, 3)]
    [InlineData(50, 10)]
    public async Task SearchAsync_TrimsQueryAndNormalizesTopK(int requestedTopK, int expectedTopK)
    {
        var expectedResults = new[]
        {
            new RagChunkResponse("chunk-1", "doc-1", "Chunk text", "Heading", "[[Doc#Heading]]", 0.93),
        };
        float[]? capturedVector = null;
        var repository = new Mock<IChunkRepository>(MockBehavior.Strict);
        repository.Setup(mock => mock.VectorSearchAsync(
                It.IsAny<float[]>(),
                expectedTopK,
                It.IsAny<CancellationToken>()))
            .Callback<float[], int, CancellationToken>((vector, _, _) => capturedVector = vector)
            .ReturnsAsync(expectedResults);
        var service = CreateService(repository);

        var response = await service.SearchAsync(new RagSearchRequest("  vector search  ", requestedTopK));

        response.Query.Should().Be("vector search");
        response.Mode.Should().Be("vector");
        response.Results.Should().BeSameAs(expectedResults);
        capturedVector.Should().Equal([13f, 0f]);
        repository.VerifyAll();
    }

    private static RagSearchService CreateService(Mock<IChunkRepository> repository)
    {
        var generator = EmbeddingGeneratorMockFactory.CreateByInputLength();
        var embeddingService = new EmbeddingService(generator.Object, Options.Create(new EmbeddingOptions { BatchSize = 10 }));

        return new RagSearchService(embeddingService, repository.Object);
    }
}
