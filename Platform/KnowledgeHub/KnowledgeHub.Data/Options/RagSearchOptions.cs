namespace KnowledgeHub.Data.Options;

using KnowledgeHub.Data.Models;

public sealed class RagSearchOptions
{
    public ChunkingStrategyKind ChunkingStrategy { get; init; } = ChunkingStrategyKind.MarkdownSection;

    public RerankingStrategyKind RerankingStrategy { get; init; } = RerankingStrategyKind.Bm25;
}
