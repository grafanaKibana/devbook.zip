namespace KnowledgeHub.Data.Options;

public sealed class ChunkingOptions
{
    public int MaxChunkLength { get; init; } = 1200;

    public int OverlapLength { get; init; } = 200;
}
