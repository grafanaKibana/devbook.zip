namespace KnowledgeHub.Data.Services.Reranking;

using KnowledgeHub.Data.Models;

public sealed class LateInteractionRerankingStrategy : IRerankingStrategy
{
    public RerankingStrategyKind Strategy => RerankingStrategyKind.LateInteraction;

    public IReadOnlyList<RagChunkResponse> Rerank(string query, IReadOnlyList<RagChunkResponse> candidates, int topK)
    {
        ArgumentNullException.ThrowIfNull(candidates);

        var queryTokens = RerankingText.Tokenize(query);
        if (queryTokens.Count == 0)
        {
            return candidates.Take(topK).ToArray();
        }

        return candidates
            .Select((candidate, index) => new
            {
                Candidate = candidate,
                OriginalRank = index + 1,
                Score = MaxSimScore(queryTokens, RerankingText.Tokenize(RerankingText.CreateSearchText(candidate))),
            })
            .OrderByDescending(item => item.Score)
            .ThenByDescending(item => item.Candidate.Score)
            .ThenBy(item => item.OriginalRank)
            .Take(topK)
            .Select(item => item.Candidate with { Score = item.Score })
            .ToArray();
    }

    private static double MaxSimScore(IReadOnlyList<string> queryTokens, IReadOnlyList<string> candidateTokens)
    {
        if (candidateTokens.Count == 0)
        {
            return 0;
        }

        return queryTokens
            .Select(queryToken => candidateTokens.Max(candidateToken => TokenSimilarity(queryToken, candidateToken)))
            .Average();
    }

    private static double TokenSimilarity(string left, string right)
    {
        if (string.Equals(left, right, StringComparison.Ordinal))
        {
            return 1;
        }

        var leftTrigrams = CreateTrigrams(left);
        var rightTrigrams = CreateTrigrams(right);
        var intersection = leftTrigrams.Intersect(rightTrigrams, StringComparer.Ordinal).Count();
        var union = leftTrigrams.Union(rightTrigrams, StringComparer.Ordinal).Count();

        return union == 0 ? 0 : intersection / (double)union;
    }

    private static IReadOnlyCollection<string> CreateTrigrams(string token)
    {
        var padded = $"  {token}  ";
        return Enumerable.Range(0, Math.Max(0, padded.Length - 2))
            .Select(index => padded.Substring(index, 3))
            .ToArray();
    }
}
