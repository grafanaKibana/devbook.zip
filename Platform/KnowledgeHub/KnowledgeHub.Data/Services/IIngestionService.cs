namespace KnowledgeHub.Data.Services;

using KnowledgeHub.Data.Models;

public interface IIngestionService
{
    Task<IngestionResult> IngestDocumentsAsync(
        IngestionRequest request,
        CancellationToken cancellationToken = default);
}