namespace KnowledgeHub.Tests.Unit.Services;

using FluentAssertions;
using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Options;
using KnowledgeHub.Data.Repositories;
using KnowledgeHub.Data.Services;
using KnowledgeHub.Tests.Common;
using Microsoft.Extensions.Options;
using Moq;

public sealed class RagSearchServiceTests
{
    private const string QueryWithWhitespace = "  vector search  ";
    private const string NormalizedQuery = "vector search";
    private const string SearchMode = "vector";

    /// <summary>
    /// Protects the API boundary from running paid embeddings and vector search for an empty user query.
    /// </summary>
    [Fact]
    public async Task SearchAsync_RejectsBlankQuery()
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
    /// Protects the retrieval contract by trimming the query, clamping TopK, and sending the generated query vector to the repository.
    /// </summary>
    [Theory]
    [InlineData(0, 5)]
    [InlineData(-1, 5)]
    [InlineData(3, 3)]
    [InlineData(50, 10)]
    public async Task SearchAsync_TrimsQueryAndNormalizesTopK(int requestedTopK, int expectedTopK)
    {
        // Arrange
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

        // Act
        var response = await service.SearchAsync(new RagSearchRequest(QueryWithWhitespace, requestedTopK));

        // Assert
        response.Should().BeEquivalentTo(new
        {
            Query = NormalizedQuery,
            Mode = SearchMode,
            Results = expectedResults,
        });
        capturedVector.Should().Equal([13f, 0f]);
    }

    private static RagSearchService CreateService(Mock<IChunkRepository> repository)
    {
        var generator = EmbeddingGeneratorMockFactory.CreateByInputLength();
        var embeddingService = new EmbeddingService(generator.Object, Options.Create(new EmbeddingOptions()));

        return new RagSearchService(embeddingService, repository.Object);
    }
}
