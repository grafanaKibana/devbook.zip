namespace DevBook.Evaluations.Scenarios.AskAgent;

/// <summary>One tool invocation the agent made while solving a task.</summary>
public sealed record AgentToolCall(string Name, string Arguments);
