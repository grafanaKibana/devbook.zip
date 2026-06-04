namespace KnowledgeHub.Data.Services;

using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Repositories;

public class RagSearchService(
    IEmbeddingService embeddingService,
    IChunkRepositoryFactory chunkRepositoryFactory) : IRagSearchService
{
    private const int DefaultTopK = 5;
    private const int MaxTopK = 10;

    public async Task<RagSearchResponse> SearchAsync(
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

        var embedding = await embeddingService.GenerateEmbeddingAsync(query, cancellationToken);
        var chunkRepository = chunkRepositoryFactory.Create(request.ChunkingStrategy);
        var results = await chunkRepository.VectorSearchAsync(embedding, topK, cancellationToken);

        return new RagSearchResponse(query, "vector", results);
    }
}
