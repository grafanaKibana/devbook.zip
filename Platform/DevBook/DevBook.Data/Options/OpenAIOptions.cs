namespace DevBook.Data.Options;

/// <summary>
/// Configures open ai behavior.
/// </summary>
public sealed class OpenAIOptions
{
    /// <summary>
    /// Gets the API key.
    /// </summary>
    public string? ApiKey { get; init; }

    /// <summary>
    /// Gets the service endpoint.
    /// </summary>
    public string? Endpoint { get; init; }
}
