namespace DevBook.Data.Options;

/// <summary>
/// Configures embedding behavior.
/// </summary>
public sealed class EmbeddingOptions
{
    /// <summary>
    /// Maximum estimated token count sent in one embedding provider request.
    /// </summary>
    public const int MaxBatchTokens = 100_000;

    /// <summary>
    /// Maximum number of input texts sent in one embedding provider request.
    /// </summary>
    public const int MaxBatchItems = 512;

    /// <summary>
    /// Gets the maximum number of embedding batches generated concurrently.
    /// </summary>
    public int MaxConcurrentBatches { get; init; } = 8;

    /// <summary>
    /// Gets the model identifier.
    /// </summary>
    public string ModelId { get; init; } = "text-embedding-3-small";

    /// <summary>
    /// Gets the embedding vector dimension count.
    /// </summary>
    public int VectorDimensions { get; init; } = 384;
}
