namespace DevBook.Data.Repositories;

using DevBook.Data.Models;

/// <summary>
/// Defines chunk repository operations.
/// </summary>
public interface IChunkRepository
{
    /// <summary>
    /// Replaces all chunks for one document.
    /// </summary>
    /// <param name="documentId">Document identifier whose chunks are replaced.</param>
    /// <param name="chunks">Chunks to persist for the document.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    Task ReplaceDocumentChunksAsync(string documentId, IReadOnlyCollection<ChunkModel> chunks, CancellationToken cancellationToken = default);

    /// <summary>
    /// Replaces chunks for multiple documents in one operation.
    /// </summary>
    /// <param name="documentIds">Document identifiers whose previous chunks are removed.</param>
    /// <param name="chunks">Replacement chunks for the documents.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    Task ReplaceDocumentsChunksAsync(
        IReadOnlyCollection<string> documentIds,
        IReadOnlyCollection<ChunkModel> chunks,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes chunks belonging to the supplied documents.
    /// </summary>
    /// <param name="documentIds">Document identifiers whose chunks are deleted.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    Task DeleteByDocumentIdsAsync(IReadOnlyCollection<string> documentIds, CancellationToken cancellationToken = default);

    /// <summary>
    /// Finds chunks nearest to a query embedding.
    /// </summary>
    /// <param name="queryVector">Embedding vector for the search query.</param>
    /// <param name="topK">Maximum number of chunks to return.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    /// <returns>The matching chunks ordered by vector-search score.</returns>
    Task<IReadOnlyList<RagChunkResponse>> VectorSearchAsync(float[] queryVector, int topK, CancellationToken cancellationToken = default);
}
