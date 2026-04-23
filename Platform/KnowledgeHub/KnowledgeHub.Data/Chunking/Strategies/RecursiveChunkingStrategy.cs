namespace KnowledgeHub.Data.Chunking;

using Microsoft.Extensions.Options;

internal sealed class RecursiveChunkingStrategy(
    FixedSizeChunkingStrategy fixedSizeChunkingStrategy,
    IOptions<ChunkingOptions> options) : IChunkingStrategy
{
    private static readonly string[] Separators = ["\n\n", "\n", ". ", " "];
    private readonly ChunkingOptions options = options.Value;

    public IReadOnlyList<Chunk> Chunk(Document document)
    {
        ArgumentNullException.ThrowIfNull(document);

        var sections = MarkdownSectionExtractor.Extract(document.RawMarkdown);
        if (sections.Count == 0)
        {
            return [];
        }

        var drafts = new List<Chunk>();

        foreach (var section in sections)
        {
            var segmentTexts = SplitRecursively(section.Content, 0);
            if (segmentTexts.Count == 0)
            {
                continue;
            }

            foreach (var text in segmentTexts)
            {
                drafts.Add(new Chunk(text, section.Heading));
            }
        }

        return drafts;
    }

    private IReadOnlyList<string> SplitRecursively(string content, int separatorIndex)
    {
        var normalizedContent = content.Trim();
        if (string.IsNullOrWhiteSpace(normalizedContent))
        {
            return [];
        }

        if (normalizedContent.Length <= options.MaxChunkLength)
        {
            return [normalizedContent];
        }

        if (separatorIndex >= Separators.Length)
        {
            return fixedSizeChunkingStrategy
                .SplitSection(new MarkdownSection(null, normalizedContent))
                .Select(chunk => chunk.Text)
                .ToArray();
        }

        var separator = Separators[separatorIndex];
        if (!normalizedContent.Contains(separator, StringComparison.Ordinal))
        {
            return SplitRecursively(normalizedContent, separatorIndex + 1);
        }

        var parts = normalizedContent
            .Split(separator, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        if (parts.Length <= 1)
        {
            return SplitRecursively(normalizedContent, separatorIndex + 1);
        }

        var chunks = new List<string>();
        var current = parts[0];

        for (var index = 1; index < parts.Length; index++)
        {
            var candidate = string.Concat(current, separator, parts[index]);
            if (candidate.Length <= options.MaxChunkLength)
            {
                current = candidate;
                continue;
            }

            chunks.AddRange(SplitRecursively(current, separatorIndex + 1));
            current = parts[index];
        }

        chunks.AddRange(SplitRecursively(current, separatorIndex + 1));

        return chunks;
    }
}
