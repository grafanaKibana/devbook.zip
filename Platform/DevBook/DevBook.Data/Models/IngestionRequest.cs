namespace DevBook.Data.Models;

/// <summary>
/// Request to ingest markdown notes from the configured content root.
/// </summary>
/// <param name="SourcePath">Folder path relative to the ingestion root. Null or blank ingests the full root.</param>
/// <param name="FileName">Optional single markdown file name inside <paramref name="SourcePath"/>.</param>
/// <param name="ForceReingest">Whether unchanged files should be chunked and embedded again.</param>
/// <param name="ChunkingStrategy">Optional strategy to update. Null updates all registered chunking strategies.</param>
public sealed record IngestionRequest(
    string? SourcePath,
    string? FileName,
    bool ForceReingest = false,
    ChunkingStrategyKind? ChunkingStrategy = null);
