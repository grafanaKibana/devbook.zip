namespace KnowledgeHub.Tests.API;

using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Hangfire;
using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Moq;

public sealed class KnowledgeHubEndpointTests
{
    [Fact]
    public async Task PostIngestionDocuments_DelegatesToIngestionServiceAndReturnsResult()
    {
        var expected = new IngestionResult(true, 1, 1, 0, 0, ["doc-1"]);
        var ingestion = new Mock<IIngestionService>(MockBehavior.Strict);
        ingestion.Setup(mock => mock.IngestDocumentsAsync(
                It.Is<IngestionRequest>(request => request.SourcePath == "Scope" && request.FileName == "Note.md"),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);
        await using var factory = new OfflineApplicationFactory(services => services.AddScoped(_ => ingestion.Object));
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/ingestion/documents", new IngestionRequest("Scope", "Note.md"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<IngestionResult>();
        body.Should().BeEquivalentTo(expected);
        ingestion.VerifyAll();
    }

    [Fact]
    public async Task PostRagSearch_DelegatesToSearchServiceAndReturnsResponse()
    {
        var expected = new RagSearchResponse("vector search", "vector", [
            new RagChunkResponse("chunk-1", "doc-1", "Chunk text", "Heading", "[[Doc#Heading]]", 0.91)
        ]);
        var search = new Mock<IRagSearchService>(MockBehavior.Strict);
        search.Setup(mock => mock.SearchAsync(
                It.Is<RagSearchRequest>(request => request.Query == " vector search " && request.TopK == 7),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);
        await using var factory = new OfflineApplicationFactory(services => services.AddScoped(_ => search.Object));
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/rag/search", new RagSearchRequest(" vector search ", 7));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<RagSearchResponse>();
        body.Should().BeEquivalentTo(expected);
        search.VerifyAll();
    }

    [Fact]
    public async Task PostRagSearch_ReturnsProblemDetailsForServiceValidationException()
    {
        var search = new Mock<IRagSearchService>(MockBehavior.Strict);
        search.Setup(mock => mock.SearchAsync(It.IsAny<RagSearchRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ArgumentException("Query is required."));
        await using var factory = new OfflineApplicationFactory(services => services.AddScoped(_ => search.Object));
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/rag/search", new RagSearchRequest("   ", 5));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        response.Content.Headers.ContentType?.MediaType.Should().Be("application/problem+json");
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        problem.Should().BeEquivalentTo(new
        {
            Status = 400,
            Title = "Bad Request",
            Detail = "Query is required.",
        });
    }

    [Fact]
    public async Task PostRagAsk_TrimsQuestionDelegatesToSearchServiceAndReturnsSources()
    {
        var expectedSources = new[]
        {
            new RagChunkResponse("chunk-1", "doc-1", "Chunk text", "Heading", "[[Doc#Heading]]", 0.91),
        };
        var search = new Mock<IRagSearchService>(MockBehavior.Strict);
        search.Setup(mock => mock.SearchAsync(
                It.Is<RagSearchRequest>(request => request.Query == "When use RAG?" && request.TopK == 99),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RagSearchResponse("When use RAG?", "vector", expectedSources));
        await using var factory = new OfflineApplicationFactory(services => services.AddScoped(_ => search.Object));
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/rag/ask", new RagAskRequest("  When use RAG?  ", 99));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<RagAskResponse>();
        body.Should().NotBeNull();
        body!.Question.Should().Be("When use RAG?");
        body.Mode.Should().Be("vector");
        body.Sources.Should().BeEquivalentTo(expectedSources);
        body.Answer.Should().Be("Answer generation is not implemented yet. Retrieved source chunks: [[Doc#Heading]]");
        search.VerifyAll();
    }

    [Fact]
    public async Task PostRagAsk_RejectsBlankQuestion()
    {
        await using var factory = new OfflineApplicationFactory(_ => { });
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/rag/ask", new RagAskRequest("   ", 5));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        problem!.Detail.Should().Be("Question is required.");
    }

    private sealed class OfflineApplicationFactory : WebApplicationFactory<Program>
    {
        private readonly Action<IServiceCollection> configureTestServices;
        private readonly string? previousMongoConnectionString = Environment.GetEnvironmentVariable("ConnectionStrings__MongoDb");

        public OfflineApplicationFactory(Action<IServiceCollection> configureTestServices)
        {
            this.configureTestServices = configureTestServices;
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
                    ["EmbeddingOptions:ModelId"] = "text-embedding-3-small",
                    ["EmbeddingOptions:VectorDimensions"] = "384",
                    ["EmbeddingOptions:ApiKey"] = "test-key",
                });
            });

            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IHostedService>();
                services.RemoveAll<IBackgroundJobClient>();
                services.RemoveAll<IRecurringJobManager>();
                services.RemoveAll<IIngestionService>();
                services.RemoveAll<IRagSearchService>();
                services.AddScoped(_ => Mock.Of<IIngestionService>());
                services.AddScoped(_ => Mock.Of<IRagSearchService>());
                configureTestServices(services);
            });
        }

        public override async ValueTask DisposeAsync()
        {
            Environment.SetEnvironmentVariable("ConnectionStrings__MongoDb", previousMongoConnectionString);

            await base.DisposeAsync();
        }
    }
}
