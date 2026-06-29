namespace DevBook.Data.Services.Reranking;

using DevBook.Data.Models;

/// <summary>
/// Preserves MongoDB Atlas Vector Search order without reranking.
/// </summary>
public sealed class NoRerankingStrategy : IRerankingStrategy
{
    /// <summary>
    /// Gets the reranking strategy implemented by this type.
    /// </summary>
    public RerankingStrategyKind Strategy => RerankingStrategyKind.NoReranking;

    /// <summary>
    /// Returns the first <paramref name="topK"/> candidates in their existing order.
    /// </summary>
    /// <param name="query">The search query.</param>
    /// <param name="candidates">The candidate chunks to rerank.</param>
    /// <param name="topK">Maximum number of results to return.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    /// <returns>The top candidates in the original vector-search order.</returns>
    public Task<IReadOnlyList<RagChunkResponse>> RerankAsync(
        string query,
        IReadOnlyList<RagChunkResponse> candidates,
        int topK,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(candidates);

        return Task.FromResult<IReadOnlyList<RagChunkResponse>>(candidates.Take(topK).ToArray());
    }
}
