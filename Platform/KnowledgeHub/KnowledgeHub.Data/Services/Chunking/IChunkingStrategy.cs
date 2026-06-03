namespace KnowledgeHub.Data.Services.Chunking;

using KnowledgeHub.Data.Models;

public interface IChunkingStrategy
{
    IReadOnlyList<ChunkContent> Chunk(Document document);
}
