namespace DevBook.Data.Services;

using DevBook.Data.Models;
using DevBook.Data.Options;
using DevBook.Data.Repositories;
using DevBook.Data.Services.Reranking;
using Microsoft.Extensions.Options;

/// <summary>
/// Searches RAG chunks with embeddings and reranking.
/// </summary>
/// <param name="embeddingService">Service used to generate embeddings.</param>
/// <param name="chunkRepositoryFactory">Factory for the configured chunk collection.</param>
/// <param name="rerankingStrategyFactory">Factory for the configured reranking strategy.</param>
/// <param name="options">Configured retrieval and reranking options.</param>
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

    /// <summary>
    /// Searches indexed chunks for a normalized query.
    /// </summary>
    /// <param name="request">The request to process.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    /// <returns>The normalized query, retrieval mode, and matching chunks.</returns>
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
