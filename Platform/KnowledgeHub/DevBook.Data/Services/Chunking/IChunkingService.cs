namespace DevBook.Data.Services.Chunking;

using DevBook.Data.Models;

public interface IChunkingService
{
    ChunkingStrategyKind Strategy { get; }

    Task ReplaceDocumentChunksAsync(
        IReadOnlyList<Document> documents,
        CancellationToken cancellationToken = default);
}
