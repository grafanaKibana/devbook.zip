namespace DevBook.Data.Services.Reranking;

using DevBook.Data.Models;

/// <summary>
/// Reranks chunks with maximal marginal relevance to reduce near-duplicate results.
/// </summary>
public sealed class MaximalMarginalRelevanceRerankingStrategy : IRerankingStrategy
{
    private const double RelevanceWeight = 0.7;

    /// <summary>
    /// Gets the reranking strategy implemented by this type.
    /// </summary>
    public RerankingStrategyKind Strategy => RerankingStrategyKind.MaximalMarginalRelevance;

    /// <summary>
    /// Selects chunks by balancing BM25 relevance against token-overlap similarity to already selected chunks.
    /// </summary>
    /// <param name="query">The search query.</param>
    /// <param name="candidates">The candidate chunks to rerank.</param>
    /// <param name="topK">Maximum number of results to return.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    /// <returns>The selected chunks ordered by maximal marginal relevance score.</returns>
    public Task<IReadOnlyList<RagChunkResponse>> RerankAsync(
        string query,
        IReadOnlyList<RagChunkResponse> candidates,
        int topK,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(candidates);

        var relevanceScores = RerankingText.BoundedBm25Scores(query, candidates);
        var tokenSets = candidates
            .Select(candidate => RerankingText.Tokenize(RerankingText.CreateSearchText(candidate)).ToHashSet(StringComparer.Ordinal))
            .ToArray();
        var remaining = Enumerable.Range(0, candidates.Count).ToList();
        var selected = new List<int>();

        while (remaining.Count > 0 && selected.Count < topK)
        {
            var best = remaining
                .Select(index => new
                {
                    Index = index,
                    Score = MmrScore(index, selected, relevanceScores, tokenSets),
                })
                .OrderByDescending(item => item.Score)
                .ThenByDescending(item => candidates[item.Index].Score)
                .ThenBy(item => item.Index)
                .First();

            selected.Add(best.Index);
            remaining.Remove(best.Index);
        }

        var results = selected
            .Select(index => candidates[index] with { Score = relevanceScores[index] })
            .ToArray();

        return Task.FromResult<IReadOnlyList<RagChunkResponse>>(results);
    }

    private static double MmrScore(
        int candidateIndex,
        IReadOnlyList<int> selectedIndexes,
        IReadOnlyList<double> relevanceScores,
        IReadOnlyList<HashSet<string>> tokenSets)
    {
        var diversityPenalty = selectedIndexes.Count == 0
            ? 0
            : selectedIndexes.Max(selectedIndex => Jaccard(tokenSets[candidateIndex], tokenSets[selectedIndex]));

        return (RelevanceWeight * relevanceScores[candidateIndex]) - ((1 - RelevanceWeight) * diversityPenalty);
    }

    private static double Jaccard(IReadOnlySet<string> left, IReadOnlySet<string> right)
    {
        if (left.Count == 0 || right.Count == 0)
        {
            return 0;
        }

        var intersection = left.Count(right.Contains);
        var union = left.Count + right.Count - intersection;

        return union == 0 ? 0 : intersection / (double)union;
    }
}
