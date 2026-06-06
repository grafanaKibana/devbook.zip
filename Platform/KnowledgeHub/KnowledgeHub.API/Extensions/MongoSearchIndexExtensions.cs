namespace KnowledgeHub.API.Extensions;

using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Options;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;

public static class MongoSearchIndexExtensions
{
    private const string VectorIndexName = "chunks_embedding_vector_idx";
    private const string VectorSimilarity = "cosine";

    extension(WebApplication app)
    {
        public async Task EnsureChunkVectorSearchIndexesAsync(CancellationToken cancellationToken = default)
        {
            var database = app.Services.GetRequiredService<IMongoDatabase>();
            var options = app.Services.GetRequiredService<IOptions<EmbeddingOptions>>().Value;
            var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("MongoSearchIndexes");

            foreach (var strategy in Enum.GetValues<ChunkingStrategyKind>())
            {
                var collectionName = $"chunks.{strategy.ToString().ToLowerInvariant()}";
                if (await SearchIndexExistsAsync(database, collectionName, cancellationToken))
                {
                    continue;
                }

                await CreateVectorSearchIndexAsync(database, collectionName, options.VectorDimensions, cancellationToken);
                logger.LogInformation("Created Atlas Vector Search index {IndexName} on {CollectionName}.", VectorIndexName, collectionName);
            }
        }
    }

    private static async Task<bool> SearchIndexExistsAsync(
        IMongoDatabase database,
        string collectionName,
        CancellationToken cancellationToken)
    {
        var indexes = await database
            .GetCollection<BsonDocument>(collectionName)
            .Aggregate()
            .AppendStage<BsonDocument>(new BsonDocument("$listSearchIndexes", new BsonDocument("name", VectorIndexName)))
            .ToListAsync(cancellationToken);

        return indexes.Count > 0;
    }

    private static async Task CreateVectorSearchIndexAsync(
        IMongoDatabase database,
        string collectionName,
        int vectorDimensions,
        CancellationToken cancellationToken)
    {
        var command = new BsonDocument
        {
            ["createSearchIndexes"] = collectionName,
            ["indexes"] = new BsonArray
            {
                new BsonDocument
                {
                    ["name"] = VectorIndexName,
                    ["type"] = "vectorSearch",
                    ["definition"] = new BsonDocument
                    {
                        ["fields"] = new BsonArray
                        {
                            new BsonDocument
                            {
                                ["type"] = "vector",
                                ["path"] = nameof(ChunkModel.Embedding),
                                ["numDimensions"] = vectorDimensions,
                                ["similarity"] = VectorSimilarity,
                            },
                        },
                    },
                },
            },
        };

        await database.RunCommandAsync<BsonDocument>(command, cancellationToken: cancellationToken);
    }
}
