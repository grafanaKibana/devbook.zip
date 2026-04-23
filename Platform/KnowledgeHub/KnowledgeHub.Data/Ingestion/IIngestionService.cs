namespace KnowledgeHub.Data.Ingestion;

public interface IIngestionService
{
    Task<IngestionResult> IngestDocumentsAsync(IngestionRequest request, CancellationToken cancellationToken = default);
}
