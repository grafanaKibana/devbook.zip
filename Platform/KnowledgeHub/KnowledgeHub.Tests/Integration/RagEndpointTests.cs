namespace KnowledgeHub.Tests.Integration;

using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Moq;

public sealed class RagEndpointTests : IntegrationTestBase
{
    private const string SearchPath = "/rag/search";
    private const string AskPath = "/rag/ask";
    private const string SearchQuery = " vector search ";
    private const string Question = "When use RAG?";

    /// <summary>
    /// Protects the search HTTP contract by verifying the endpoint passes user input to the retrieval service and serializes vector results.
    /// </summary>
    [Fact]
    public async Task PostRagSearch_DelegatesToSearchServiceAndReturnsResponse()
    {
        // Arrange
        var expected = new RagSearchResponse("vector search", "vector", [
            new RagChunkResponse("chunk-1", "doc-1", "Chunk text", "Heading", "[[Doc#Heading]]", 0.91)
        ]);
        RagSearchRequest? capturedRequest = null;
        var search = new Mock<IRagSearchService>(MockBehavior.Strict);
        search.Setup(mock => mock.SearchAsync(It.IsAny<RagSearchRequest>(), It.IsAny<CancellationToken>()))
            .Callback<RagSearchRequest, CancellationToken>((request, _) => capturedRequest = request)
            .ReturnsAsync(expected);
        await using var factory = CreateApplicationFactory(services => services.AddScoped(_ => search.Object));
        using var client = factory.CreateClient();

        // Act
        var response = await client.PostAsJsonAsync(SearchPath, new RagSearchRequest(SearchQuery, 7));

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        capturedRequest.Should().BeEquivalentTo(new RagSearchRequest(SearchQuery, 7));
        var body = await response.Content.ReadFromJsonAsync<RagSearchResponse>();
        body.Should().BeEquivalentTo(expected);
    }

    /// <summary>
    /// Protects client-facing validation errors by keeping service ArgumentException responses as HTTP 400 ProblemDetails.
    /// </summary>
    [Fact]
    public async Task PostRagSearch_ReturnsProblemDetailsForServiceValidationException()
    {
        // Arrange
        var search = new Mock<IRagSearchService>(MockBehavior.Strict);
        search.Setup(mock => mock.SearchAsync(It.IsAny<RagSearchRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ArgumentException("Query is required."));
        await using var factory = CreateApplicationFactory(services => services.AddScoped(_ => search.Object));
        using var client = factory.CreateClient();

        // Act
        var response = await client.PostAsJsonAsync(SearchPath, new RagSearchRequest("   ", 5));

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        response.Content.Headers.ContentType?.MediaType.Should().Be(ProblemJsonMediaType);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        problem.Should().BeEquivalentTo(new
        {
            Status = 400,
            Title = "Bad Request",
            Detail = "Query is required.",
        });
    }

    /// <summary>
    /// Protects the temporary ask endpoint contract: trim the question, reuse vector search, and expose retrieved chunks as answer sources.
    /// </summary>
    [Fact]
    public async Task PostRagAsk_TrimsQuestionDelegatesToSearchServiceAndReturnsSources()
    {
        // Arrange
        var expectedSources = new[]
        {
            new RagChunkResponse("chunk-1", "doc-1", "Chunk text", "Heading", "[[Doc#Heading]]", 0.91),
        };
        RagSearchRequest? capturedRequest = null;
        var search = new Mock<IRagSearchService>(MockBehavior.Strict);
        search.Setup(mock => mock.SearchAsync(It.IsAny<RagSearchRequest>(), It.IsAny<CancellationToken>()))
            .Callback<RagSearchRequest, CancellationToken>((request, _) => capturedRequest = request)
            .ReturnsAsync(new RagSearchResponse(Question, "vector", expectedSources));
        await using var factory = CreateApplicationFactory(services => services.AddScoped(_ => search.Object));
        using var client = factory.CreateClient();

        // Act
        var response = await client.PostAsJsonAsync(AskPath, new RagAskRequest($"  {Question}  ", 99));

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        capturedRequest.Should().BeEquivalentTo(new RagSearchRequest(Question, 99));
        var body = await response.Content.ReadFromJsonAsync<RagAskResponse>();
        body.Should().BeEquivalentTo(new
        {
            Question,
            Mode = "vector",
            Sources = expectedSources,
            Answer = "Answer generation is not implemented yet. Retrieved source chunks: [[Doc#Heading]]",
        });
    }

    /// <summary>
    /// Protects the ask endpoint from sending empty questions into retrieval, where they would become meaningless embeddings.
    /// </summary>
    [Fact]
    public async Task PostRagAsk_RejectsBlankQuestion()
    {
        // Arrange
        await using var factory = CreateApplicationFactory(_ => { });
        using var client = factory.CreateClient();

        // Act
        var response = await client.PostAsJsonAsync(AskPath, new RagAskRequest("   ", 5));

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        problem.Should().BeEquivalentTo(new { Detail = "Question is required." });
    }
}
