namespace KnowledgeHub.Data.Services;

using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Repositories;

public class RagSearchService(
    EmbeddingService embeddingService,
    IChunkRepository chunkRepository)
{
    private const int DefaultTopK = 5;
    private const int MaxTopK = 10;

    public virtual async Task<RagSearchResponse> SearchAsync(
        RagSearchRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.Query))
        {
            throw new ArgumentException("Query is required.");
        }

        var query = request.Query.Trim();
        var topK = request.TopK <= 0
            ? DefaultTopK
            : Math.Min(request.TopK, MaxTopK);

        var embeddings = await embeddingService.GenerateEmbeddingsAsync([query], cancellationToken);
        var queryVector = embeddings[0];
        var results = await chunkRepository.VectorSearchAsync(queryVector, topK, cancellationToken);

        return new RagSearchResponse(query, "vector", results);
    }
}
