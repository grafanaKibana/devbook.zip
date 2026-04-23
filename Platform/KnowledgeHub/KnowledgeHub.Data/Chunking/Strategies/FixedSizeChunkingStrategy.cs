namespace KnowledgeHub.Data.Chunking;

using Microsoft.Extensions.Options;

internal sealed class FixedSizeChunkingStrategy(IOptions<ChunkingOptions> options) : IChunkingStrategy
{
    private readonly ChunkingOptions options = options.Value;

    public IReadOnlyList<Chunk> Chunk(Document document)
    {
        ArgumentNullException.ThrowIfNull(document);

        var sections = MarkdownSectionExtractor.Extract(document.RawMarkdown);
        if (sections.Count == 0)
        {
            return [];
        }

        var chunks = new List<Chunk>();

        foreach (var section in sections)
        {
            chunks.AddRange(SplitSection(section));
        }

        return chunks;
    }

    public IReadOnlyList<Chunk> SplitSection(MarkdownSection section)
    {
        ArgumentNullException.ThrowIfNull(section);

        if (string.IsNullOrWhiteSpace(section.Content))
        {
            return [];
        }

        var maxChunkLength = Math.Max(1, options.MaxChunkLength);
        var overlapLength = Math.Clamp(options.OverlapLength, 0, Math.Max(0, maxChunkLength - 1));
        var chunks = new List<Chunk>();
        var start = 0;

        while (start < section.Content.Length)
        {
            var remainingLength = section.Content.Length - start;
            var length = Math.Min(maxChunkLength, remainingLength);
            var endExclusive = start + length;

            if (endExclusive < section.Content.Length)
            {
                var splitIndex = FindWhitespaceBoundary(section.Content, start, endExclusive);
                if (splitIndex > start)
                {
                    endExclusive = splitIndex;
                }
            }

            var text = section.Content[start..endExclusive].Trim();
            if (!string.IsNullOrWhiteSpace(text))
            {
                chunks.Add(new Chunk(text, section.Heading));
            }

            if (endExclusive >= section.Content.Length)
            {
                break;
            }

            start = Math.Max(endExclusive - overlapLength, start + 1);
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
