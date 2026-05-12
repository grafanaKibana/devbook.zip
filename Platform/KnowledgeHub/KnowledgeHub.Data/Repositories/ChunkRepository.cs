namespace KnowledgeHub.Data.Repositories;

using KnowledgeHub.Data.Models;
using MongoDB.Bson;
using MongoDB.Driver;

public sealed class ChunkRepository(IMongoCollection<ChunkModel> chunks) : IChunkRepository
{
    private const string VectorIndexName = "chunks_embedding_vector_idx";
    private const string VectorPath = nameof(ChunkModel.Embedding);
    private const int NumCandidatesMultiplier = 20;

    public async Task ReplaceDocumentChunksAsync(
        string documentId,
        IReadOnlyCollection<ChunkModel> newChunks,
        CancellationToken cancellationToken = default)
    {
        await chunks.DeleteManyAsync(chunk => chunk.DocumentId == documentId, cancellationToken);

        if (newChunks.Count > 0)
        {
            await chunks.InsertManyAsync(newChunks, cancellationToken: cancellationToken);
        }
    }

    public async Task<IReadOnlyList<RagChunkResponse>> VectorSearchAsync(
        float[] queryVector,
        int topK,
        CancellationToken cancellationToken = default)
    {
        var pipeline = new[]
        {
            new BsonDocument("$vectorSearch", new BsonDocument
            {
                ["index"] = VectorIndexName,
                ["path"] = VectorPath,
                ["queryVector"] = new BsonArray(queryVector.Select(value => (double)value)),
                ["numCandidates"] = topK * NumCandidatesMultiplier,
                ["limit"] = topK,
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
            .Aggregate<BsonDocument>(pipeline)
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
