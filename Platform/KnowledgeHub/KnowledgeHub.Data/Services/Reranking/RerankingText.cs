namespace KnowledgeHub.Data.Services.Reranking;

using System.Text.RegularExpressions;
using KnowledgeHub.Data.Models;

internal static partial class RerankingText
{
    private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "how", "i", "in", "is", "it", "of", "on", "or", "should", "the", "to", "use", "what", "when", "where", "why", "with",
    };

    public static IReadOnlyList<string> Tokenize(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return [];
        }

        return WordRegex()
            .Matches(text.ToLowerInvariant())
            .Select(match => match.Value)
            .Where(token => token.Length > 1 && !StopWords.Contains(token))
            .ToArray();
    }

    public static double LexicalScore(string query, RagChunkResponse candidate)
    {
        var queryTokens = Tokenize(query);
        if (queryTokens.Count == 0)
        {
            return 0;
        }

        var candidateTokens = Tokenize(CreateSearchText(candidate));
        if (candidateTokens.Count == 0)
        {
            return 0;
        }

        var candidateCounts = candidateTokens
            .GroupBy(token => token, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.Count(), StringComparer.Ordinal);
        var uniqueQueryTokens = queryTokens.Distinct(StringComparer.Ordinal).ToArray();
        var matchedTokens = uniqueQueryTokens.Count(token => candidateCounts.ContainsKey(token));
        var coverage = matchedTokens / (double)uniqueQueryTokens.Length;
        var density = uniqueQueryTokens
            .Average(token => candidateCounts.TryGetValue(token, out var count) ? count / (double)(count + 1) : 0);
        var phraseMatch = CreateSearchText(candidate).Contains(query.Trim(), StringComparison.OrdinalIgnoreCase) ? 1 : 0;

        return (coverage * 0.7) + (density * 0.2) + (phraseMatch * 0.1);
    }

    public static string CreateSearchText(RagChunkResponse candidate) => string.Join(' ', candidate.Heading, candidate.CitationLabel, candidate.ChunkText);

    public sealed record ScoredCandidate(RagChunkResponse Candidate, int OriginalRank, double Score);

    [GeneratedRegex("[\\p{L}\\p{N}]+", RegexOptions.CultureInvariant)]
    private static partial Regex WordRegex();
}
