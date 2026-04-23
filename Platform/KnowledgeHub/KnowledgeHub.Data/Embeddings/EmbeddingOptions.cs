namespace KnowledgeHub.Data.Embeddings;

public sealed class EmbeddingOptions
{
    public const string SectionName = "Embeddings";

    public string ModelId { get; init; } = "text-embedding-3-small";

    public string? ApiKey { get; init; }

    public string? Endpoint { get; init; }

    public int BatchSize { get; init; } = 16;

    public int VectorDimensions { get; init; } = 384;
}
