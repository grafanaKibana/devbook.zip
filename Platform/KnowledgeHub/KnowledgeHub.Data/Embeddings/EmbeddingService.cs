namespace KnowledgeHub.Data.Embeddings;

using Microsoft.Extensions.AI;
using Microsoft.Extensions.Options;

public sealed class EmbeddingService(
    IEmbeddingGenerator<string, Embedding<float>> embeddingGenerator,
    IOptions<EmbeddingOptions> options) : IEmbeddingService
{
    private readonly EmbeddingOptions options = options.Value;

    public async Task<IReadOnlyList<float[]>> GenerateEmbeddingsAsync(
        IReadOnlyList<string> values,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(values);

        if (values.Count == 0)
        {
            return [];
        }

        var batchSize = Math.Max(1, options.BatchSize);
        var vectors = new List<float[]>(values.Count);

        foreach (var batch in values.Chunk(batchSize))
        {
            var embeddings = await embeddingGenerator.GenerateAsync(batch, cancellationToken: cancellationToken);
            vectors.AddRange(embeddings.Select(embedding => embedding.Vector.ToArray()));
        }

        return vectors;
    }
}
