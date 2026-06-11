namespace DevBook.Data.Repositories;

using DevBook.Data.Models;
using MongoDB.Driver;

public sealed class ChunkRepositoryFactory(IMongoDatabase database) : IChunkRepositoryFactory
{
    public IChunkRepository Create(ChunkingStrategyKind strategy)
    {
        var chunks = database.GetCollection<ChunkModel>($"chunks.{strategy.ToString().ToLowerInvariant()}");

        return new ChunkRepository(chunks);
    }
}
