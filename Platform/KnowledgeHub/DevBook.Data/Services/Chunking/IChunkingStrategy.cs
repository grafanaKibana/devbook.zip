namespace DevBook.Data.Services.Chunking;

using DevBook.Data.Models;
using DevBook.Data.Services;

public interface IChunkingStrategy
{
    ChunkingStrategyKind Strategy { get; }

    Task<IReadOnlyList<ChunkContent>> ChunkAsync(
        Document document,
        IEmbeddingService embeddingService,
        CancellationToken cancellationToken = default);
}
