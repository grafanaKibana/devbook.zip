namespace DevBook.Data.Models;

using MongoDB.Bson.Serialization.Attributes;

public record Document
{
    /// <summary>
    /// Unique document identifier.
    /// Example: <c>doc_rag_md</c>
    /// </summary>
    [BsonId]
    public required string DocumentId { get; init; }

    /// <summary>
    /// Original source path of the document.
    /// Example: <c>Vault/Software Engineering/11 AI &amp; ML/LLM/RAG/RAG.md</c>
    /// </summary>
    public required string SourcePath { get; init; }

    /// <summary>
    /// Display title of the document.
    /// Example: <c>RAG</c>
    /// </summary>
    public required string Title { get; init; }

    /// <summary>
    /// Full markdown copy stored in the database.
    /// Example: <c># RAG\n\nRAG combines retrieval with generation...</c>
    /// </summary>
    public required string RawMarkdown { get; init; }

    /// <summary>
    /// YAML frontmatter without the surrounding delimiter lines.
    /// Example: <c>topic: [AI]\nstatus: Creation</c>
    /// </summary>
    public required string Frontmatter { get; init; }

    /// <summary>
    /// Markdown content without YAML frontmatter.
    /// Example: <c># RAG\n\nRAG combines retrieval with generation...</c>
    /// </summary>
    public required string PageContent { get; init; }

    /// <summary>
    /// Content hash used to detect changes and re-ingestion.
    /// Example: <c>sha256:4d7f8a1b2c3d</c>
    /// </summary>
    public required string SourceHash { get; init; }

    /// <summary>
    /// Last time this document copy was updated in storage.
    /// Example: <c>2026-04-23T12:00:00+00:00</c>
    /// </summary>
    public DateTimeOffset UpdatedAt { get; init; }

    /// <summary>
    /// Child chunks derived from this document.
    /// Example: <c>[chunk_rag_md_0001, chunk_rag_md_0002, chunk_rag_md_0003]</c>
    /// </summary>
    [BsonIgnore]
    public List<ChunkModel> Chunks { get; init; } = [];
}
