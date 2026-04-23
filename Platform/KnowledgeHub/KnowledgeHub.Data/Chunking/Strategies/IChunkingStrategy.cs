namespace KnowledgeHub.Data.Chunking;

internal interface IChunkingStrategy
{
    IReadOnlyList<Chunk> Chunk(Document document);
}
