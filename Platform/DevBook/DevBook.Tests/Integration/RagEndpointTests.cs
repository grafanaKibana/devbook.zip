namespace DevBook.Tests.Integration;

using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using DevBook.Data.Models;
using DevBook.Data.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Moq;

/// <summary>
/// Contains tests for RAG endpoints.
/// </summary>
public sealed class RagEndpointTests : IntegrationTestBase
{
    private const string SearchPath = "/rag/search";
    private const string AskPath = "/rag/ask";
    private const string SearchQuery = " vector search ";
    private const string Question = "When use RAG?";
    private readonly Mock<IRagSearchService> search = new(MockBehavior.Strict);
    private readonly Mock<IRagAskService> ask = new(MockBehavior.Strict);

    /// <summary>
    /// Tests that the RAG search endpoint passes user input to the search service and returns vector search results.
    /// </summary>
    [Fact]
    public async Task PostRagSearch_ValidRequest_ReturnsSearchServiceResponse()
    {
        // Arrange
        var expected = new RagSearchResponse("vector search", "vector", [
            new RagChunkResponse("chunk-1", "doc-1", "Chunk text", "Heading", "[[Doc#Heading]]", 0.91)
        ]);
        RagSearchRequest? capturedRequest = null;
        search.Setup(mock => mock.SearchAsync(It.IsAny<RagSearchRequest>(), It.IsAny<CancellationToken>()))
            .Callback<RagSearchRequest, CancellationToken>((request, _) => capturedRequest = request)
            .ReturnsAsync(expected);

        // Act
        var response = await this.Client.PostAsJsonAsync(SearchPath, new RagSearchRequest(SearchQuery, 7));

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        capturedRequest.Should().BeEquivalentTo(new RagSearchRequest(SearchQuery, 7));
        var body = await response.Content.ReadFromJsonAsync<RagSearchResponse>();
        body.Should().BeEquivalentTo(expected);
    }

    /// <summary>
    /// Tests that the RAG search endpoint converts service validation exceptions into HTTP 400 ProblemDetails responses.
    /// </summary>
    [Fact]
    public async Task PostRagSearch_ServiceValidationException_ReturnsBadRequestProblemDetails()
    {
        // Arrange
        search.Setup(mock => mock.SearchAsync(It.IsAny<RagSearchRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ArgumentException("Query is required."));

        // Act
        var response = await this.Client.PostAsJsonAsync(SearchPath, new RagSearchRequest("   ", 5));

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
    /// Tests that the RAG ask endpoint trims questions and returns retrieved sources.
    /// </summary>
    [Fact]
    public async Task PostRagAsk_QuestionWithWhitespace_ReturnsTrimmedQuestionAndRetrievedSources()
    {
        // Arrange
        var expectedSources = new[]
        {
            new RagChunkResponse("chunk-1", "doc-1", "Chunk text", "Heading", "[[Doc#Heading]]", 0.91),
        };
        var expected = new RagAskResponse(Question, "Grounded answer. [[Doc#Heading]]", "vector", expectedSources);
        RagAskRequest? capturedRequest = null;
        ask.Setup(mock => mock.AskAsync(It.IsAny<RagAskRequest>(), It.IsAny<CancellationToken>()))
            .Callback<RagAskRequest, CancellationToken>((request, _) => capturedRequest = request)
            .ReturnsAsync(expected);

        // Act
        var response = await this.Client.PostAsJsonAsync(AskPath, new RagAskRequest($"  {Question}  ", 99));

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        capturedRequest.Should().BeEquivalentTo(new RagAskRequest($"  {Question}  ", 99));
        var body = await response.Content.ReadFromJsonAsync<RagAskResponse>();
        body.Should().BeEquivalentTo(expected);
    }

    /// <summary>
    /// Tests that the RAG ask endpoint rejects empty questions before sending them to retrieval.
    /// </summary>
    [Fact]
    public async Task PostRagAsk_EmptyQuestion_ReturnsBadRequestProblemDetails()
    {
        // Arrange
        ask.Setup(mock => mock.AskAsync(It.IsAny<RagAskRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ArgumentException("Question is required."));

        // Act
        var response = await this.Client.PostAsJsonAsync(AskPath, new RagAskRequest("   ", 5));

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        problem.Should().BeEquivalentTo(new { Detail = "Question is required." });
    }

    /// <inheritdoc />
    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.AddScoped(_ => search.Object);
        services.AddScoped(_ => ask.Object);
    }
}
