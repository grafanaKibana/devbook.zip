namespace DevBook.Tests;

using System.Net;
using System.Net.Http.Json;
using DevBook.API.Extensions;
using DevBook.Data.Models;
using DevBook.Data.Services;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.TestHost;
using Moq;

public sealed class EndpointTests
{
    [Fact]
    public async Task Endpoints_forward_requests_and_return_service_payloads()
    {
        var ingestion = new Mock<IIngestionService>(MockBehavior.Strict);
        var search = new Mock<IRagSearchService>(MockBehavior.Strict);
        var ask = new Mock<IRagAskService>(MockBehavior.Strict);
        var ingestionRequest = new IngestionRequest("Scope", "Note.md", true);
        var searchRequest = new RagSearchRequest(" vector search ", 7);
        var askRequest = new RagAskRequest(" question ", 99);
        var ingested = new IngestionResult(true, 1, 1, 0, 0, ["doc"]);
        var sources = new[] { new RagChunkResponse("chunk", "doc", "Evidence", "Heading", "[[Doc#Heading]]", 0.9) };
        var searched = new RagSearchResponse("vector search", "vector", sources);
        var answered = new RagAskResponse("question", "Answer [[Doc#Heading]]", "vector", sources);
        ingestion.Setup(s => s.IngestDocumentsAsync(ingestionRequest, It.IsAny<CancellationToken>())).ReturnsAsync(ingested);
        search.Setup(s => s.SearchAsync(searchRequest, It.IsAny<CancellationToken>())).ReturnsAsync(searched);
        ask.Setup(s => s.AskAsync(askRequest, It.IsAny<CancellationToken>())).ReturnsAsync(answered);
        await using var app = await Start(ingestion.Object, search.Object, ask.Object);
        using var client = app.GetTestClient();
        var ingestionResponse = await client.PostAsJsonAsync("/ingestion/documents", ingestionRequest);
        var searchResponse = await client.PostAsJsonAsync("/rag/search", searchRequest);
        var askResponse = await client.PostAsJsonAsync("/rag/ask", askRequest);
        ingestionResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        searchResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        askResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        (await ingestionResponse.Content.ReadFromJsonAsync<IngestionResult>()).Should().BeEquivalentTo(ingested);
        (await searchResponse.Content.ReadFromJsonAsync<RagSearchResponse>()).Should().BeEquivalentTo(searched);
        (await askResponse.Content.ReadFromJsonAsync<RagAskResponse>()).Should().BeEquivalentTo(answered);
        ingestion.VerifyAll();
        search.VerifyAll();
        ask.VerifyAll();
    }

    [Theory]
    [InlineData("/rag/search", "argument")]
    [InlineData("/rag/ask", "argument")]
    [InlineData("/ingestion/documents", "directory")]
    [InlineData("/ingestion/documents", "file")]
    public async Task Client_errors_use_production_ProblemDetails_handler(string path, string error)
    {
        Exception exception = error switch
        {
            "directory" => new DirectoryNotFoundException("missing directory"),
            "file" => new FileNotFoundException("missing file"),
            _ => new ArgumentException("required input"),
        };
        var ingestion = new Mock<IIngestionService>(MockBehavior.Strict);
        var search = new Mock<IRagSearchService>(MockBehavior.Strict);
        var ask = new Mock<IRagAskService>(MockBehavior.Strict);
        ingestion.Setup(s => s.IngestDocumentsAsync(It.IsAny<IngestionRequest>(), It.IsAny<CancellationToken>())).ThrowsAsync(exception);
        search.Setup(s => s.SearchAsync(It.IsAny<RagSearchRequest>(), It.IsAny<CancellationToken>())).ThrowsAsync(exception);
        ask.Setup(s => s.AskAsync(It.IsAny<RagAskRequest>(), It.IsAny<CancellationToken>())).ThrowsAsync(exception);
        await using var app = await Start(ingestion.Object, search.Object, ask.Object);
        using var client = app.GetTestClient();
        var response = await client.PostAsJsonAsync(path, new { query = " ", question = " ", sourcePath = "missing" });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        response.Content.Headers.ContentType!.MediaType.Should().Be("application/problem+json");
        (await response.Content.ReadFromJsonAsync<ProblemDetails>()).Should().BeEquivalentTo(new
        {
            Status = 400,
            Title = "Bad Request",
            Detail = exception.Message,
        });
    }

    private static async Task<WebApplication> Start(IIngestionService ingestion, IRagSearchService search, IRagAskService ask)
    {
        // Host the production HTTP boundary without Program's Mongo/index/Hangfire startup or user configuration.
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Testing", Args = [] });
        builder.Configuration.Sources.Clear();
        builder.WebHost.UseTestServer();
        builder.Services.AddProblemDetails();
        var handler = typeof(AddEndpointsExtensions).Assembly.GetType("DevBook.API.ExceptionHandling.ClientRequestExceptionHandler", throwOnError: true)!;
        builder.Services.AddSingleton(typeof(IExceptionHandler), handler);
        builder.Services.AddSingleton(ingestion);
        builder.Services.AddSingleton(search);
        builder.Services.AddSingleton(ask);
        var app = builder.Build();
        app.UseExceptionHandler();
        app.AddEndpoints();
        await app.StartAsync();
        return app;
    }
}
