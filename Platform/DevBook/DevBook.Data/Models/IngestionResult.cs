namespace DevBook.Data.Models;

/// <summary>
/// Counts and identifiers produced by an ingestion run.
/// </summary>
/// <param name="Success">Whether ingestion completed without validation or storage failure.</param>
/// <param name="ProcessedCount">Number of source markdown files considered for ingestion.</param>
/// <param name="CreatedCount">Number of new document records inserted.</param>
/// <param name="UpdatedCount">Number of existing document records replaced.</param>
/// <param name="DeletedCount">Number of stored documents removed because the source file disappeared.</param>
/// <param name="DocumentIds">Document identifiers created or updated by the run.</param>
public sealed record IngestionResult(
    bool Success,
    int ProcessedCount,
    int CreatedCount,
    int UpdatedCount,
    int DeletedCount,
    IReadOnlyList<string> DocumentIds);
