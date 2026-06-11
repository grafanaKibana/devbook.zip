namespace DevBook.Data.Services.Reranking;

using DevBook.Data.Models;

public sealed class RerankingStrategyFactory(IEnumerable<IRerankingStrategy> strategies) : IRerankingStrategyFactory
{
    public IRerankingStrategy Create(RerankingStrategyKind strategy) => strategies.Single(item => item.Strategy == strategy);
}
