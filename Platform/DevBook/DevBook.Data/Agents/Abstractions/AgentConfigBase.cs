namespace DevBook.Data.Agents.Abstractions;

using System.Text;
using System.Text.Json;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;

/// <summary>
/// Provides shared configuration for Microsoft Agent Framework chat agents.
/// </summary>
public abstract record AgentConfigBase : IAgentConfig
{
    /// <summary>
    /// Gets the agent configuration name.
    /// </summary>
        public string Name => GetType().Name;

    /// <summary>
    /// Gets the agent description.
    /// </summary>
    public abstract string Description { get; }

    /// <summary>
    /// Gets the model identifier.
    /// </summary>
    public virtual string ModelId => "gpt-5.4-mini";

    /// <summary>
    /// Gets the system prompt used by the agent.
    /// </summary>
    public abstract string Prompt { get; }

    /// <summary>
    /// Gets the <see cref="Microsoft.Agents.AI.ChatClientAgentOptions"/> used to create the chat agent.
    /// </summary>
    public ChatClientAgentOptions ChatClientAgentOptions
    {
        get => field ??= BuildChatClientAgentOptions();
        init;
    }

    /// <summary>
    /// Gets the optional <see cref="Microsoft.Extensions.AI.ChatResponseFormat"/> requested from the chat model.
    /// </summary>
    protected virtual ChatResponseFormat? ChatResponseFormat => null;

    /// <summary>
    /// Gets optional <see cref="Microsoft.Extensions.AI.AITool"/> instances exposed to the chat model.
    /// </summary>
    protected virtual IList<AITool>? Tools => null;

    private ChatClientAgentOptions BuildChatClientAgentOptions()
    {
        var chatOptions = new ChatOptions
        {
            Instructions = this.Prompt,
            ModelId = this.ModelId,
        };

        if (this.ChatResponseFormat is { } responseFormat)
        {
            chatOptions.ResponseFormat = responseFormat;
        }

        if (this.Tools is { Count: > 0 } tools)
        {
            chatOptions.Tools = tools;
        }

        return new ChatClientAgentOptions
        {
            Name = this.Name,
            Description = this.Description,
            ChatOptions = chatOptions,
        };
    }

    /// <summary>
    /// Prompt example embedded in an agent instruction.
    /// </summary>
    /// <param name="UserMessage">Example user message.</param>
    /// <param name="AssistantResponse">Expected assistant response for the example.</param>
    protected record PromptExample(string UserMessage, object AssistantResponse);

    /// <summary>
    /// Gets examples rendered into the agent prompt.
    /// </summary>
    protected virtual IReadOnlyList<PromptExample> PromptExamples => [];

    /// <summary>
    /// Renders configured prompt examples as markdown.
    /// </summary>
    /// <returns>The rendered examples block, or an empty string when no examples are configured.</returns>
    protected string RenderExamples()
    {
        if (this.PromptExamples.Count == 0)
        {
            return string.Empty;
        }

        var builder = new StringBuilder();

        foreach (var example in this.PromptExamples)
        {
            if (builder.Length > 0)
            {
                builder.AppendLine().AppendLine();
            }

            RenderExample(example, builder);
        }

        return $"""
                ## Examples
                {builder}
                """;
    }

    /// <summary>
    /// Appends one prompt example to the examples block.
    /// </summary>
    /// <param name="example">Prompt example to render.</param>
    /// <param name="builder">String builder receiving the rendered markdown.</param>
    protected virtual void RenderExample(PromptExample example, StringBuilder builder)
    {
        if (example.UserMessage.Contains('\n'))
        {
            builder.AppendLine("- User:");
            foreach (var line in example.UserMessage.Split('\n'))
            {
                builder.Append("    ").AppendLine(line);
            }
        }
        else
        {
            builder.Append("- User: ").AppendLine(example.UserMessage);
        }

        var response = example.AssistantResponse as string ?? JsonSerializer.Serialize(example.AssistantResponse);
        builder.Append("  Assistant: ").Append(response);
    }
}
