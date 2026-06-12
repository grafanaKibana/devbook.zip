namespace DevBook.Data.Options;

using DevBook.Data.Models;

/// <summary>
/// Configures RAG retrieval and reranking behavior.
/// </summary>
public sealed class RagSearchOptions
{
    /// <summary>
    /// Gets chunking strategy.
    /// </summary>
    public ChunkingStrategyKind ChunkingStrategy { get; init; } = ChunkingStrategyKind.MarkdownSection;

    /// <summary>
    /// Gets reranking strategy.
    /// </summary>
    public RerankingStrategyKind RerankingStrategy { get; init; } = RerankingStrategyKind.Bm25;
}
