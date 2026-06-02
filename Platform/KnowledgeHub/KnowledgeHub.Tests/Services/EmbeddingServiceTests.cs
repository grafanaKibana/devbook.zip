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
        var service = new EmbeddingService(generator.Object, Options.Create(new EmbeddingOptions()));

        var result = await service.GenerateEmbeddingsAsync([]);

        result.Should().BeEmpty();
        generator.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task GenerateEmbeddingsAsync_BatchesInputByEstimatedTokenBudget()
    {
        var calls = new List<IReadOnlyList<string>>();
        var generator = EmbeddingGeneratorMockFactory.Create(values =>
        {
            calls.Add(values);
            return values.Select(value => new[] { (float)value.Length }).ToArray();
        });
        var service = new EmbeddingService(
            generator.Object,
            Options.Create(new EmbeddingOptions { MaxConcurrentBatches = 1 }));
        var nearBudgetText = new string('a', (EmbeddingOptions.MaxBatchTokens * 4) - 4);

        await service.GenerateEmbeddingsAsync([nearBudgetText, "second", "third"]);

        calls.Should().HaveCount(2);
        calls[0].Should().Equal([nearBudgetText]);
        calls[1].Should().Equal("second", "third");
    }

    [Fact]
    public async Task GenerateEmbeddingsAsync_BatchesInputByMaxBatchItems()
    {
        var calls = new List<IReadOnlyList<string>>();
        var generator = EmbeddingGeneratorMockFactory.Create(values =>
        {
            calls.Add(values);
            return values.Select(value => new[] { (float)value.Length }).ToArray();
        });
        var service = new EmbeddingService(
            generator.Object,
            Options.Create(new EmbeddingOptions { MaxConcurrentBatches = 1 }));
        var values = Enumerable
            .Range(0, EmbeddingOptions.MaxBatchItems + 1)
            .Select(index => $"chunk-{index}")
            .ToArray();

        await service.GenerateEmbeddingsAsync(values);

        calls.Should().HaveCount(2);
        calls[0].Should().HaveCount(EmbeddingOptions.MaxBatchItems);
        calls[1].Should().Equal($"chunk-{EmbeddingOptions.MaxBatchItems}");
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
        var service = new EmbeddingService(generator.Object, Options.Create(new EmbeddingOptions()));

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
        var service = new EmbeddingService(generator.Object, Options.Create(new EmbeddingOptions()));

        var action = async () => await service.GenerateEmbeddingsAsync(["query"]);

        await action.Should().ThrowAsync<InvalidOperationException>()
            .Where(exception => ReferenceEquals(exception, expected));
    }

    [Fact]
    public async Task GenerateEmbeddingsAsync_LimitsConcurrentBatches()
    {
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

                while (true)
                {
                    var observed = maxActiveCalls;
                    if (active <= observed || Interlocked.CompareExchange(ref maxActiveCalls, active, observed) == observed)
                    {
                        break;
                    }
                }

                if (active == 2)
                {
                    twoCallsStarted.TrySetResult();
                }

                await twoCallsStarted.Task.WaitAsync(TimeSpan.FromSeconds(1), token);
                await Task.Delay(20, token);
                Interlocked.Decrement(ref activeCalls);

                var embeddings = capturedValues
                    .Select(value => new Embedding<float>(new[] { (float)value[0] }))
                    .ToArray();

                return new GeneratedEmbeddings<Embedding<float>>(embeddings);
            });
        var service = new EmbeddingService(
            generator.Object,
            Options.Create(new EmbeddingOptions { MaxConcurrentBatches = 2 }));

        var values = Enumerable
            .Range(0, EmbeddingOptions.MaxBatchItems + 1)
            .Select(index => $"chunk-{index}")
            .ToArray();

        await service.GenerateEmbeddingsAsync(values);

        maxActiveCalls.Should().Be(2);
    }
}
