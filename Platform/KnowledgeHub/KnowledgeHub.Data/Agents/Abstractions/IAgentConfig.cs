namespace KnowledgeHub.Data.Agents.Abstractions;

using Microsoft.Agents.AI;

public interface IAgentConfig
{
    string Name { get; }

    string Description { get; }

    string ModelId { get; }

    string Prompt { get; }

    ChatClientAgentOptions ChatClientAgentOptions { get; init; }
}
