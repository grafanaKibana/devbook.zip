namespace DevBook.Data.Services.Chunking;

using DevBook.Data.Models;

/// <summary>
/// Defines chunking service operations.
/// </summary>
public interface IChunkingService
{
    /// <summary>
    /// Gets the chunking strategy handled by this service.
    /// </summary>
    ChunkingStrategyKind Strategy { get; }

    /// <summary>
    /// Replaces stored chunks for the supplied documents.
    /// </summary>
    /// <param name="documents">Documents whose chunks are regenerated.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    Task ReplaceDocumentChunksAsync(
        IReadOnlyList<Document> documents,
        CancellationToken cancellationToken = default);
}
