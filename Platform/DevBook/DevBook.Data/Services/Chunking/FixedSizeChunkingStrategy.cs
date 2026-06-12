namespace DevBook.Data.Services.Chunking;

using DevBook.Data.Models;
using DevBook.Data.Services;

/// <summary>
/// Splits documents into fixed-length text windows with overlap.
/// </summary>
public sealed class FixedSizeChunkingStrategy : IChunkingStrategy
{
    /// <summary>
    /// Maximum character length for each fixed-size chunk before the splitter starts a new chunk.
    /// </summary>
    private const int MaxChunkLength = 1200;

    /// <summary>
    /// Number of trailing characters repeated in the next chunk to preserve boundary context.
    /// </summary>
    private const int OverlapLength = 200;

    /// <summary>
    /// Gets the fixed-size chunking strategy kind.
    /// </summary>
    public ChunkingStrategyKind Strategy => ChunkingStrategyKind.FixedSize;

    /// <summary>
    /// Splits document content into fixed-length chunks without heading metadata.
    /// </summary>
    /// <param name="document">Document whose page content is split.</param>
    /// <param name="embeddingService">Embedding service used when the strategy needs semantic similarity.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    /// <returns>Text chunks with null headings.</returns>
    public Task<IReadOnlyList<ChunkContent>> ChunkAsync(
        Document document,
        IEmbeddingService embeddingService,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(document);
        ArgumentNullException.ThrowIfNull(embeddingService);

        var chunks = SplitFixedSize(document.PageContent)
            .Select(text => new ChunkContent(text, null))
            .ToArray();

        return Task.FromResult<IReadOnlyList<ChunkContent>>(chunks);
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
