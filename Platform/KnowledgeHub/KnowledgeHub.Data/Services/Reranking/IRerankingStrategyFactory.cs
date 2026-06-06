namespace KnowledgeHub.Data.Services.Reranking;

using KnowledgeHub.Data.Models;

public interface IRerankingStrategyFactory
{
    IRerankingStrategy Create(RerankingStrategyKind strategy);
}
