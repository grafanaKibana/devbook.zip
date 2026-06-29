namespace DevBook.Data.Services;

/// <summary>
/// Defines embedding generation operations.
/// </summary>
public interface IEmbeddingService
{
    /// <summary>
    /// Generates embeddings for a batch of text values.
    /// </summary>
    /// <param name="values">Text values to embed.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    /// <returns>Embedding vectors in the same order as <paramref name="values"/>.</returns>
    Task<IReadOnlyList<float[]>> GenerateEmbeddingsAsync(
        IReadOnlyList<string> values,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Generates one embedding vector for a text value.
    /// </summary>
    /// <param name="value">Text value to embed.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    /// <returns>The generated embedding vector.</returns>
    Task<float[]> GenerateEmbeddingAsync(
        string value,
        CancellationToken cancellationToken = default);
}
