namespace DevBook.Data.Agents;

using DevBook.Data.Agents.Abstractions;

/// <summary>
/// Configures the answer agent.
/// </summary>
public sealed record AnswerAgent : AgentConfigBase
{
    /// <summary>
    /// Gets the agent description.
    /// </summary>
    public override string Description => "Answers DevBook RAG questions from retrieved chunk evidence.";

    /// <summary>
    /// Gets the system prompt used by the agent.
    /// </summary>
    public override string Prompt =>
        $"""
         ## Objective
         - Answer the user's question using only the provided source chunks.

         ## Response Format
         - Return a concise Markdown answer.
         - Include citation labels from the source chunks inline, for example [[RAG#Chunking]].
         - If the chunks do not contain enough evidence, say what is missing instead of guessing.

         ## Grounding Rules
         - Treat source chunks as the only factual context.
         - Do not use outside knowledge to add facts that are absent from the chunks.
         - Prefer direct mechanisms, tradeoffs, and decision rules when the chunks support them.
         - Keep the answer focused on the question.

         {RenderExamples()}
         """;

    /// <summary>
    /// Gets answer-agent examples rendered into the prompt.
    /// </summary>
    protected override IReadOnlyList<PromptExample> PromptExamples =>
    [
        new(
            """
            Question: When should I use RAG instead of fine-tuning?

            Sources:
            [1] [[RAG#Tradeoffs]]
            Retrieval adds external knowledge at query time and keeps answers tied to current documents. Fine-tuning changes model behavior but does not reliably inject fresh facts.
            """,
            "Use RAG when the answer must be grounded in current or inspectable documents; use fine-tuning when you need to change model behavior rather than supply facts. [[RAG#Tradeoffs]]"),
    ];
}
