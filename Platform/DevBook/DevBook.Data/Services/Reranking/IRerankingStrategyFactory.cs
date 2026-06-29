namespace DevBook.Data.Services.Reranking;

using DevBook.Data.Models;

/// <summary>
/// Defines reranking strategy factory operations.
/// </summary>
public interface IRerankingStrategyFactory
{
    /// <summary>
    /// Creates a reranking strategy implementation.
    /// </summary>
    /// <param name="strategy">The reranking strategy kind.</param>
    /// <returns>The matching reranking strategy.</returns>
    IRerankingStrategy Create(RerankingStrategyKind strategy);
}
