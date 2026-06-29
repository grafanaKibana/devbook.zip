namespace DevBook.Data.Services.Reranking;

using DevBook.Data.Models;

/// <summary>
/// Creates reranking strategy instances.
/// </summary>
/// <param name="strategies">Registered reranking strategies.</param>
public sealed class RerankingStrategyFactory(IEnumerable<IRerankingStrategy> strategies) : IRerankingStrategyFactory
{
    /// <summary>
    /// Creates a reranking strategy implementation.
    /// </summary>
    /// <param name="strategy">The reranking strategy kind.</param>
    /// <returns>The matching reranking strategy.</returns>
    public IRerankingStrategy Create(RerankingStrategyKind strategy) => strategies.Single(item => item.Strategy == strategy);
}
