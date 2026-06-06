namespace KnowledgeHub.Data.Services.Chunking;

using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Services;

public interface IChunkingStrategy
{
    ChunkingStrategyKind Strategy { get; }

    Task<IReadOnlyList<ChunkContent>> ChunkAsync(
        Document document,
        IEmbeddingService embeddingService,
        CancellationToken cancellationToken = default);
}
