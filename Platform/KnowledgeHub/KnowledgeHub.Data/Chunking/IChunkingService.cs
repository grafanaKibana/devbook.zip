namespace KnowledgeHub.Data.Chunking;

public interface IChunkingService
{
    Task ReplaceDocumentChunksAsync(IReadOnlyList<Document> documents, CancellationToken cancellationToken = default);
}
