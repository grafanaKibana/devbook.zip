namespace DevBook.Data.Repositories;

using DevBook.Data.Models;
using DevBook.Data.Services;
using MongoDB.Bson;
using MongoDB.Driver;

/// <summary>
/// Persists and queries chunk records.
/// </summary>
/// <param name="chunks">MongoDB collection storing chunks for one chunking strategy.</param>
public sealed class ChunkRepository(IMongoCollection<ChunkModel> chunks) : IChunkRepository
{
    /// <summary>
    /// Replaces chunks for multiple documents in one delete and insert operation.
    /// </summary>
    /// <param name="documentIds">Document identifiers whose previous chunks are removed.</param>
    /// <param name="newChunks">Chunks to store for the document.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    public async Task ReplaceDocumentsChunksAsync(
        IReadOnlyCollection<string> documentIds,
        IReadOnlyCollection<ChunkModel> newChunks,
        CancellationToken cancellationToken = default)
    {
        if (documentIds.Count == 0)
        {
            return;
        }

        await chunks.DeleteManyAsync(chunk => documentIds.Contains(chunk.DocumentId), cancellationToken);

        if (newChunks.Count > 0)
        {
            await chunks.InsertManyAsync(newChunks, new InsertManyOptions { IsOrdered = false }, cancellationToken);
        }
    }

    /// <summary>
    /// Deletes chunks by parent document identifier.
    /// </summary>
    /// <param name="documentIds">Document identifiers whose previous chunks are removed.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    public async Task DeleteByDocumentIdsAsync(
        IReadOnlyCollection<string> documentIds,
        CancellationToken cancellationToken = default)
    {
        if (documentIds.Count == 0)
        {
            return;
        }

        await chunks.DeleteManyAsync(chunk => documentIds.Contains(chunk.DocumentId), cancellationToken);
    }

    public async Task<IReadOnlyList<RagChunkResponse>> VectorSearchAsync(
        float[] queryVector,
        int candidateCount,
        CancellationToken cancellationToken = default)
    {
        var pipeline = new[]
        {
            new BsonDocument("$vectorSearch", new BsonDocument
            {
                ["index"] = ChunkVectorIndex.IndexName,
                ["path"] = ChunkVectorIndex.VectorPath,
                ["queryVector"] = new BsonArray(queryVector.Select(value => (double)value)),
                ["numCandidates"] = RagRetrievalPolicy.GetVectorSearchNumCandidates(candidateCount),
                ["limit"] = candidateCount,
            }),
            new BsonDocument("$project", new BsonDocument
            {
                ["ChunkId"] = new BsonDocument("$ifNull", new BsonArray { "$ChunkId", "$_id" }),
                ["DocumentId"] = 1,
                ["ChunkText"] = 1,
                ["Heading"] = 1,
                ["CitationLabel"] = 1,
                ["score"] = new BsonDocument("$meta", "vectorSearchScore"),
            }),
        };

        var documents = await chunks
            .Aggregate<BsonDocument>(pipeline, cancellationToken: cancellationToken)
            .ToListAsync(cancellationToken);

        return documents
            .Select(document => new RagChunkResponse(
                document.GetValue("ChunkId", "").AsString,
                document.GetValue("DocumentId", "").AsString,
                document.GetValue("ChunkText", "").AsString,
                document.GetValue("Heading", BsonNull.Value).IsBsonNull ? null : document["Heading"].AsString,
                document.GetValue("CitationLabel", "").AsString,
                document.GetValue("score", 0D).ToDouble()))
            .ToArray();
    }
}
