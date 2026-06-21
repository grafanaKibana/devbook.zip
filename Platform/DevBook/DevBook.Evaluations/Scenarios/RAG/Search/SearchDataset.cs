namespace DevBook.Evaluations.Scenarios.RAG.Search;

/// <summary>
/// Root of the shared golden dataset (<c>chunks-shared.json</c>) as consumed by the search scenario.
/// One chunker-neutral dataset scores every chunking strategy; ground truth is matched by source +
/// heading + snippet rather than chunk id.
/// </summary>
public sealed record SearchDataset
{
    /// <summary>Gets the source collection label the dataset was generated from.</summary>
    public string Collection { get; init; } = string.Empty;

    /// <summary>Gets the search cases.</summary>
    public IReadOnlyList<SearchEvaluationCase> Cases { get; init; } = [];
}

/// <summary>One search case: a query plus the gold evidence chunks expected to be retrieved.</summary>
public sealed record SearchEvaluationCase
{
    /// <summary>Gets the stable case id.</summary>
    public string Id { get; init; } = string.Empty;

    /// <summary>Gets the user query.</summary>
    public string Query { get; init; } = string.Empty;

    /// <summary>Gets the expected (gold) evidence chunks.</summary>
    public IReadOnlyList<ExpectedChunk> Expected { get; init; } = [];
}

/// <summary>One gold evidence chunk, matched chunker-neutrally by source + heading + snippet.</summary>
public sealed record ExpectedChunk
{
    /// <summary>Gets the source document id.</summary>
    public string DocumentId { get; init; } = string.Empty;

    /// <summary>Gets the markdown heading the snippet sits under, when known.</summary>
    public string? Heading { get; init; }

    /// <summary>Gets the human-readable citation label (e.g. the note path).</summary>
    public string CitationLabel { get; init; } = string.Empty;

    /// <summary>Gets the gold snippet text.</summary>
    public string Text { get; init; } = string.Empty;
}
