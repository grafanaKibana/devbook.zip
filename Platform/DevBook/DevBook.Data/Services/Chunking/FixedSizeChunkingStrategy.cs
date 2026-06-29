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
    public Task<IReadOnlyList<DraftChunk>> ChunkAsync(
        Document document,
        IEmbeddingService embeddingService,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(document);
        ArgumentNullException.ThrowIfNull(embeddingService);

        var chunks = ChunkText.SplitFixedSize(document.PageContent, MaxChunkLength, OverlapLength)
            .Select(text => new DraftChunk(text, null))
            .ToArray();

        return Task.FromResult<IReadOnlyList<DraftChunk>>(chunks);
    }
}
