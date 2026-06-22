namespace DevBook.Evaluations.Scenarios.AskAgent;

/// <summary>
/// A single agent task plus the (currently mocked) agent transcript that the judge scores.
/// </summary>
public sealed record AgentCase(
    string Id,
    string Name,
    string Task,
    string Difficulty,
    double QualityBias,
    int RiskLevel,
    int ApproxTokens,
    IReadOnlyList<AgentToolCall> ToolCalls,
    string ExpectedTools,
    string Answer,
    string ContextNote);
