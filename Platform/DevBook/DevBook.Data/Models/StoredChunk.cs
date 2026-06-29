namespace DevBook.Data.Models;

using MongoDB.Bson.Serialization.Attributes;

/// <summary>
/// Stored retrievable chunk derived from an ingested document.
/// </summary>
public sealed record StoredChunk
{
    /// <summary>
    /// Unique chunk identifier.
    /// Example: <c>chunk_rag_md_0003</c>
    /// </summary>
    [BsonId]
    public required string ChunkId { get; init; }

    /// <summary>
    /// Identifier of the parent document this chunk belongs to.
    /// Example: <c>doc_rag_md</c>
    /// </summary>
    public required string DocumentId { get; init; }

    /// <summary>
    /// Optional section heading the chunk was extracted from.
    /// Example: <c>Tradeoffs</c>
    /// </summary>
    public string? Heading { get; init; }

    /// <summary>
    /// Retrievable chunk text sent to embedding and search.
    /// Example: <c>RAG improves factual grounding by retrieving relevant notes before generation.</c>
    /// </summary>
    public required string ChunkText { get; init; }

    /// <summary>
    /// Chunk position within the parent document.
    /// Example: <c>3</c>
    /// </summary>
    public int ChunkOrder { get; init; }

    /// <summary>
    /// Numeric embedding vector used for similarity search.
    /// Example: <c>[0.0123, -0.8844, 0.1931]</c>
    /// </summary>
    public required float[] Embedding { get; init; }

    /// <summary>
    /// Human-readable citation label returned with answers.
    /// Example: <c>[[RAG#Tradeoffs]]</c>
    /// </summary>
    public required string CitationLabel { get; init; }

    /// <summary>
    /// Navigation property to the parent document.
    /// Example: a <see cref="Document"/> instance for <c>doc_rag_md</c>
    /// </summary>
    [BsonIgnore]
    public Document? Document { get; init; }
}
