namespace DevBook.Data.Repositories;

using DevBook.Data.Models;

/// <summary>
/// Single source of truth for the chunk vector-search index contract, shared by index
/// creation at API startup and index use (<c>$vectorSearch</c>) in <see cref="ChunkRepository"/>.
/// Keeping the name, path, and similarity here prevents index creation from silently drifting
/// from index use, which would otherwise make searches return no results.
/// </summary>
public static class ChunkVectorIndex
{
    /// <summary>Name of the Atlas Vector Search index created on every chunk collection.</summary>
    public const string IndexName = "chunks_embedding_vector_idx";

    /// <summary>Document field that stores the embedding vector.</summary>
    public const string VectorPath = nameof(StoredChunk.Embedding);

    /// <summary>Similarity function used by the vector index.</summary>
    public const string Similarity = "cosine";
}
