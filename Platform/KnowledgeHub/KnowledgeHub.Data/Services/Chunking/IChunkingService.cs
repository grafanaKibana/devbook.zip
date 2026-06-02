namespace KnowledgeHub.Data.Services;

using KnowledgeHub.Data.Models;

public interface IChunkingService
{
    Task ReplaceDocumentChunksAsync(
        IReadOnlyList<Document> documents,
        CancellationToken cancellationToken = default);
}