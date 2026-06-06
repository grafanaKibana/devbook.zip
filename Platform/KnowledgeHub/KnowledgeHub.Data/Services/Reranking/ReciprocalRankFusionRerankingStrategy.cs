namespace KnowledgeHub.Data.Services.Reranking;

using KnowledgeHub.Data.Models;

public sealed class ReciprocalRankFusionRerankingStrategy : IRerankingStrategy
{
    private const int RankConstant = 60;
    private const double VectorWeight = 1;
    private const double LexicalWeight = 2;

    public RerankingStrategyKind Strategy => RerankingStrategyKind.ReciprocalRankFusion;

    public IReadOnlyList<RagChunkResponse> Rerank(string query, IReadOnlyList<RagChunkResponse> candidates, int topK)
    {
        ArgumentNullException.ThrowIfNull(candidates);

        var vectorRanks = candidates
            .Select((candidate, index) => new { candidate.ChunkId, Rank = index + 1 })
            .ToDictionary(item => item.ChunkId, item => item.Rank, StringComparer.Ordinal);
        var lexicalRanks = candidates
            .Select((candidate, index) => new
            {
                candidate.ChunkId,
                OriginalRank = index + 1,
                Score = RerankingText.LexicalScore(query, candidate),
            })
            .OrderByDescending(item => item.Score)
            .ThenBy(item => item.OriginalRank)
            .Select((item, index) => new { item.ChunkId, Rank = index + 1 })
            .ToDictionary(item => item.ChunkId, item => item.Rank, StringComparer.Ordinal);

        return candidates
            .Select(candidate => new
            {
                Candidate = candidate,
                Score = (VectorWeight * Reciprocal(vectorRanks[candidate.ChunkId])) + (LexicalWeight * Reciprocal(lexicalRanks[candidate.ChunkId])),
                VectorRank = vectorRanks[candidate.ChunkId],
            })
            .OrderByDescending(item => item.Score)
            .ThenBy(item => item.VectorRank)
            .Take(topK)
            .Select(item => item.Candidate with { Score = item.Score })
            .ToArray();
    }

    private static double Reciprocal(int rank) => 1D / (RankConstant + rank);
}
