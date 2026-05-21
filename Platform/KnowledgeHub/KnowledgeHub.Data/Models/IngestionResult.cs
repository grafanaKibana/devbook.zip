namespace KnowledgeHub.Data.Models;

public sealed record IngestionResult(
    bool Success,
    int ProcessedCount,
    int CreatedCount,
    int UpdatedCount,
    int DeletedCount,
    IReadOnlyList<string> DocumentIds);
