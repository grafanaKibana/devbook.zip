namespace DevBook.Data.Services.Reranking;

using DevBook.Data.Models;

public sealed class Bm25RerankingStrategy : IRerankingStrategy
{
    public RerankingStrategyKind Strategy => RerankingStrategyKind.Bm25;

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
