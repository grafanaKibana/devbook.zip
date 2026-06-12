namespace DevBook.Data.Repositories;

using DevBook.Data.Models;
using MongoDB.Driver;

/// <summary>
/// Creates chunk repository instances.
/// </summary>
/// <param name="database">Mongo database used by repositories.</param>
public sealed class ChunkRepositoryFactory(IMongoDatabase database) : IChunkRepositoryFactory
{
    /// <summary>
    /// Creates a chunk repository for the selected strategy collection.
    /// </summary>
    /// <param name="strategy">The chunking strategy that selects the Mongo collection.</param>
    /// <returns>The chunk repository for the strategy.</returns>
    public IChunkRepository Create(ChunkingStrategyKind strategy)
    {
        var chunks = database.GetCollection<ChunkModel>($"chunks.{strategy.ToString().ToLowerInvariant()}");

        return new ChunkRepository(chunks);
    }
}
