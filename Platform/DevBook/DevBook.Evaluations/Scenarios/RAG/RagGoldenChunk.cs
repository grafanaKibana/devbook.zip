namespace DevBook.Evaluations.Scenarios.RAG;

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
