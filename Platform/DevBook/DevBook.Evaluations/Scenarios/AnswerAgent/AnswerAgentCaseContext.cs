namespace DevBook.Evaluations.Scenarios.AnswerAgent;

using Microsoft.Extensions.AI;
using Microsoft.Extensions.AI.Evaluation;

/// <summary>Carries the agent case into the evaluation pipeline so the judge can score it.</summary>
public sealed class AnswerAgentCaseContext(AgentCase agentCase)
    : EvaluationContext(nameof(AnswerAgentCaseContext), new TextContent(agentCase.Task))
{
    public AgentCase Case { get; } = agentCase;
}
