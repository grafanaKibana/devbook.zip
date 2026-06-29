namespace DevBook.Evaluations.Scenarios.RAG.Search.Model;

/// <summary>
/// Diagnostic record for one expected evidence item.
/// </summary>
/// <param name="Index">One-based expected evidence index.</param>
/// <param name="SourcePath">Expected source path.</param>
/// <param name="Heading">Expected heading evidence, when required.</param>
/// <param name="SnippetPreview">Preview of expected snippet evidence, when required.</param>
/// <param name="Matched">Whether retrieved chunks matched this expected evidence item.</param>
public sealed record SearchExpectedDiagnostic(
    int Index,
    string SourcePath,
    string? Heading,
    string? SnippetPreview,
    bool Matched);

