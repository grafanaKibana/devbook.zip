namespace DevBook.Data.Agents;

using DevBook.Data.Agents.Abstractions;

public sealed record RerankingAgent : AgentConfigBase
{
    public override string Description => "Ranks retrieved Knowledge Hub chunks by usefulness for answering a query.";

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
