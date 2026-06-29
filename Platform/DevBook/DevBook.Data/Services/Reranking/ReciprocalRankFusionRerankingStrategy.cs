namespace DevBook.Data.Services.Reranking;

using DevBook.Data.Models;

/// <summary>
/// Reranks chunks by fusing vector rank and BM25 lexical rank.
/// </summary>
public sealed class ReciprocalRankFusionRerankingStrategy : IRerankingStrategy
{
    private const int RankConstant = 60;
    private const double VectorWeight = 1;
    private const double LexicalWeight = 2;
    private const double MaximumScore = VectorWeight + LexicalWeight;

    /// <summary>
    /// Gets the reranking strategy implemented by this type.
    /// </summary>
    public RerankingStrategyKind Strategy => RerankingStrategyKind.ReciprocalRankFusion;

    /// <summary>
    /// Combines the original vector-search rank with a BM25 lexical rank using reciprocal rank fusion.
    /// </summary>
    /// <param name="query">The search query.</param>
    /// <param name="candidates">The candidate chunks to rerank.</param>
    /// <param name="topK">Maximum number of results to return.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    /// <returns>The top chunks ordered by fused vector and lexical rank.</returns>
    public Task<IReadOnlyList<RagChunkResponse>> RerankAsync(
        string query,
        IReadOnlyList<RagChunkResponse> candidates,
        int topK,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(candidates);

        var vectorRanks = candidates
            .Select((candidate, index) => new { candidate.ChunkId, Rank = index + 1 })
            .ToDictionary(item => item.ChunkId, item => item.Rank, StringComparer.Ordinal);
        var bm25Scores = RerankingText.Bm25Scores(query, candidates);
        var lexicalRanks = candidates
            .Select((candidate, index) => new
            {
                candidate.ChunkId,
                OriginalRank = index + 1,
                Score = bm25Scores[index],
            })
            .OrderByDescending(item => item.Score)
            .ThenBy(item => item.OriginalRank)
            .Select((item, index) => new { item.ChunkId, Rank = index + 1 })
            .ToDictionary(item => item.ChunkId, item => item.Rank, StringComparer.Ordinal);

        var scoredCandidates = candidates
            .Select(candidate => new RerankingText.ScoredCandidate(
                candidate,
                vectorRanks[candidate.ChunkId],
                ((VectorWeight * RelativeReciprocal(vectorRanks[candidate.ChunkId])) + (LexicalWeight * RelativeReciprocal(lexicalRanks[candidate.ChunkId]))) / MaximumScore))
            .ToArray();

        var results = scoredCandidates
            .OrderByDescending(item => item.Score)
            .ThenBy(item => item.OriginalRank)
            .Take(topK)
            .Select(item => item.Candidate with { Score = item.Score })
            .ToArray();

        return Task.FromResult<IReadOnlyList<RagChunkResponse>>(results);
    }

    private static double RelativeReciprocal(int rank) => (RankConstant + 1D) / (RankConstant + rank);
}
