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
        var termFrequency = uniqueQueryTokens.Sum(token => candidateCounts.TryGetValue(token, out var count) ? Math.Log(1 + count) : 0);
        var coverage = matchedTokens / (double)uniqueQueryTokens.Length;
        var density = termFrequency / Math.Sqrt(candidateTokens.Count);
        var phraseBonus = CreateSearchText(candidate).Contains(query.Trim(), StringComparison.OrdinalIgnoreCase) ? 0.25 : 0;

        return coverage + density + phraseBonus;
    }

    public static string CreateSearchText(RagChunkResponse candidate) => string.Join(' ', candidate.Heading, candidate.CitationLabel, candidate.ChunkText);

    public static double Normalize(double value, double min, double max) => max <= min ? 0 : (value - min) / (max - min);

    [GeneratedRegex("[\\p{L}\\p{N}]+", RegexOptions.CultureInvariant)]
    private static partial Regex WordRegex();
}
