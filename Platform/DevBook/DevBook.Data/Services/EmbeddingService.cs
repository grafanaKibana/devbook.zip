namespace DevBook.Data.Services;

using DevBook.Data.Options;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Options;

/// <summary>
/// Generates embedding vectors through <see cref="Microsoft.Extensions.AI.IEmbeddingGenerator{TInput,TEmbedding}"/>.
/// </summary>
/// <param name="embeddingGenerator">Provider-backed embedding generator.</param>
/// <param name="options">Embedding batching and model options.</param>
public sealed class EmbeddingService(
    IEmbeddingGenerator<string, Embedding<float>> embeddingGenerator,
    IOptions<EmbeddingOptions> options) : IEmbeddingService
{
    private const int EstimatedCharactersPerToken = 4;
    private readonly EmbeddingOptions options = options.Value;

    /// <summary>
    /// Generates embeddings for multiple text values while preserving input order.
    /// </summary>
    /// <param name="values">Text values to embed.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    /// <returns>Embedding vectors in the same order as <paramref name="values"/>.</returns>
    public async Task<IReadOnlyList<float[]>> GenerateEmbeddingsAsync(
        IReadOnlyList<string> values,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(values);

        if (values.Count == 0)
        {
            return [];
        }

        var batches = CreateBatches(values);
        var results = new float[values.Count][];

        await Parallel.ForEachAsync(
            batches,
            new ParallelOptions
            {
                MaxDegreeOfParallelism = Math.Max(1, options.MaxConcurrentBatches),
                CancellationToken = cancellationToken,
            },
            async (batch, token) =>
            {
                var embeddings = await embeddingGenerator.GenerateAsync(
                    batch.Select(item => item.Value),
                    cancellationToken: token);

                foreach (var pair in batch.Zip(embeddings))
                {
                    results[pair.First.Index] = pair.Second.Vector.ToArray();
                }
            });

        return results;
    }

    private static IReadOnlyList<EmbeddingBatchItem[]> CreateBatches(IReadOnlyList<string> values)
    {
        var batches = new List<EmbeddingBatchItem[]>();
        var currentBatch = new List<EmbeddingBatchItem>();
        var currentTokenCount = 0;

        for (var index = 0; index < values.Count; index++)
        {
            var value = values[index];
            var tokenCount = EstimateTokenCount(value);
            var wouldExceedTokenBudget = currentBatch.Count > 0
                                         && currentTokenCount + tokenCount > EmbeddingOptions.MaxBatchTokens;
            var wouldExceedItemBudget = currentBatch.Count >= EmbeddingOptions.MaxBatchItems;

            if (wouldExceedTokenBudget || wouldExceedItemBudget)
            {
                batches.Add(currentBatch.ToArray());
                currentBatch.Clear();
                currentTokenCount = 0;
            }

            currentBatch.Add(new EmbeddingBatchItem(value, index));
            currentTokenCount += tokenCount;
        }

        if (currentBatch.Count > 0)
        {
            batches.Add(currentBatch.ToArray());
        }

        return batches;
    }

    private static int EstimateTokenCount(string value) =>
        Math.Max(1, (value.Length + EstimatedCharactersPerToken - 1) / EstimatedCharactersPerToken);

    /// <summary>
    /// Generates one embedding vector for a text value.
    /// </summary>
    /// <param name="value">The value to process.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    /// <returns>The generated embedding vector.</returns>
    public async Task<float[]> GenerateEmbeddingAsync(
        string value,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(value);

        if (string.IsNullOrEmpty(value))
        {
            return [];
        }

        var embedding = await embeddingGenerator.GenerateVectorAsync(value, cancellationToken: cancellationToken);
        
        return embedding.ToArray();
    }

    private sealed record EmbeddingBatchItem(string Value, int Index);
}
