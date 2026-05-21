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
                    async (IngestionRequest request, IngestionService ingestionService, CancellationToken cancellationToken) =>
                    {
                        var result = await ingestionService.IngestDocumentsAsync(request, cancellationToken);

                        return Results.Ok(result);
                    })
                .WithName("IngestDocument");

            app.MapPost("/rag/search",
                    async (RagSearchRequest request, RagSearchService ragSearchService, CancellationToken cancellationToken) =>
                    {
                        var result = await ragSearchService.SearchAsync(request, cancellationToken);

                        return Results.Ok(result);
                    })
                .WithName("RagSearch");

            app.MapPost("/rag/ask",
                    (RagAskRequest request) =>
                    {
                        if (string.IsNullOrWhiteSpace(request.Question))
                        {
                            throw new ArgumentException("Question is required.");
                        }

                        var topK = Math.Clamp(request.TopK, 1, 5);
                        var question = request.Question.Trim();
                        var sources = CreateMockChunks()
                            .Take(topK)
                            .ToArray();

                        var answer = "Mock answer: a real RAG endpoint will embed the question, retrieve relevant chunks, "
                                     + "and ask an LLM to answer from those chunks. Dummy sources: "
                                     + string.Join(", ", sources.Select(source => source.CitationLabel));

                        return Results.Ok(new RagAskResponse(question, answer, "mock", sources));
                    })
                .WithName("MockRagAsk");
            return app;
        }
    }

    static IReadOnlyList<RagChunkResponse> CreateMockChunks() =>
    [
        new RagChunkResponse(
            "chunk_mock_rag_0001",
            "doc_mock_rag",
            "RAG retrieves relevant knowledge base chunks before asking the model to answer, which keeps answers grounded in your own notes.",
            "RAG Flow",
            "[[RAG#RAG Flow]]",
            0.92),
        new RagChunkResponse(
            "chunk_mock_chunking_0001",
            "doc_mock_chunking",
            "Chunking splits long pages into smaller passages so retrieval can return the specific section that answers the question.",
            "Chunking",
            "[[Chunking#Chunking]]",
            0.84),
        new RagChunkResponse(
            "chunk_mock_embeddings_0001",
            "doc_mock_embeddings",
            "Embeddings turn text into vectors. Query vectors and chunk vectors must use the same model and dimensions.",
            "Embeddings",
            "[[Embeddings#Embeddings]]",
            0.76),
    ];
}
