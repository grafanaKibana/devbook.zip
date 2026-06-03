namespace KnowledgeHub.Data.Services.Chunking;

using KnowledgeHub.Data.Models;

public sealed class FixedSizeChunkingStrategy : IChunkingStrategy
{
    private const int MaxChunkLength = 1200;
    private const int OverlapLength = 200;

    public IReadOnlyList<ChunkContent> Chunk(Document document)
    {
        ArgumentNullException.ThrowIfNull(document);

        return SplitFixedSize(document.PageContent)
            .Select(text => new ChunkContent(text, null))
            .ToArray();
    }

    private IReadOnlyList<string> SplitFixedSize(string content)
    {
        var normalizedContent = content.Trim();
        if (string.IsNullOrWhiteSpace(normalizedContent))
        {
            return [];
        }

        var chunks = new List<string>();
        var start = 0;

        while (start < normalizedContent.Length)
        {
            var remainingLength = normalizedContent.Length - start;
            var length = Math.Min(MaxChunkLength, remainingLength);
            var endExclusive = start + length;

            if (endExclusive < normalizedContent.Length)
            {
                var splitIndex = FindWhitespaceBoundary(normalizedContent, start, endExclusive);
                if (splitIndex > start)
                {
                    endExclusive = splitIndex;
                }
            }

            var text = normalizedContent[start..endExclusive].Trim();
            if (!string.IsNullOrWhiteSpace(text))
            {
                chunks.Add(text);
            }

            if (endExclusive >= normalizedContent.Length)
            {
                break;
            }

            start = Math.Max(endExclusive - OverlapLength, start + 1);
        }

        return chunks;
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
