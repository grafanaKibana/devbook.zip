namespace DevBook.Data.Options;

public sealed class EmbeddingOptions
{
    public const int MaxBatchTokens = 100_000;

    public const int MaxBatchItems = 512;

    public int MaxConcurrentBatches { get; init; } = 8;

    public string ModelId { get; init; } = "text-embedding-3-small";

    public int VectorDimensions { get; init; } = 384;
}
