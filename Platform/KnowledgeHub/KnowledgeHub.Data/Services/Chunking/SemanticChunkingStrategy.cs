namespace KnowledgeHub.Data.Services.Chunking;

using System.Text;
using KnowledgeHub.Data.Models;
using Markdig;
using Markdig.Syntax;

public sealed class SemanticChunkingStrategy : IChunkingStrategy
{
    /// <summary>
    /// Maximum character length for a semantic chunk before oversized units are split further.
    /// </summary>
    private const int MaxChunkLength = 1200;

    /// <summary>
    /// Number of trailing characters repeated only by the fixed-size fallback for unsplittable semantic units.
    /// </summary>
    private const int OverlapLength = 200;

    public ChunkingStrategyKind Strategy => ChunkingStrategyKind.Semantic;

    public IReadOnlyList<ChunkContent> Chunk(Document document)
    {
        ArgumentNullException.ThrowIfNull(document);

        var chunks = new List<ChunkContent>();

        foreach (var section in ExtractSections(document.PageContent))
        {
            chunks.AddRange(SplitSection(section.Content).Select(text => new ChunkContent(text, section.Heading)));
        }

        return chunks;
    }

    private static IReadOnlyList<Section> ExtractSections(string markdown)
    {
        if (string.IsNullOrWhiteSpace(markdown))
        {
            return [];
        }

        var headings = Markdown
            .Parse(markdown)
            .OfType<HeadingBlock>()
            .OrderBy(heading => heading.Span.Start)
            .ToArray();

        if (headings.Length == 0)
        {
            return CreateSection(null, markdown) is { } wholeDocument ? [wholeDocument] : [];
        }

        var sections = new List<Section>();
        AddSection(sections, null, markdown[..headings[0].Span.Start]);

        for (var index = 0; index < headings.Length; index++)
        {
            var heading = headings[index];
            var headingText = ExtractHeadingText(markdown, heading);
            var contentStart = FindNextLineStart(markdown, heading.Span.Start);
            var contentEnd = index + 1 < headings.Length ? headings[index + 1].Span.Start : markdown.Length;

            AddSection(sections, headingText, markdown[contentStart..contentEnd]);
        }

        return sections;
    }

    private static IReadOnlyList<string> SplitSection(string content)
    {
        var units = ExtractSemanticUnits(content);
        if (units.Count == 0)
        {
            return [];
        }

        var chunks = new List<string>();
        var current = new StringBuilder();

        foreach (var unit in units)
        {
            if (unit.Length > MaxChunkLength)
            {
                FlushCurrent(chunks, current);
                chunks.AddRange(SplitOversizedUnit(unit));
                continue;
            }

            var candidateLength = current.Length == 0
                ? unit.Length
                : current.Length + Environment.NewLine.Length + Environment.NewLine.Length + unit.Length;

            if (candidateLength > MaxChunkLength)
            {
                FlushCurrent(chunks, current);
            }

            if (current.Length > 0)
            {
                current.AppendLine().AppendLine();
            }

            current.Append(unit);
        }

        FlushCurrent(chunks, current);

        return chunks;
    }

    private static IReadOnlyList<string> ExtractSemanticUnits(string content)
    {
        var normalizedContent = Normalize(content);
        if (string.IsNullOrWhiteSpace(normalizedContent))
        {
            return [];
        }

        var units = new List<string>();
        var current = new StringBuilder();
        var inFence = false;
        var fenceMarker = string.Empty;

        foreach (var line in normalizedContent.Split('\n'))
        {
            var trimmed = line.TrimStart();
            var startsFence = StartsFence(trimmed, out var marker);

            if (!inFence && startsFence)
            {
                FlushCurrent(units, current);
                inFence = true;
                fenceMarker = marker;
                current.AppendLine(line);
                continue;
            }

            if (inFence)
            {
                current.AppendLine(line);

                if (trimmed.StartsWith(fenceMarker, StringComparison.Ordinal))
                {
                    inFence = false;
                    fenceMarker = string.Empty;
                    FlushCurrent(units, current);
                }

                continue;
            }

            if (string.IsNullOrWhiteSpace(line))
            {
                FlushCurrent(units, current);
                continue;
            }

            current.AppendLine(line);
        }

        FlushCurrent(units, current);

        return units;
    }

    private static IReadOnlyList<string> SplitOversizedUnit(string unit)
    {
        var sentences = ExtractSentences(unit);

        if (sentences.Count <= 1)
        {
            return SplitFixedSize(unit);
        }

        var chunks = new List<string>();
        var current = sentences[0];

        for (var index = 1; index < sentences.Count; index++)
        {
            var candidate = string.Concat(current, " ", sentences[index]);
            if (candidate.Length <= MaxChunkLength)
            {
                current = candidate;
                continue;
            }

            chunks.AddRange(current.Length > MaxChunkLength ? SplitFixedSize(current) : [current]);
            current = sentences[index];
        }

        chunks.AddRange(current.Length > MaxChunkLength ? SplitFixedSize(current) : [current]);

        return chunks;
    }

    private static IReadOnlyList<string> ExtractSentences(string content)
    {
        var sentences = new List<string>();
        var start = 0;

        for (var index = 0; index < content.Length; index++)
        {
            if (!IsSentenceEnd(content[index]) || index + 1 >= content.Length || !char.IsWhiteSpace(content[index + 1]))
            {
                continue;
            }

            var sentence = content[start..(index + 1)].Trim();
            if (!string.IsNullOrWhiteSpace(sentence))
            {
                sentences.Add(sentence);
            }

            start = index + 1;
        }

        var lastSentence = content[start..].Trim();
        if (!string.IsNullOrWhiteSpace(lastSentence))
        {
            sentences.Add(lastSentence);
        }

        return sentences;
    }

    private static bool IsSentenceEnd(char value) => value is '.' or '!' or '?';

    private static IReadOnlyList<string> SplitFixedSize(string content)
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

    private static void AddSection(List<Section> sections, string? heading, string content)
    {
        if (CreateSection(heading, content) is { } section)
        {
            sections.Add(section);
        }
    }

    private static Section? CreateSection(string? heading, string content)
    {
        var normalizedContent = Normalize(content);

        return string.IsNullOrWhiteSpace(normalizedContent)
            ? null
            : new Section(heading, normalizedContent);
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

    private static bool StartsFence(string trimmedLine, out string marker)
    {
        marker = string.Empty;

        if (trimmedLine.StartsWith("```", StringComparison.Ordinal))
        {
            marker = "```";
            return true;
        }

        if (trimmedLine.StartsWith("~~~", StringComparison.Ordinal))
        {
            marker = "~~~";
            return true;
        }

        return false;
    }

    private static string Normalize(string content)
    {
        var lines = content
            .Replace("\r\n", "\n", StringComparison.Ordinal)
            .Split('\n')
            .Select(line => line.TrimEnd());

        return string.Join("\n", lines).Trim();
    }

    private static int FindNextLineStart(string markdown, int start)
    {
        var nextNewline = markdown.IndexOf('\n', start);

        return nextNewline < 0 ? markdown.Length : nextNewline + 1;
    }

    private static string ExtractHeadingText(string markdown, HeadingBlock heading)
    {
        var headingMarkdown = markdown[heading.Span.Start..(heading.Span.End + 1)];

        return headingMarkdown.Trim().TrimStart('#').Trim();
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

    private sealed record Section(string? Heading, string Content);
}
