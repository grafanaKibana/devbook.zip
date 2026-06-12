namespace DevBook.API.Extensions;

using System.Diagnostics;
using DevBook.Data.Models;
using DevBook.Data.Options;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;

/// <summary>
/// Adds MongoDB Atlas Search index setup helpers.
/// </summary>
public static class MongoSearchIndexExtensions
{
    private const string VectorIndexName = "chunks_embedding_vector_idx";
    private const string VectorSimilarity = "cosine";

    extension(WebApplication app)
    {
        /// <summary>
        /// Ensures every chunk collection has the configured vector search index.
        /// </summary>
        /// <param name="cancellationToken">Token used to cancel the operation.</param>
        public async Task EnsureChunkVectorSearchIndexesAsync(CancellationToken cancellationToken = default)
        {
            var database = app.Services.GetRequiredService<IMongoDatabase>();
            var options = app.Services.GetRequiredService<IOptions<EmbeddingOptions>>().Value;
            var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("MongoSearchIndexes");
            var totalStopwatch = Stopwatch.StartNew();

            logger.LogInformation(
                "Starting Atlas Vector Search index check for {IndexName} with {VectorDimensions} dimensions.",
                VectorIndexName,
                options.VectorDimensions);

            foreach (var strategy in Enum.GetValues<ChunkingStrategyKind>())
            {
                var collectionName = $"chunks.{strategy.ToString().ToLowerInvariant()}";
                var collectionStopwatch = Stopwatch.StartNew();
                await EnsureCollectionExistsAsync(database, collectionName, cancellationToken);

                if (await SearchIndexExistsAsync(database, collectionName, cancellationToken))
                {
                    logger.LogInformation(
                        "Atlas Vector Search index {IndexName} already exists on {CollectionName}; checked in {ElapsedMilliseconds} ms.",
                        VectorIndexName,
                        collectionName,
                        collectionStopwatch.ElapsedMilliseconds);
                    continue;
                }

                if (await TryCreateVectorSearchIndexAsync(database, collectionName, options.VectorDimensions, cancellationToken))
                {
                    logger.LogInformation(
                        "Created Atlas Vector Search index {IndexName} on {CollectionName} in {ElapsedMilliseconds} ms.",
                        VectorIndexName,
                        collectionName,
                        collectionStopwatch.ElapsedMilliseconds);
                }
            }

            logger.LogInformation(
                "Completed Atlas Vector Search index check for {IndexName} in {ElapsedMilliseconds} ms.",
                VectorIndexName,
                totalStopwatch.ElapsedMilliseconds);
        }
    }

    private static async Task EnsureCollectionExistsAsync(
        IMongoDatabase database,
        string collectionName,
        CancellationToken cancellationToken)
    {
        var collections = await (await database
                .ListCollectionNamesAsync(new ListCollectionNamesOptions
                {
                    Filter = Builders<BsonDocument>.Filter.Eq("name", collectionName),
                }, cancellationToken))
            .ToListAsync(cancellationToken);

        if (collections.Count == 0)
        {
            await database.CreateCollectionAsync(collectionName, cancellationToken: cancellationToken);
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

    private static async Task<bool> TryCreateVectorSearchIndexAsync(
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

        try
        {
            await database.RunCommandAsync<BsonDocument>(command, cancellationToken: cancellationToken);
            return true;
        }
        catch (MongoCommandException exception) when (IsSearchIndexAlreadyDefined(exception))
        {
            return false;
        }
    }

    private static bool IsSearchIndexAlreadyDefined(MongoCommandException exception) =>
        exception.Message.Contains($"An index named \"{VectorIndexName}\" is already defined", StringComparison.OrdinalIgnoreCase);
}
