namespace KnowledgeHub.Data.Repositories;

using KnowledgeHub.Data.Models;
using MongoDB.Driver;

public sealed class DocumentRepository(IMongoCollection<Document> documents) : IDocumentRepository
{
    public async Task<Document?> GetBySourcePathAsync(string sourcePath, CancellationToken cancellationToken = default) =>
        await documents
            .Find(document => document.SourcePath == sourcePath)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<Document>> GetByIdsAsync(
        IReadOnlyCollection<string> documentIds,
        CancellationToken cancellationToken = default) =>
        await documents
            .Find(document => documentIds.Contains(document.DocumentId))
            .SortBy(document => document.DocumentId)
            .ToListAsync(cancellationToken);

    public async Task UpsertAsync(Document document, CancellationToken cancellationToken = default) =>
        await documents.ReplaceOneAsync(
            existing => existing.DocumentId == document.DocumentId,
            document,
            new ReplaceOptions { IsUpsert = true },
            cancellationToken);
}
