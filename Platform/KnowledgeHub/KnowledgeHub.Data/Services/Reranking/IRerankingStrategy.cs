namespace KnowledgeHub.Data.Services.Reranking;

using KnowledgeHub.Data.Models;

public interface IRerankingStrategy
{
    RerankingStrategyKind Strategy { get; }

    IReadOnlyList<RagChunkResponse> Rerank(string query, IReadOnlyList<RagChunkResponse> candidates, int topK);
}
