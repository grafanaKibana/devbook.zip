namespace DevBook.Data.Services.Reranking;

using DevBook.Data.Models;

/// <summary>
/// Defines reranking strategy operations.
/// </summary>
public interface IRerankingStrategy
{
    /// <summary>
    /// Gets the reranking strategy kind handled by this implementation.
    /// </summary>
    RerankingStrategyKind Strategy { get; }

    /// <summary>
    /// Reranks vector-search candidates for a query.
    /// </summary>
    /// <param name="query">The normalized search query.</param>
    /// <param name="candidates">The candidate chunks returned by vector search.</param>
    /// <param name="topK">Maximum number of chunks to return after reranking.</param>
    /// <param name="cancellationToken">Token used to cancel reranking work.</param>
    /// <returns>The top reranked chunks.</returns>
    Task<IReadOnlyList<RagChunkResponse>> RerankAsync(
        string query,
        IReadOnlyList<RagChunkResponse> candidates,
        int topK,
        CancellationToken cancellationToken = default);
}
