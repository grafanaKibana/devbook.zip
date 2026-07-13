namespace DevBook.Data.Options;

/// <summary>
/// Configures ingestion behavior.
/// </summary>
public sealed class IngestionOptions
{
    /// <summary>
    /// Gets content root path.
    /// </summary>
    public string ContentRootPath { get; init; } = "../../../Vault/Home";

    /// <summary>
    /// Gets max file read concurrency.
    /// </summary>
    public int MaxFileReadConcurrency { get; init; } = 8;
}
