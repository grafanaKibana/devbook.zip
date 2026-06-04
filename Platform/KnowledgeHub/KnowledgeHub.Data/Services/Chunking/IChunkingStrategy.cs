namespace KnowledgeHub.Data.Services.Chunking;

using KnowledgeHub.Data.Models;

public interface IChunkingStrategy
{
    ChunkingStrategyKind Strategy { get; }

    IReadOnlyList<ChunkContent> Chunk(Document document);
}
