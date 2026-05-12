using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Hangfire;
using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Repositories;
using KnowledgeHub.Data.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Xunit;

namespace KnowledgeHub.Tests.RagSearch;

public sealed class RagSearchEndpointTests
{
    [Fact]
    public async Task PostRagSearchBlankQueryReturnsHttp400WithQueryIsRequiredJsonError()
    {
        await using var factory = new OfflineRagSearchApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/rag/search", new { query = "   ", topK = 5 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var document = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        Assert.Equal("Query is required.", document.RootElement.GetProperty("error").GetString());
    }

    [Fact]
    public async Task PostRagSearchHappyPathReturnsHttp200VectorModeAndFakeChunkFields()
    {
        await using var factory = new OfflineRagSearchApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/rag/search", new { query = " vector search ", topK = 5 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        var root = document.RootElement;
        Assert.Equal("vector search", root.GetProperty("query").GetString());
        Assert.Equal("vector", root.GetProperty("mode").GetString());

        var result = Assert.Single(root.GetProperty("results").EnumerateArray());
        Assert.Equal("chunk_endpoint_0001", result.GetProperty("chunkId").GetString());
        Assert.Equal("doc_endpoint", result.GetProperty("documentId").GetString());
        Assert.Equal("Endpoint tests use fake vector search results.", result.GetProperty("chunkText").GetString());
        Assert.Equal("Endpoint Test", result.GetProperty("heading").GetString());
        Assert.Equal("[[Endpoint Test#Vector]]", result.GetProperty("citationLabel").GetString());
        Assert.Equal(0.91, result.GetProperty("score").GetDouble());
    }

    private sealed class OfflineRagSearchApplicationFactory : WebApplicationFactory<Program>
    {
        private readonly string? previousMongoConnectionString = Environment.GetEnvironmentVariable("ConnectionStrings__MongoDb");

        public OfflineRagSearchApplicationFactory()
        {
            Environment.SetEnvironmentVariable("ConnectionStrings__MongoDb", "mongodb://localhost:27017");
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureAppConfiguration((_, configurationBuilder) =>
            {
                configurationBuilder.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ConnectionStrings:MongoDb"] = "mongodb://localhost:27017",
                    ["EmbeddingOptions:ApiKey"] = "test-key",
                    ["EmbeddingOptions:ModelId"] = "text-embedding-3-small",
                    ["EmbeddingOptions:BatchSize"] = "16",
                    ["EmbeddingOptions:VectorDimensions"] = "384",
                });
            });

            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IHostedService>();
                services.RemoveAll<IBackgroundJobClient>();
                services.RemoveAll<IRecurringJobManager>();
                services.RemoveAll<IEmbeddingGenerator<string, Embedding<float>>>();
                services.RemoveAll<RagSearchService>();

                services.AddSingleton<IEmbeddingGenerator<string, Embedding<float>>, DeterministicEmbeddingGenerator>();
                services.AddScoped<RagSearchService>(serviceProvider => new FakeRagSearchService(
                    serviceProvider.GetRequiredService<EmbeddingService>(),
                    serviceProvider.GetRequiredService<IChunkRepository>())
                    {
                        Results =
                        [
                            new RagChunkResponse(
                                "chunk_endpoint_0001",
                                "doc_endpoint",
                                "Endpoint tests use fake vector search results.",
                                "Endpoint Test",
                                "[[Endpoint Test#Vector]]",
                                0.91),
                        ],
                    });
            });
        }

        public override async ValueTask DisposeAsync()
        {
            Environment.SetEnvironmentVariable("ConnectionStrings__MongoDb", previousMongoConnectionString);

            await base.DisposeAsync();
        }
    }
}
