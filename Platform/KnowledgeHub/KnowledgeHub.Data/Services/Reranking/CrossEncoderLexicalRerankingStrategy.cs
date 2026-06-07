namespace KnowledgeHub.Data.Services.Reranking;

using KnowledgeHub.Data.Models;

public sealed class CrossEncoderLexicalRerankingStrategy : IRerankingStrategy
{
    public RerankingStrategyKind Strategy => RerankingStrategyKind.CrossEncoderLexical;

    public IReadOnlyList<RagChunkResponse> Rerank(string query, IReadOnlyList<RagChunkResponse> candidates, int topK)
    {
        ArgumentNullException.ThrowIfNull(candidates);

        var scoredCandidates = candidates
            .Select((candidate, index) => new RerankingText.ScoredCandidate(
                candidate,
                index + 1,
                RerankingText.LexicalScore(query, candidate)))
            .ToArray();

        return scoredCandidates
            .OrderByDescending(item => item.Score)
            .ThenByDescending(item => item.Candidate.Score)
            .ThenBy(item => item.OriginalRank)
            .Take(topK)
            .Select(item => item.Candidate with { Score = item.Score })
            .ToArray();
    }
}
