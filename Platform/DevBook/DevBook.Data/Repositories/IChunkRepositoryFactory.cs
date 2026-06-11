namespace DevBook.Data.Repositories;

using DevBook.Data.Models;

public interface IChunkRepositoryFactory
{
    IChunkRepository Create(ChunkingStrategyKind strategy);
}
