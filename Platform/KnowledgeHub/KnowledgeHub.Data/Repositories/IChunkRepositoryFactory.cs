namespace KnowledgeHub.Data.Repositories;

using KnowledgeHub.Data.Models;

public interface IChunkRepositoryFactory
{
    IChunkRepository Create(ChunkingStrategyKind strategy);
}
