namespace DevBook.Data.Services.Reranking;

using DevBook.Data.Agents;
using DevBook.Data.Models;
using Microsoft.Agents.AI;
using Microsoft.Extensions.DependencyInjection;

/// <summary>
/// Reranks chunks with a <see cref="Microsoft.Agents.AI.AIAgent"/>.
/// </summary>
public sealed class LlmRerankingStrategy(
    [FromKeyedServices(nameof(RerankingAgent))] AIAgent rerankingAgent) : IRerankingStrategy
{
    /// <summary>
    /// Gets the reranking strategy implemented by this type.
    /// </summary>
    public RerankingStrategyKind Strategy => RerankingStrategyKind.Llm;

    /// <summary>
    /// Asks the reranking agent to rank candidate chunk identifiers for the query.
    /// </summary>
    /// <param name="query">The search query.</param>
    /// <param name="candidates">The candidate chunks to rerank.</param>
    /// <param name="topK">Maximum number of results to return.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    /// <returns>The top chunks in the order returned by the reranking agent, followed by original candidates when the agent omits items.</returns>
    public async Task<IReadOnlyList<RagChunkResponse>> RerankAsync(
        string query,
        IReadOnlyList<RagChunkResponse> candidates,
        int topK,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(candidates);

        if (candidates.Count == 0)
        {
            return [];
        }

        var response = await rerankingAgent.RunAsync(BuildAgentInput(query, candidates, topK), cancellationToken: cancellationToken);
        var rankedIds = ExtractRankedIds(response.Text, candidates).Take(topK).ToArray();
        var rankedIdSet = rankedIds.ToHashSet(StringComparer.Ordinal);
        var candidatesById = candidates.ToDictionary(candidate => candidate.ChunkId, StringComparer.Ordinal);
        var ranked = rankedIds
            .Select((chunkId, index) => candidatesById[chunkId] with { Score = 1d - (index / (double)Math.Max(1, topK)) })
            .ToList();

        ranked.AddRange(candidates
            .Where(candidate => !rankedIdSet.Contains(candidate.ChunkId))
            .Take(topK - ranked.Count));

        return ranked;
    }

    private static string BuildAgentInput(string query, IReadOnlyList<RagChunkResponse> candidates, int topK) =>
        $"""
        Query:
        {query}

        Return the top {topK} chunk IDs.

        Candidates:
        {string.Join(Environment.NewLine, candidates.Select(RenderCandidate))}
        """;

    private static string RenderCandidate(RagChunkResponse candidate) =>
        $"""
        ChunkId: {candidate.ChunkId}
        Citation: {candidate.CitationLabel}
        Heading: {candidate.Heading}
        Text: {candidate.ChunkText.Trim()}

        """;

    private static IEnumerable<string> ExtractRankedIds(string text, IReadOnlyList<RagChunkResponse> candidates)
    {
        var emittedIds = new HashSet<string>(StringComparer.Ordinal);

        foreach (var line in text.Split('\n', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries))
        {
            var match = candidates.FirstOrDefault(candidate => line.Contains(candidate.ChunkId, StringComparison.Ordinal));
            if (match is not null && emittedIds.Add(match.ChunkId))
            {
                yield return match.ChunkId;
            }
        }
    }
}
