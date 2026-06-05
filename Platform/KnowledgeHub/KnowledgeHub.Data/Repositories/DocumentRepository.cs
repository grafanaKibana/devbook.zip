namespace KnowledgeHub.Data.Repositories;

using System.Text.RegularExpressions;
using KnowledgeHub.Data.Models;
using MongoDB.Bson;
using MongoDB.Driver;

public sealed class DocumentRepository(IMongoCollection<Document> documents) : IDocumentRepository
{
    public async Task<Document?> GetBySourcePathAsync(string sourcePath, CancellationToken cancellationToken = default) =>
        await documents
            .Find(document => document.SourcePath == sourcePath)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<Document>> GetBySourcePathPrefixAsync(
        string sourcePathPrefix,
        CancellationToken cancellationToken = default)
    {
        var filter = string.IsNullOrWhiteSpace(sourcePathPrefix)
            ? Builders<Document>.Filter.Empty
            : Builders<Document>.Filter.Regex(
                document => document.SourcePath,
                new BsonRegularExpression($"^{Regex.Escape(sourcePathPrefix.TrimEnd('/'))}(/|$)"));

        return await documents
            .Find(filter)
            .SortBy(document => document.SourcePath)
            .ToListAsync(cancellationToken);
    }

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

    public async Task BulkUpsertAsync(
        IReadOnlyCollection<Document> changedDocuments,
        CancellationToken cancellationToken = default)
    {
        if (changedDocuments.Count == 0)
        {
            return;
        }

        var writes = changedDocuments
            .Select(document => new ReplaceOneModel<Document>(
                Builders<Document>.Filter.Eq(existing => existing.DocumentId, document.DocumentId),
                document)
            {
                IsUpsert = true,
            })
            .ToArray();

        await documents.BulkWriteAsync(writes, cancellationToken: cancellationToken);
    }

    public async Task DeleteByIdsAsync(
        IReadOnlyCollection<string> documentIds,
        CancellationToken cancellationToken = default)
    {
        if (documentIds.Count == 0)
        {
            return;
        }

        await documents.DeleteManyAsync(document => documentIds.Contains(document.DocumentId), cancellationToken);
    }
}
