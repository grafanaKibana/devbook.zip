namespace DevBook.Data.Repositories;

using DevBook.Data.Models;

/// <summary>
/// Defines document repository operations.
/// </summary>
public interface IDocumentRepository
{
    /// <summary>
    /// Gets one document by its source path.
    /// </summary>
    /// <param name="sourcePath">Source path relative to the ingestion root.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    /// <returns>The matching document, or null when none exists.</returns>
    Task<Document?> GetBySourcePathAsync(string sourcePath, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets documents under a source-path prefix.
    /// </summary>
    /// <param name="sourcePathPrefix">Source path prefix relative to the ingestion root.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    /// <returns>The matching documents.</returns>
    Task<IReadOnlyList<Document>> GetBySourcePathPrefixAsync(string sourcePathPrefix, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets documents by identifier.
    /// </summary>
    /// <param name="documentIds">Document identifiers to load.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    /// <returns>The matching documents.</returns>
    Task<IReadOnlyList<Document>> GetByIdsAsync(IReadOnlyCollection<string> documentIds, CancellationToken cancellationToken = default);

    /// <summary>
    /// Inserts or replaces one document.
    /// </summary>
    /// <param name="document">Document to store.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    Task UpsertAsync(Document document, CancellationToken cancellationToken = default);

    /// <summary>
    /// Inserts or replaces multiple documents.
    /// </summary>
    /// <param name="documents">Documents to store.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    Task BulkUpsertAsync(IReadOnlyCollection<Document> documents, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes documents by identifier.
    /// </summary>
    /// <param name="documentIds">Document identifiers to delete.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    Task DeleteByIdsAsync(IReadOnlyCollection<string> documentIds, CancellationToken cancellationToken = default);
}
