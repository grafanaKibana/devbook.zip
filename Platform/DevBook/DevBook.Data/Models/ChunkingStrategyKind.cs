namespace DevBook.Data.Models;

/// <summary>
/// Selects how source markdown is split before embedding and retrieval.
/// </summary>
public enum ChunkingStrategyKind
{
    /// <summary>
    /// Splits text by character length with overlap. Fast and predictable, but it does not preserve Markdown heading metadata.
    /// </summary>
    FixedSize,

    /// <summary>
    /// Splits markdown by heading sections and keeps section headings for citations.
    /// </summary>
    MarkdownSection,

    /// <summary>
    /// Splits text at semantic boundaries by comparing neighboring embedding vectors.
    /// </summary>
    Semantic,
}
