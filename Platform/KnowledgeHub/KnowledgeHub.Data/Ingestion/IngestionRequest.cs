namespace KnowledgeHub.Data.Ingestion;

public sealed record IngestionRequest(string SourcePath, string? FileName);
