namespace KnowledgeHub.Data.Services.Reranking;

using KnowledgeHub.Data.Models;

public interface IRerankingStrategy
{
    RerankingStrategyKind Strategy { get; }

    Task<IReadOnlyList<RagChunkResponse>> RerankAsync(
        string query,
        IReadOnlyList<RagChunkResponse> candidates,
        int topK,
        CancellationToken cancellationToken = default);
}
