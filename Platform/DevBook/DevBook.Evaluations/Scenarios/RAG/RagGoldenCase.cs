namespace DevBook.Evaluations.Scenarios.RAG;

/// <summary>
/// One golden case shared by both scenarios: a query plus the gold evidence chunks that answer it.
/// Retrieval treats the chunks as the target to be found; generation feeds them to the answer agent as
/// fixed context (no live retrieval), so a regression reflects the agent rather than the retriever.
/// </summary>
public sealed record RagGoldenCase
{
    /// <summary>Gets the stable case id.</summary>
    public string Id { get; init; } = string.Empty;

    /// <summary>Gets the user query.</summary>
    public string Query { get; init; } = string.Empty;

    /// <summary>Gets the labelled difficulty (easy/medium/hard) used for report tagging.</summary>
    public string Difficulty { get; init; } = string.Empty;

    /// <summary>Gets the gold evidence chunks: the retrieval target, and the agent's fixed context.</summary>
    public IReadOnlyList<RagGoldenChunk> Expected { get; init; } = [];

    /// <summary>
    /// Gets the gold reference answer for this case, present only in the answer dataset
    /// (<c>answers-shared.json</c>). Null for the reference-free <c>chunks-shared.json</c>; its presence
    /// is what unlocks the answer-correctness metric. Ignored by the search scenario.
    /// </summary>
    public string? ReferenceAnswer { get; init; }

    /// <summary>Gets the citation labels a correct answer is expected to cite (answer dataset only).</summary>
    public IReadOnlyList<string> ExpectedCitations { get; init; } = [];
}
