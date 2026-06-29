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
