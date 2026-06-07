namespace KnowledgeHub.Data.Services.Reranking;

using System.Text.RegularExpressions;
using KnowledgeHub.Data.Models;

internal static partial class RerankingText
{
    private const double Bm25K1 = 1.2;
    private const double Bm25B = 0.75;

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

    public static IReadOnlyList<double> Bm25Scores(string query, IReadOnlyList<RagChunkResponse> candidates)
    {
        var queryTokens = Tokenize(query);
        if (queryTokens.Count == 0 || candidates.Count == 0)
        {
            return candidates.Select(_ => 0d).ToArray();
        }

        var candidateTokens = candidates
            .Select(candidate => Tokenize(CreateSearchText(candidate)))
            .ToArray();
        var averageDocumentLength = candidateTokens.Average(tokens => Math.Max(1, tokens.Count));
        var documentFrequencies = queryTokens
            .Distinct(StringComparer.Ordinal)
            .ToDictionary(
                token => token,
                token => candidateTokens.Count(tokens => tokens.Contains(token, StringComparer.Ordinal)),
                StringComparer.Ordinal);

        return candidateTokens
            .Select(tokens => Bm25Score(queryTokens, tokens, averageDocumentLength, candidates.Count, documentFrequencies))
            .ToArray();
    }

    public static IReadOnlyList<double> BoundedBm25Scores(string query, IReadOnlyList<RagChunkResponse> candidates)
    {
        var queryTermCount = Tokenize(query).Distinct(StringComparer.Ordinal).Count();
        if (queryTermCount == 0)
        {
            return candidates.Select(_ => 0d).ToArray();
        }

        return Bm25Scores(query, candidates)
            .Select(score => 1 - Math.Exp(-score / queryTermCount))
            .ToArray();
    }

    public static string CreateSearchText(RagChunkResponse candidate) => string.Join(' ', candidate.Heading, candidate.CitationLabel, candidate.ChunkText);

    public sealed record ScoredCandidate(RagChunkResponse Candidate, int OriginalRank, double Score);

    private static double Bm25Score(
        IReadOnlyList<string> queryTokens,
        IReadOnlyList<string> candidateTokens,
        double averageDocumentLength,
        int documentCount,
        IReadOnlyDictionary<string, int> documentFrequencies)
    {
        if (candidateTokens.Count == 0)
        {
            return 0;
        }

        var termFrequencies = candidateTokens
            .GroupBy(token => token, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.Count(), StringComparer.Ordinal);

        return queryTokens
            .Distinct(StringComparer.Ordinal)
            .Sum(token =>
            {
                if (!termFrequencies.TryGetValue(token, out var frequency))
                {
                    return 0;
                }

                var documentFrequency = documentFrequencies[token];
                var idf = Math.Log(1 + ((documentCount - documentFrequency + 0.5) / (documentFrequency + 0.5)));
                var lengthNormalization = 1 - Bm25B + (Bm25B * candidateTokens.Count / averageDocumentLength);

                return idf * ((frequency * (Bm25K1 + 1)) / (frequency + (Bm25K1 * lengthNormalization)));
            });
    }

    [GeneratedRegex("[\\p{L}\\p{N}]+", RegexOptions.CultureInvariant)]
    private static partial Regex WordRegex();
}
