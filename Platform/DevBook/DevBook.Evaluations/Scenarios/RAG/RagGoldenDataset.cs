namespace DevBook.Evaluations.Scenarios.RAG;

/// <summary>
/// Root of the shared golden dataset, used by <em>both</em> RAG scenarios. One chunker-neutral dataset
/// scores retrieval (<c>RAG.Search</c>) and generation (<c>RAG.Answer</c>); ground truth is matched by
/// source + heading + snippet rather than chunk id. The same record deserializes the reference-free
/// <c>chunks-shared.json</c> and the richer <c>answers-shared.json</c> — the latter merely populates the
/// answer-only fields on <see cref="RagGoldenCase"/>.
/// </summary>
public sealed record RagGoldenDataset
{
    /// <summary>Gets the source collection label the dataset was generated from.</summary>
    public string Collection { get; init; } = string.Empty;

    /// <summary>Gets the golden cases.</summary>
    public IReadOnlyList<RagGoldenCase> Cases { get; init; } = [];
}

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

/// <summary>One gold evidence chunk: the chunker-neutral identity plus the snippet text.</summary>
public sealed record RagGoldenChunk
{
    /// <summary>Gets the source document id.</summary>
    public string DocumentId { get; init; } = string.Empty;

    /// <summary>Gets the markdown heading the snippet sits under, when known.</summary>
    public string? Heading { get; init; }

    /// <summary>Gets the human-readable citation label (e.g. the note path).</summary>
    public string CitationLabel { get; init; } = string.Empty;

    /// <summary>Gets the gold snippet text.</summary>
    public string Text { get; init; } = string.Empty;

    /// <summary>
    /// Maps this gold chunk to the production <see cref="DevBook.Data.Models.RagChunkResponse"/> shape
    /// so the shared <c>RagAskService.BuildAgentInput</c> assembler (used by the answer scenario) can
    /// render it exactly as the live ask path would. Retrieval-only fields (chunk id, score) are
    /// irrelevant to the prompt, left empty.
    /// </summary>
    public DevBook.Data.Models.RagChunkResponse ToChunkResponse()
        => new(
            ChunkId: string.Empty,
            DocumentId: this.DocumentId,
            ChunkText: this.Text,
            Heading: this.Heading,
            CitationLabel: this.CitationLabel,
            Score: 0);
}
