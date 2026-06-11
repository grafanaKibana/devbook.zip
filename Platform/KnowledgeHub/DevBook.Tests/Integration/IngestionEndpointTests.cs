namespace DevBook.Tests.Integration;

using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using DevBook.Data.Models;
using DevBook.Data.Services;
using Microsoft.Extensions.DependencyInjection;
using Moq;

public sealed class IngestionEndpointTests : IntegrationTestBase
{
    private const string IngestionPath = "/ingestion/documents";
    private const string SourcePath = "Scope";
    private const string FileName = "Note.md";
    private readonly Mock<IIngestionService> ingestion = new(MockBehavior.Strict);

    /// <summary>
    /// Tests that the ingestion endpoint passes the request body to the ingestion service and returns the service result.
    /// </summary>
    [Fact]
    public async Task PostIngestionDocuments_ValidRequest_ReturnsIngestionServiceResult()
    {
        // Arrange
        var expected = new IngestionResult(true, 1, 1, 0, 0, ["doc-1"]);
        IngestionRequest? capturedRequest = null;
        ingestion.Setup(mock => mock.IngestDocumentsAsync(It.IsAny<IngestionRequest>(), It.IsAny<CancellationToken>()))
            .Callback<IngestionRequest, CancellationToken>((request, _) => capturedRequest = request)
            .ReturnsAsync(expected);

        // Act
        var response = await this.Client.PostAsJsonAsync(IngestionPath, new IngestionRequest(SourcePath, FileName, true));

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        capturedRequest.Should().BeEquivalentTo(new IngestionRequest(SourcePath, FileName, true));
        var body = await response.Content.ReadFromJsonAsync<IngestionResult>();
        body.Should().BeEquivalentTo(expected);
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.AddScoped(_ => ingestion.Object);
    }
}
