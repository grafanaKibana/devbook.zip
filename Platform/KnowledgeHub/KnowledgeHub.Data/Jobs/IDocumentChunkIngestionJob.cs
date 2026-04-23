namespace KnowledgeHub.Data.Jobs;

public interface IDocumentChunkIngestionJob
{
    Task ProcessDocumentsAsync(string[] documentIds);
}
