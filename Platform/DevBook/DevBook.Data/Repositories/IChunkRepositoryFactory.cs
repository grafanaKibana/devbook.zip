namespace DevBook.Data.Repositories;

using DevBook.Data.Models;

/// <summary>
/// Defines chunk repository factory operations.
/// </summary>
public interface IChunkRepositoryFactory
{
    /// <summary>
    /// Creates a repository for the selected chunking strategy collection.
    /// </summary>
    /// <param name="strategy">The chunking strategy that selects the collection.</param>
    /// <returns>The chunk repository for the strategy.</returns>
    IChunkRepository Create(ChunkingStrategyKind strategy);
}
