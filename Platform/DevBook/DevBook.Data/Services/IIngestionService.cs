namespace DevBook.Data.Services;

using DevBook.Data.Models;

/// <summary>
/// Defines markdown document ingestion operations.
/// </summary>
public interface IIngestionService
{
    /// <summary>
    /// Ingests markdown documents into the document and chunk stores.
    /// </summary>
    /// <param name="request">The source scope and ingestion options.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    /// <returns>The ingestion counts for created, updated, skipped, and deleted documents.</returns>
    Task<IngestionResult> IngestDocumentsAsync(
        IngestionRequest request,
        CancellationToken cancellationToken = default);
}
