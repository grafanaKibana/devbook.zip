namespace DevBook.Data.Repositories;

using System.Text.RegularExpressions;
using DevBook.Data.Models;
using MongoDB.Bson;
using MongoDB.Driver;

/// <summary>
/// Persists and queries document records.
/// </summary>
/// <param name="documents">MongoDB collection storing document records.</param>
public sealed class DocumentRepository(IMongoCollection<Document> documents) : IDocumentRepository
{
    /// <summary>
    /// Loads one document by its normalized source path.
    /// </summary>
    /// <param name="sourcePath">Source path relative to the ingestion root.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    /// <returns>The matching document, or null when no document uses the source path.</returns>
    public async Task<Document?> GetBySourcePathAsync(string sourcePath, CancellationToken cancellationToken = default) =>
        await documents
            .Find(document => document.SourcePath == sourcePath)
            .FirstOrDefaultAsync(cancellationToken);

    /// <summary>
    /// Loads documents under a folder-like source path prefix.
    /// </summary>
    /// <param name="sourcePathPrefix">Source path prefix relative to the ingestion root.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    /// <returns>Documents whose source paths are inside the requested prefix, ordered by source path.</returns>
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

    /// <summary>
    /// Loads documents by document identifier.
    /// </summary>
    /// <param name="documentIds">Document identifiers to load.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    /// <returns>Matching documents ordered by document identifier.</returns>
    public async Task<IReadOnlyList<Document>> GetByIdsAsync(
        IReadOnlyCollection<string> documentIds,
        CancellationToken cancellationToken = default) =>
        await documents
            .Find(document => documentIds.Contains(document.DocumentId))
            .SortBy(document => document.DocumentId)
            .ToListAsync(cancellationToken);

    /// <summary>
    /// Inserts or replaces one document by document identifier.
    /// </summary>
    /// <param name="document">Document to insert or replace.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    public async Task UpsertAsync(Document document, CancellationToken cancellationToken = default) =>
        await documents.ReplaceOneAsync(
            existing => existing.DocumentId == document.DocumentId,
            document,
            new ReplaceOptions { IsUpsert = true },
            cancellationToken);

    /// <summary>
    /// Inserts or replaces changed documents in one MongoDB bulk write.
    /// </summary>
    /// <param name="changedDocuments">Changed documents to insert or replace.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
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

    /// <summary>
    /// Deletes documents by document identifier.
    /// </summary>
    /// <param name="documentIds">Document identifiers to load.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
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
