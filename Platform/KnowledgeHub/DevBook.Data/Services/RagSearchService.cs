namespace DevBook.Data.Services;

using DevBook.Data.Models;
using DevBook.Data.Options;
using DevBook.Data.Repositories;
using DevBook.Data.Services.Reranking;
using Microsoft.Extensions.Options;

public class RagSearchService(
    IEmbeddingService embeddingService,
    IChunkRepositoryFactory chunkRepositoryFactory,
    IRerankingStrategyFactory rerankingStrategyFactory,
    IOptions<RagSearchOptions> options) : IRagSearchService
{
    private readonly RagSearchOptions options = options.Value;

    private const int DefaultTopK = 5;
    private const int MaxTopK = 10;
    private const int RerankingCandidateMultiplier = 4;
    private const int MaxRerankingCandidateCount = 50;

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
        var rerankingStrategy = rerankingStrategyFactory.Create(options.RerankingStrategy);
        var candidateCount = Math.Min(topK * RerankingCandidateMultiplier, MaxRerankingCandidateCount);

        var embedding = await embeddingService.GenerateEmbeddingAsync(query, cancellationToken);
        var chunkRepository = chunkRepositoryFactory.Create(options.ChunkingStrategy);
        var candidates = await chunkRepository.VectorSearchAsync(embedding, candidateCount, cancellationToken);
        var results = await rerankingStrategy.RerankAsync(query, candidates, topK, cancellationToken);

        return new RagSearchResponse(query, $"vector+{options.RerankingStrategy}", results);
    }
}
