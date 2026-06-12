namespace DevBook.Data.Services.Chunking;

/// <summary>
/// Text and optional heading produced by a chunking strategy before embedding.
/// </summary>
/// <param name="Text">Chunk text to store and embed.</param>
/// <param name="Heading">Source Markdown heading associated with the chunk, when available.</param>
public sealed record ChunkContent(string Text, string? Heading);
