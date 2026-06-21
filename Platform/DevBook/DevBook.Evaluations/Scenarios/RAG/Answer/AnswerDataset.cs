namespace DevBook.Evaluations.Scenarios.RAG.Answer;

/// <summary>
/// Root of the shared golden dataset (<c>chunks-shared.json</c>) as consumed by the answer scenario.
/// The same chunker-neutral dataset that scores retrieval in <c>RAG.Search</c> is reused here for
/// generation; only the question and its gold evidence chunks are needed.
/// </summary>
public sealed record AnswerDataset
{
    /// <summary>Gets the source collection label the dataset was generated from.</summary>
    public string Collection { get; init; } = string.Empty;

    /// <summary>Gets the answer cases.</summary>
    public IReadOnlyList<AnswerCase> Cases { get; init; } = [];
}

/// <summary>
/// One answer-generation case: a question plus the gold evidence chunks that answer it. In
/// isolated-generation mode these gold chunks are fed to the answer agent as fixed context, so a
/// regression reflects the agent (prompt or model), not retrieval.
/// </summary>
public sealed record AnswerCase
{
    /// <summary>Gets the stable case id.</summary>
    public string Id { get; init; } = string.Empty;

    /// <summary>Gets the user question.</summary>
    public string Query { get; init; } = string.Empty;

    /// <summary>Gets the labelled difficulty (easy/medium/hard) used for report tagging.</summary>
    public string Difficulty { get; init; } = string.Empty;

    /// <summary>Gets the gold evidence chunks supplied to the agent as fixed context.</summary>
    public IReadOnlyList<AnswerSource> Expected { get; init; } = [];
}

/// <summary>One gold evidence chunk: the chunker-neutral identity plus the snippet text.</summary>
public sealed record AnswerSource
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
    /// so the shared <c>RagAskService.BuildAgentInput</c> assembler can render it exactly as the live
    /// ask path would. Retrieval-only fields (chunk id, score) are irrelevant to the prompt, left empty.
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
