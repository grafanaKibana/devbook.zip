namespace KnowledgeHub.Data.Models;

public sealed record IngestionRequest(string? SourcePath, string? FileName, bool ForceReingest = false);
