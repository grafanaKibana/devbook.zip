namespace KnowledgeHub.Data.Services;

using System.Buffers.Binary;
using System.IO.Hashing;
using System.Text;
using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Options;
using Markdig;
using Markdig.Syntax;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

public sealed class ChunkingService(
    KnowledgeHubDbContext dbContext,
    IOptions<ChunkingOptions> options,
    EmbeddingService embeddingService)
{
    private static readonly string[] Separators = ["\n\n", "\n", ". ", " "];
    private readonly ChunkingOptions options = options.Value;

    public async Task ReplaceDocumentChunksAsync(
        IReadOnlyList<Document> documents,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(documents);

        if (documents.Count == 0)
        {
            return;
        }

        foreach (var document in documents)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var chunkDrafts = Chunk(document);
            var existingChunks = await dbContext.Chunks
                .Where(chunk => chunk.DocumentId == document.DocumentId)
                .ToListAsync(cancellationToken);

            if (existingChunks.Count > 0)
            {
                dbContext.Chunks.RemoveRange(existingChunks);
                await dbContext.SaveChangesAsync(cancellationToken);
            }

            if (chunkDrafts.Count == 0)
            {
                continue;
            }

            var embeddings = await embeddingService.GenerateEmbeddingsAsync(
                chunkDrafts.Select(chunk => chunk.Text).ToArray(),
                cancellationToken);

            var newChunks = chunkDrafts
                .Select((chunk, index) => new ChunkModel
                {
                    ChunkId = GenerateChunkId(document.DocumentId, document.SourceHash, index, chunk.Text),
                    DocumentId = document.DocumentId,
                    ChunkText = chunk.Text,
                    Heading = chunk.Heading,
                    ChunkOrder = index,
                    Embedding = embeddings[index],
                    CitationLabel = BuildCitationLabel(document.Title, chunk.Heading),
                })
                .ToArray();

            dbContext.Chunks.AddRange(newChunks);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private IReadOnlyList<Chunk> Chunk(Document document)
    {
        ArgumentNullException.ThrowIfNull(document);

        var chunks = new List<Chunk>();

        foreach (var section in ExtractSections(document.PageContent))
        {
            chunks.AddRange(SplitRecursively(section.Content, 0).Select(text => new Chunk(text, section.Heading)));
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
            var headingText = heading.Inline?.ToString()?.Trim();
            var contentStart = FindNextLineStart(markdown, heading.Span.Start);
            var contentEnd = index + 1 < headings.Length ? headings[index + 1].Span.Start : markdown.Length;

            AddSection(sections, headingText, markdown[contentStart..contentEnd]);
        }

        return sections;
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
            return SplitFixedSize(normalizedContent);
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

    private IReadOnlyList<string> SplitFixedSize(string content)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            return [];
        }

        var maxChunkLength = Math.Max(1, options.MaxChunkLength);
        var overlapLength = Math.Clamp(options.OverlapLength, 0, Math.Max(0, maxChunkLength - 1));
        var chunks = new List<string>();
        var start = 0;

        while (start < content.Length)
        {
            var remainingLength = content.Length - start;
            var length = Math.Min(maxChunkLength, remainingLength);
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

            start = Math.Max(endExclusive - overlapLength, start + 1);
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

    private static string GenerateChunkId(string documentId, string sourceHash, int chunkOrder, string chunkText)
    {
        var hashBytes = XxHash3.Hash(Encoding.UTF8.GetBytes($"{documentId}|{sourceHash}|{chunkOrder}|{chunkText}"));
        var hashValue = BinaryPrimitives.ReadUInt64BigEndian(hashBytes);

        return $"chunk_{documentId}_{chunkOrder:D4}_{Convert.ToHexStringLower(hashBytes)}:{hashValue}";
    }

    private static string BuildCitationLabel(string title, string? heading)
    {
        return string.IsNullOrWhiteSpace(heading)
            ? $"[[{title}]]"
            : $"[[{title}#{heading}]]";
    }

    private sealed record Section(string? Heading, string Content);
}
