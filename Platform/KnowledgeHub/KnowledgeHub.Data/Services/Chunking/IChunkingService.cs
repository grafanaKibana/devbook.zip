namespace KnowledgeHub.Data.Services.Chunking;

using KnowledgeHub.Data.Models;

public interface IChunkingService
{
    ChunkingStrategyKind Strategy { get; }

    Task ReplaceDocumentChunksAsync(
        IReadOnlyList<Document> documents,
        CancellationToken cancellationToken = default);
}
