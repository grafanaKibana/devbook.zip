namespace DevBook.API.Extensions;

using DevBook.Data.Models;
using DevBook.Data.Services;

/// <summary>
/// Adds minimal API endpoint mapping helpers.
/// </summary>
public static class AddEndpointsExtensions
{
    extension(WebApplication app)
    {
        /// <summary>
        /// Maps ingestion, RAG search, and RAG ask endpoints.
        /// </summary>
        /// <returns>The same web application so endpoint mapping can be chained.</returns>
        public WebApplication AddEndpoints()
        {
            app.MapPost("/ingestion/documents",
                    async (IngestionRequest request, IIngestionService ingestionService, CancellationToken cancellationToken) =>
                    {
                        var result = await ingestionService.IngestDocumentsAsync(request, cancellationToken);

                        return Results.Ok(result);
                    })
                .WithName("IngestDocument");

            app.MapPost("/rag/search",
                    async (RagSearchRequest request, IRagSearchService ragSearchService, CancellationToken cancellationToken) =>
                    {
                        var result = await ragSearchService.SearchAsync(request, cancellationToken);

                        return Results.Ok(result);
                    })
                .WithName("RagSearch");

            app.MapPost("/rag/ask",
                    async (RagAskRequest request, IRagAskService ragAskService, CancellationToken cancellationToken) =>
                    {
                        var result = await ragAskService.AskAsync(request, cancellationToken);

                        return Results.Ok(result);
                    })
                .WithName("RagAsk");
            return app;
        }
    }
}
