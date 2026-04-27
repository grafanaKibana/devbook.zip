namespace KnowledgeHub.Data.Options;

public sealed class ChunkingOptions
{
    public const string SectionName = "Chunking";

    public int MaxChunkLength { get; init; } = 1200;

    public int OverlapLength { get; init; } = 200;

    public int DocumentBatchSize { get; init; } = 10;
}
