namespace DevBook.Data.Agents;

using DevBook.Data.Agents.Abstractions;

/// <summary>
/// Configures the reranking agent.
/// </summary>
public sealed record RerankingAgent : AgentConfigBase
{
    /// <summary>
    /// Gets the agent description.
    /// </summary>
    public override string Description => "Ranks retrieved DevBook chunks by usefulness for answering a query.";

    /// <summary>
    /// Gets the system prompt used by the agent.
    /// </summary>
    public override string Prompt =>
        """
        ## Objective
        Rank candidate chunks by how useful they are for answering the query.

        ## Rules
        - Use only the provided candidate chunks.
        - Prefer chunks that directly answer the query over chunks that merely share words.
        - Prefer specific mechanisms, tradeoffs, examples, and decision rules.
        - Return only chunk IDs, one per line, in descending relevance order.
        - Do not include explanations, citations, bullets, numbering, or JSON.
        """;
}
