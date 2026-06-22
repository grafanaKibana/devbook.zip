namespace DevBook.Evaluations.Scenarios.AskAgent;

using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;

/// <summary>Carries the agent case into the evaluation pipeline so the judge can score it.</summary>
public sealed class AskAgentCaseContext(AgentCase agentCase)
    : EvaluationContext(nameof(AskAgentCaseContext), new TextContent(agentCase.Task))
{
    public AgentCase Case { get; } = agentCase;
}
