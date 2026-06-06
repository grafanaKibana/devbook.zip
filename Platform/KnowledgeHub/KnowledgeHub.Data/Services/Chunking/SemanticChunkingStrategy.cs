namespace KnowledgeHub.Data.Services.Chunking;

using System.Text;
using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Services;

public sealed class SemanticChunkingStrategy : IChunkingStrategy
{
    private const int MaxChunkLength = 1200;
    private const double SemanticBreakThreshold = 0.60;
    private const int OverlapLength = 200;

    public ChunkingStrategyKind Strategy => ChunkingStrategyKind.Semantic;

    public async Task<IReadOnlyList<ChunkContent>> ChunkAsync(
        Document document,
        IEmbeddingService embeddingService,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(document);
        ArgumentNullException.ThrowIfNull(embeddingService);

        var units = ExtractTextUnits(document.PageContent);
        if (units.Count == 0)
        {
            return [];
        }

        var embeddings = await embeddingService.GenerateEmbeddingsAsync(units, cancellationToken);

        return BuildSemanticChunks(units, embeddings)
            .Select(text => new ChunkContent(text, null))
            .ToArray();
    }

    private static IReadOnlyList<string> BuildSemanticChunks(
        IReadOnlyList<string> units,
        IReadOnlyList<float[]> embeddings)
    {
        var chunks = new List<string>();
        var current = new StringBuilder(units[0]);

        for (var index = 1; index < units.Count; index++)
        {
            var unit = units[index];
            var candidateLength = current.Length + Environment.NewLine.Length + Environment.NewLine.Length + unit.Length;
            var semanticShift = CosineSimilarity(embeddings[index - 1], embeddings[index]) < SemanticBreakThreshold;

            if (candidateLength > MaxChunkLength || semanticShift)
            {
                chunks.AddRange(SplitOversizedChunk(current.ToString()));
                current.Clear();
                current.Append(unit);
                continue;
            }

            current.AppendLine().AppendLine().Append(unit);
        }

        chunks.AddRange(SplitOversizedChunk(current.ToString()));

        return chunks;
    }

    private static IReadOnlyList<string> ExtractTextUnits(string content)
    {
        return ExtractParagraphs(content)
            .SelectMany(SplitOversizedChunk)
            .ToArray();
    }

    private static IReadOnlyList<string> SplitOversizedChunk(string content)
    {
        var normalizedContent = content.Trim();
        if (string.IsNullOrWhiteSpace(normalizedContent))
        {
            return [];
        }

        return normalizedContent.Length <= MaxChunkLength
            ? [normalizedContent]
            : SplitFixedSize(normalizedContent);
    }

    private static IReadOnlyList<string> SplitFixedSize(string content)
    {
        var chunks = new List<string>();
        var start = 0;

        while (start < content.Length)
        {
            var remainingLength = content.Length - start;
            var length = Math.Min(MaxChunkLength, remainingLength);
            var endExclusive = start + length;

            if (endExclusive < content.Length)
            {
                var splitIndex = FindWhitespaceBoundary(content, start, endExclusive);
                if (splitIndex > start)
                {
                    endExclusive = splitIndex;
                }
            }

            var text = content[start..endExclusive].Trim();
            if (!string.IsNullOrWhiteSpace(text))
            {
                chunks.Add(text);
            }

            if (endExclusive >= content.Length)
            {
                break;
            }

            start = Math.Max(endExclusive - OverlapLength, start + 1);
        }

        return chunks;
    }

    private static double CosineSimilarity(IReadOnlyList<float> left, IReadOnlyList<float> right)
    {
        var length = Math.Min(left.Count, right.Count);
        if (length == 0)
        {
            return 0;
        }

        double dotProduct = 0;
        double leftMagnitude = 0;
        double rightMagnitude = 0;

        for (var index = 0; index < length; index++)
        {
            dotProduct += left[index] * right[index];
            leftMagnitude += left[index] * left[index];
            rightMagnitude += right[index] * right[index];
        }

        if (leftMagnitude == 0 || rightMagnitude == 0)
        {
            return 0;
        }

        return dotProduct / (Math.Sqrt(leftMagnitude) * Math.Sqrt(rightMagnitude));
    }

    private static IReadOnlyList<string> ExtractParagraphs(string content)
    {
        var paragraphs = new List<string>();
        var current = new StringBuilder();

        foreach (var line in content
            .Replace("\r\n", "\n", StringComparison.Ordinal)
            .Split('\n'))
        {
            if (string.IsNullOrWhiteSpace(line))
            {
                FlushCurrent(paragraphs, current);
                continue;
            }

            if (current.Length > 0)
            {
                current.Append(' ');
            }

            current.Append(line.Trim());
        }

        FlushCurrent(paragraphs, current);

        return paragraphs;
    }

    private static void FlushCurrent(ICollection<string> values, StringBuilder current)
    {
        var value = current.ToString().Trim();
        if (!string.IsNullOrWhiteSpace(value))
        {
            values.Add(value);
        }

        current.Clear();
    }

    private static int FindWhitespaceBoundary(string content, int start, int endExclusive)
    {
        for (var index = endExclusive; index > start; index--)
        {
            if (char.IsWhiteSpace(content[index - 1]))
            {
                return index;
            }
        }

        return endExclusive;
    }
}
