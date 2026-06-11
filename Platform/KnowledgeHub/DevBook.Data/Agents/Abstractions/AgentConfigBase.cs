namespace DevBook.Data.Agents.Abstractions;

using System.Text;
using System.Text.Json;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;

public abstract record AgentConfigBase : IAgentConfig
{
    public string Name => GetType().Name;

    public abstract string Description { get; }

    public virtual string ModelId => "gpt-5.4-mini";

    public abstract string Prompt { get; }

    public ChatClientAgentOptions ChatClientAgentOptions
    {
        get => field ??= BuildChatClientAgentOptions();
        init;
    }

    protected virtual ChatResponseFormat? ChatResponseFormat => null;

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

    protected record PromptExample(string UserMessage, object AssistantResponse);

    protected virtual IReadOnlyList<PromptExample> PromptExamples => [];

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
