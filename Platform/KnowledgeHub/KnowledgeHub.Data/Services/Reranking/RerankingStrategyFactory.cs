namespace KnowledgeHub.Data.Services.Reranking;

using KnowledgeHub.Data.Models;

public sealed class RerankingStrategyFactory(IEnumerable<IRerankingStrategy> strategies) : IRerankingStrategyFactory
{
    public IRerankingStrategy Create(RerankingStrategyKind strategy) => strategies.Single(item => item.Strategy == strategy);
}
