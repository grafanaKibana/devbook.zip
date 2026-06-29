namespace DevBook.Data.Services.Reranking;

using DevBook.Data.Models;

/// <summary>
/// Implements BM25 lexical reranking.
/// </summary>
public sealed class Bm25RerankingStrategy : IRerankingStrategy
{
    /// <summary>
    /// Gets the reranking strategy implemented by this type.
    /// </summary>
    public RerankingStrategyKind Strategy => RerankingStrategyKind.Bm25;

    /// <summary>
    /// Reranks chunks by normalized BM25 lexical overlap with the query.
    /// </summary>
    /// <param name="query">The search query.</param>
    /// <param name="candidates">The candidate chunks to rerank.</param>
    /// <param name="topK">Maximum number of results to return.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    /// <returns>The top chunks ordered by BM25 score, with returned scores replaced by normalized BM25 scores.</returns>
    public Task<IReadOnlyList<RagChunkResponse>> RerankAsync(
        string query,
        IReadOnlyList<RagChunkResponse> candidates,
        int topK,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(candidates);

        var scores = RerankingText.BoundedBm25Scores(query, candidates);
        var results = candidates
            .Select((candidate, index) => new RerankingText.ScoredCandidate(candidate, index + 1, scores[index]))
            .OrderByDescending(item => item.Score)
            .ThenByDescending(item => item.Candidate.Score)
            .ThenBy(item => item.OriginalRank)
            .Take(topK)
            .Select(item => item.Candidate with { Score = item.Score })
            .ToArray();

        return Task.FromResult<IReadOnlyList<RagChunkResponse>>(results);
    }
}
