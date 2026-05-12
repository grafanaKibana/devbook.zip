using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Repositories;
using KnowledgeHub.Data.Services;
using Microsoft.Extensions.AI;

namespace KnowledgeHub.Tests.RagSearch;

internal sealed class DeterministicEmbeddingGenerator : IEmbeddingGenerator<string, Embedding<float>>
{
    public List<IReadOnlyList<string>> Calls { get; } = [];

    public List<CancellationToken> CancellationTokens { get; } = [];

    public Exception? ExceptionToThrow { get; set; }

    public IReadOnlyList<string> LastValues => Calls.LastOrDefault() ?? [];

    public void Dispose()
    {
    }

    public object? GetService(Type serviceType, object? serviceKey = null) => null;

    public Task<GeneratedEmbeddings<Embedding<float>>> GenerateAsync(
        IEnumerable<string> values,
        EmbeddingGenerationOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        var capturedValues = values.ToArray();
        Calls.Add(capturedValues);
        CancellationTokens.Add(cancellationToken);

        if (ExceptionToThrow is not null)
        {
            return Task.FromException<GeneratedEmbeddings<Embedding<float>>>(ExceptionToThrow);
        }

        var embeddings = capturedValues
            .Select(value => new Embedding<float>(CreateVector(value)))
            .ToArray();

        return Task.FromResult(new GeneratedEmbeddings<Embedding<float>>(embeddings));
    }

    private static float[] CreateVector(string value)
    {
        var first = value.Length;
        var second = value.Sum(character => character);
        var third = value.Count(char.IsWhiteSpace);

        return [first, second, third];
    }
}

internal sealed class FakeRagSearchService(
    EmbeddingService embeddingService,
    IChunkRepository chunkRepository) : RagSearchService(embeddingService, chunkRepository)
{
    public IReadOnlyList<RagChunkResponse> Results { get; set; } = [];

    public override Task<RagSearchResponse> SearchAsync(
        RagSearchRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Query))
        {
            throw new ArgumentException("Query is required.");
        }

        return Task.FromResult(new RagSearchResponse(request.Query.Trim(), "vector", Results));
    }
}
