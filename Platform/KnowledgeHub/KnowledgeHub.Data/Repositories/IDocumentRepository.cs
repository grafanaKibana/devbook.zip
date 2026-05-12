namespace KnowledgeHub.Data.Repositories;

using KnowledgeHub.Data.Models;

public interface IDocumentRepository
{
    Task<Document?> GetBySourcePathAsync(string sourcePath, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Document>> GetByIdsAsync(IReadOnlyCollection<string> documentIds, CancellationToken cancellationToken = default);

    Task UpsertAsync(Document document, CancellationToken cancellationToken = default);
}
