namespace KnowledgeHub.Tests.Integration;

using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Services;
using Microsoft.Extensions.DependencyInjection;
using Moq;

public sealed class IngestionEndpointTests : IntegrationTestBase
{
    private const string IngestionPath = "/ingestion/documents";
    private const string SourcePath = "Scope";
    private const string FileName = "Note.md";

    /// <summary>
    /// Protects the ingestion HTTP contract by verifying the endpoint accepts the request DTO and returns the service result unchanged.
    /// </summary>
    [Fact]
    public async Task PostIngestionDocuments_DelegatesToIngestionServiceAndReturnsResult()
    {
        // Arrange
        var expected = new IngestionResult(true, 1, 1, 0, 0, ["doc-1"]);
        IngestionRequest? capturedRequest = null;
        var ingestion = new Mock<IIngestionService>(MockBehavior.Strict);
        ingestion.Setup(mock => mock.IngestDocumentsAsync(It.IsAny<IngestionRequest>(), It.IsAny<CancellationToken>()))
            .Callback<IngestionRequest, CancellationToken>((request, _) => capturedRequest = request)
            .ReturnsAsync(expected);
        await using var factory = CreateApplicationFactory(services => services.AddScoped(_ => ingestion.Object));
        using var client = factory.CreateClient();

        // Act
        var response = await client.PostAsJsonAsync(IngestionPath, new IngestionRequest(SourcePath, FileName));

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        capturedRequest.Should().BeEquivalentTo(new IngestionRequest(SourcePath, FileName));
        var body = await response.Content.ReadFromJsonAsync<IngestionResult>();
        body.Should().BeEquivalentTo(expected);
    }
}
