namespace KnowledgeHub.Data.Options;

public sealed class IngestionOptions
{
    public string ContentRootPath { get; init; } = "../../../Vault/Software Engineering";

    public int MaxFileReadConcurrency { get; init; } = 8;
}
