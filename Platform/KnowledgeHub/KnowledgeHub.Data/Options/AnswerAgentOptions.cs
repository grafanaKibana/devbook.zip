namespace KnowledgeHub.Data.Options;

public sealed class AnswerAgentOptions
{
    public string ModelId { get; init; } = "gpt-4.1";

    public string? ApiKey { get; init; }

    public string? Endpoint { get; init; }
}
