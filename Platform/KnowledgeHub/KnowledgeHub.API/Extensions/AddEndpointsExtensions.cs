namespace KnowledgeHub.API.Extensions;

using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Services;

public static class AddEndpointsExtensions
{
    extension(WebApplication app)
    {
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
                    async (RagAskRequest request, IRagSearchService ragSearchService, CancellationToken cancellationToken) =>
                    {
                        if (string.IsNullOrWhiteSpace(request.Question))
                        {
                            throw new ArgumentException("Question is required.");
                        }

                        var question = request.Question.Trim();
                        var searchResult = await ragSearchService.SearchAsync(
                            new RagSearchRequest(question, request.TopK),
                            cancellationToken);

                        var answer = "Answer generation is not implemented yet. Retrieved source chunks: "
                                     + string.Join(", ", searchResult.Results.Select(source => source.CitationLabel));

                        return Results.Ok(new RagAskResponse(question, answer, searchResult.Mode, searchResult.Results));
                    })
                .WithName("RagAsk");
            return app;
        }
    }
}
