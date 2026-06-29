namespace DevBook.Data.Services.Chunking;

using DevBook.Data.Models;
using DevBook.Data.Services;

/// <summary>
/// Defines chunking strategy operations.
/// </summary>
public interface IChunkingStrategy
{
    /// <summary>
    /// Gets the chunking strategy kind handled by this implementation.
    /// </summary>
    ChunkingStrategyKind Strategy { get; }

    /// <summary>
    /// Creates chunk text and heading metadata for a document.
    /// </summary>
    /// <param name="document">The document to chunk.</param>
    /// <param name="embeddingService">Embedding service used by semantic chunking strategies.</param>
    /// <param name="cancellationToken">Token used to cancel chunking or embedding work.</param>
    /// <returns>The chunks created from the document content.</returns>
    Task<IReadOnlyList<DraftChunk>> ChunkAsync(
        Document document,
        IEmbeddingService embeddingService,
        CancellationToken cancellationToken = default);
}
