namespace KnowledgeHub.Data.Services.Reranking;

using KnowledgeHub.Data.Models;

public sealed class CrossEncoderLexicalRerankingStrategy : IRerankingStrategy
{
    public RerankingStrategyKind Strategy => RerankingStrategyKind.CrossEncoderLexical;

    public IReadOnlyList<RagChunkResponse> Rerank(string query, IReadOnlyList<RagChunkResponse> candidates, int topK)
    {
        ArgumentNullException.ThrowIfNull(candidates);

        return candidates
            .Select((candidate, index) => new
            {
                Candidate = candidate,
                OriginalRank = index + 1,
                Score = RerankingText.LexicalScore(query, candidate),
            })
            .OrderByDescending(item => item.Score)
            .ThenByDescending(item => item.Candidate.Score)
            .ThenBy(item => item.OriginalRank)
            .Take(topK)
            .Select(item => item.Candidate with { Score = item.Score })
            .ToArray();
    }
}
