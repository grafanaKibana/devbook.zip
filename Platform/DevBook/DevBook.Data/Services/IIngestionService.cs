namespace DevBook.Data.Services;

using DevBook.Data.Models;

public interface IIngestionService
{
    Task<IngestionResult> IngestDocumentsAsync(
        IngestionRequest request,
        CancellationToken cancellationToken = default);
}