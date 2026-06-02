namespace KnowledgeHub.Tests.Unit.Services;

using FluentAssertions;
using KnowledgeHub.Data.Options;
using KnowledgeHub.Data.Services;
using KnowledgeHub.Tests.Common;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Options;
using Moq;

public sealed class EmbeddingServiceTests
{
    private const string FirstValue = "alpha";
    private const string SecondValue = "second";
    private const string ThirdValue = "gamma";

    /// <summary>
    /// Keeps empty ingestion and chunking paths from accidentally calling the embedding provider with no work, which would waste paid API calls.
    /// </summary>
    [Fact]
    public async Task GenerateEmbeddingsAsync_ReturnsEmptyListForEmptyInput()
    {
        // Arrange
        var generator = new Mock<IEmbeddingGenerator<string, Embedding<float>>>(MockBehavior.Strict);
        var service = CreateService(generator.Object);

        // Act
        var result = await service.GenerateEmbeddingsAsync([]);

        // Assert
        result.Should().BeEmpty();
    }

    /// <summary>
    /// Protects the provider token-budget split so a large note chunk does not force the next chunk into an oversized embedding request.
    /// </summary>
    [Fact]
    public async Task GenerateEmbeddingsAsync_BatchesInputByEstimatedTokenBudget()
    {
        // Arrange
        var calls = new List<IReadOnlyList<string>>();
        var generator = EmbeddingGeneratorMockFactory.Create(values =>
        {
            calls.Add(values);
            return CreateLengthVectors(values);
        });
        var service = CreateService(generator.Object, maxConcurrentBatches: 1);
        var nearBudgetText = new string('a', (EmbeddingOptions.MaxBatchTokens * 4) - 4);

        // Act
        await service.GenerateEmbeddingsAsync([nearBudgetText, SecondValue, ThirdValue]);

        // Assert
        calls.Should().BeEquivalentTo(
            [
                [nearBudgetText],
                new[] { SecondValue, ThirdValue }
            ],
            options => options.WithStrictOrdering());
    }

    /// <summary>
    /// Protects the provider item-limit split so the service never sends more chunks than the embedding API accepts per request.
    /// </summary>
    [Fact]
    public async Task GenerateEmbeddingsAsync_BatchesInputByMaxBatchItems()
    {
        // Arrange
        var calls = new List<IReadOnlyList<string>>();
        var generator = EmbeddingGeneratorMockFactory.Create(values =>
        {
            calls.Add(values);
            return CreateLengthVectors(values);
        });
        var service = CreateService(generator.Object, maxConcurrentBatches: 1);
        var values = Enumerable
            .Range(0, EmbeddingOptions.MaxBatchItems + 1)
            .Select(index => $"chunk-{index}")
            .ToArray();

        // Act
        await service.GenerateEmbeddingsAsync(values);

        // Assert
        calls.Should().HaveCount(2);
        calls[0].Should().HaveCount(EmbeddingOptions.MaxBatchItems);
        calls[1].Should().ContainSingle().Which.Should().Be($"chunk-{EmbeddingOptions.MaxBatchItems}");
    }

    /// <summary>
    /// Protects retrieval quality by guaranteeing embeddings stay aligned with their source chunks after batching and parallel completion.
    /// </summary>
    [Fact]
    public async Task GenerateEmbeddingsAsync_PreservesVectorOrderAcrossBatches()
    {
        // Arrange
        var generator = EmbeddingGeneratorMockFactory.Create(values => values
            .Select(value => value switch
            {
                FirstValue => [1f, 10f],
                SecondValue => [2f, 20f],
                ThirdValue => new[] { 3f, 30f },
                _ => throw new InvalidOperationException("Unexpected embedding input."),
            })
            .ToArray());
        var service = CreateService(generator.Object);

        // Act
        var result = await service.GenerateEmbeddingsAsync([FirstValue, SecondValue, ThirdValue]);

        // Assert
        result.Should().Equal([
            [1f, 10f],
            [2f, 20f],
            new[] { 3f, 30f }
        ], (actual, expected) => actual.SequenceEqual(expected));
    }

    /// <summary>
    /// Protects the concurrency throttle that prevents local ingestion from overwhelming the external embedding provider.
    /// </summary>
    [Fact]
    public async Task GenerateEmbeddingsAsync_LimitsConcurrentBatches()
    {
        // Arrange
        var activeCalls = 0;
        var maxActiveCalls = 0;
        var twoCallsStarted = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var generator = new Mock<IEmbeddingGenerator<string, Embedding<float>>>(MockBehavior.Strict);
        generator.Setup(mock => mock.GenerateAsync(
                It.IsAny<IEnumerable<string>>(),
                It.IsAny<EmbeddingGenerationOptions?>(),
                It.IsAny<CancellationToken>()))
            .Returns(async (IEnumerable<string> values, EmbeddingGenerationOptions? _, CancellationToken token) =>
            {
                var capturedValues = values.ToArray();
                var active = Interlocked.Increment(ref activeCalls);
                TrackMaxActiveCalls(active, ref maxActiveCalls);

                if (active == 2)
                {
                    twoCallsStarted.TrySetResult();
                }

                await twoCallsStarted.Task.WaitAsync(TimeSpan.FromSeconds(1), token);
                await Task.Delay(20, token);
                Interlocked.Decrement(ref activeCalls);

                return new GeneratedEmbeddings<Embedding<float>>(capturedValues
                    .Select(value => new Embedding<float>(new[] { (float)value[0] }))
                    .ToArray());
            });
        var service = CreateService(generator.Object, maxConcurrentBatches: 2);
        var values = Enumerable
            .Range(0, EmbeddingOptions.MaxBatchItems + 1)
            .Select(index => $"chunk-{index}")
            .ToArray();

        // Act
        await service.GenerateEmbeddingsAsync(values);

        // Assert
        maxActiveCalls.Should().Be(2);
    }

    private static EmbeddingService CreateService(
        IEmbeddingGenerator<string, Embedding<float>> generator,
        int? maxConcurrentBatches = null) =>
        new(generator, Options.Create(new EmbeddingOptions { MaxConcurrentBatches = maxConcurrentBatches ?? new EmbeddingOptions().MaxConcurrentBatches }));

    private static IReadOnlyList<float[]> CreateLengthVectors(IReadOnlyList<string> values) =>
        values.Select(value => new[] { (float)value.Length }).ToArray();

    private static void TrackMaxActiveCalls(int active, ref int maxActiveCalls)
    {
        while (true)
        {
            var observed = maxActiveCalls;
            if (active <= observed || Interlocked.CompareExchange(ref maxActiveCalls, active, observed) == observed)
            {
                return;
            }
        }
    }
}
