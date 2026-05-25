namespace KnowledgeHub.Tests.Services;

using FluentAssertions;
using KnowledgeHub.Data.Options;
using KnowledgeHub.Data.Services;
using KnowledgeHub.Tests.TestSupport;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Options;
using Moq;

public sealed class EmbeddingServiceTests
{
    [Fact]
    public async Task GenerateEmbeddingsAsync_ReturnsEmptyListForEmptyInput()
    {
        var generator = new Mock<IEmbeddingGenerator<string, Embedding<float>>>(MockBehavior.Strict);
        var service = new EmbeddingService(generator.Object, Options.Create(new EmbeddingOptions { BatchSize = 2 }));

        var result = await service.GenerateEmbeddingsAsync([]);

        result.Should().BeEmpty();
        generator.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task GenerateEmbeddingsAsync_BatchesInputByConfiguredBatchSize()
    {
        var calls = new List<IReadOnlyList<string>>();
        var generator = EmbeddingGeneratorMockFactory.Create(values =>
        {
            calls.Add(values);
            return values.Select(value => new[] { (float)value.Length }).ToArray();
        });
        var service = new EmbeddingService(generator.Object, Options.Create(new EmbeddingOptions { BatchSize = 2 }));

        await service.GenerateEmbeddingsAsync(["one", "two", "three", "four", "five"]);

        calls.Should().BeEquivalentTo(new[]
        {
            new[] { "one", "two" },
            new[] { "three", "four" },
            new[] { "five" },
        }, options => options.WithStrictOrdering());
    }

    [Fact]
    public async Task GenerateEmbeddingsAsync_PreservesVectorOrderAcrossBatches()
    {
        var generator = EmbeddingGeneratorMockFactory.Create(values => values
            .Select(value => value switch
            {
                "alpha" => new[] { 1f, 10f },
                "beta" => new[] { 2f, 20f },
                "gamma" => new[] { 3f, 30f },
                _ => throw new InvalidOperationException("Unexpected value."),
            })
            .ToArray());
        var service = new EmbeddingService(generator.Object, Options.Create(new EmbeddingOptions { BatchSize = 2 }));

        var result = await service.GenerateEmbeddingsAsync(["alpha", "beta", "gamma"]);

        result.Should().Equal(new[]
        {
            new[] { 1f, 10f },
            new[] { 2f, 20f },
            new[] { 3f, 30f },
        }, (actual, expected) => actual.SequenceEqual(expected));
    }

    [Fact]
    public async Task GenerateEmbeddingsAsync_PropagatesGeneratorException()
    {
        var expected = new InvalidOperationException("embedding provider failed");
        var generator = new Mock<IEmbeddingGenerator<string, Embedding<float>>>(MockBehavior.Strict);
        generator.Setup(mock => mock.GenerateAsync(
                It.IsAny<IEnumerable<string>>(),
                It.IsAny<EmbeddingGenerationOptions?>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(expected);
        var service = new EmbeddingService(generator.Object, Options.Create(new EmbeddingOptions { BatchSize = 2 }));

        var action = async () => await service.GenerateEmbeddingsAsync(["query"]);

        await action.Should().ThrowAsync<InvalidOperationException>()
            .Where(exception => ReferenceEquals(exception, expected));
    }
}
