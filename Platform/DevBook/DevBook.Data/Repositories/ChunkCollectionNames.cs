namespace DevBook.Data.Repositories;

using DevBook.Data.Models;

public static class ChunkCollectionNames
{
    public static string ForStrategy(ChunkingStrategyKind strategy) => $"chunks.{strategy.ToString().ToLowerInvariant()}";
}
