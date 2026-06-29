namespace DevBook.API.Extensions;

using System.Diagnostics;
using DevBook.Data.Models;
using DevBook.Data.Options;
using DevBook.Data.Repositories;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;

/// <summary>
/// Adds MongoDB Atlas Search index setup helpers.
/// </summary>
public static class MongoSearchIndexExtensions
{
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
                ChunkVectorIndex.IndexName,
                options.VectorDimensions);

            foreach (var strategy in Enum.GetValues<ChunkingStrategyKind>())
            {
                var collectionName = ChunkCollectionNames.ForStrategy(strategy);
                var collectionStopwatch = Stopwatch.StartNew();
                await EnsureCollectionExistsAsync(database, collectionName, cancellationToken);

                if (await SearchIndexExistsAsync(database, collectionName, cancellationToken))
                {
                    logger.LogInformation(
                        "Atlas Vector Search index {IndexName} already exists on {CollectionName}; checked in {ElapsedMilliseconds} ms.",
                        ChunkVectorIndex.IndexName,
                        collectionName,
                        collectionStopwatch.ElapsedMilliseconds);
                    continue;
                }

                if (await TryCreateVectorSearchIndexAsync(database, collectionName, options.VectorDimensions, cancellationToken))
                {
                    logger.LogInformation(
                        "Created Atlas Vector Search index {IndexName} on {CollectionName} in {ElapsedMilliseconds} ms.",
                        ChunkVectorIndex.IndexName,
                        collectionName,
                        collectionStopwatch.ElapsedMilliseconds);
                }
            }

            logger.LogInformation(
                "Completed Atlas Vector Search index check for {IndexName} in {ElapsedMilliseconds} ms.",
                ChunkVectorIndex.IndexName,
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
            .AppendStage<BsonDocument>(new BsonDocument("$listSearchIndexes", new BsonDocument("name", ChunkVectorIndex.IndexName)))
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
                    ["name"] = ChunkVectorIndex.IndexName,
                    ["type"] = "vectorSearch",
                    ["definition"] = new BsonDocument
                    {
                        ["fields"] = new BsonArray
                        {
                            new BsonDocument
                            {
                                ["type"] = "vector",
                                ["path"] = ChunkVectorIndex.VectorPath,
                                ["numDimensions"] = vectorDimensions,
                                ["similarity"] = ChunkVectorIndex.Similarity,
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
        exception.Message.Contains($"An index named \"{ChunkVectorIndex.IndexName}\" is already defined", StringComparison.OrdinalIgnoreCase);
}
