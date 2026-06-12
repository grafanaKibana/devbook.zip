namespace DevBook.Data.Agents.Abstractions;

using Microsoft.Agents.AI;

/// <summary>
/// Defines configuration needed to create a Microsoft Agent Framework chat agent.
/// </summary>
public interface IAgentConfig
{
    /// <summary>
    /// Gets the agent configuration name.
    /// </summary>
    string Name { get; }

    /// <summary>
    /// Gets the agent description shown to orchestration code.
    /// </summary>
    string Description { get; }

    /// <summary>
    /// Gets the chat model identifier used by the agent.
    /// </summary>
    string ModelId { get; }

    /// <summary>
    /// Gets the system prompt used by the agent.
    /// </summary>
    string Prompt { get; }

    /// <summary>
    /// Gets or initializes the <see cref="Microsoft.Agents.AI.ChatClientAgentOptions"/> used to create the chat agent.
    /// </summary>
    ChatClientAgentOptions ChatClientAgentOptions { get; init; }
}
