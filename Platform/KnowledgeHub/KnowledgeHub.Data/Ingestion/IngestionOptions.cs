namespace KnowledgeHub.Data.Ingestion;

public sealed class IngestionOptions
{
    public const string SectionName = "Ingestion";

    public string ContentRootPath { get; init; } = "../../../Vault/Software Engineering";

    public int MaxFilesPerRequest { get; init; } = 200;

    public long MaxFileSizeBytes { get; init; } = 1_048_576;
}
