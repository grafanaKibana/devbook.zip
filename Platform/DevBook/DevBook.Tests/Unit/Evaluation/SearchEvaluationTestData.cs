namespace DevBook.Tests.Unit.Evaluation;

using DevBook.Data.Models;
using DevBook.Evaluations.Scenarios.RAG.Search;

/// <summary>
/// Shared constants and builders for the RAG search evaluation tests.
/// Imported with <c>using static</c> so test bodies can call <see cref="Prediction"/> and <see cref="Document"/> directly.
/// </summary>
internal static class SearchEvaluationTestData
{
    /// <summary>Vault path of the primary expected evidence document.</summary>
    public const string EvaluationPath = "Home/11 AI & ML/LLM/RAG/Evaluation.md";

    /// <summary>Vault path of a second relevant evidence document.</summary>
    public const string ChunkingPath = "Home/11 AI & ML/LLM/RAG/Chunking.md";

    /// <summary>Vault path used as retrieved-but-irrelevant evidence.</summary>
    public const string IrrelevantPath = "Home/05 Architecture/Patterns/Design Patterns/Composite.md";

    /// <summary>Heading of the primary expected evidence section.</summary>
    public const string RetrievalHeading = "Retrieval Metrics";

    /// <summary>Heading shared by the <see cref="ChunkingPath"/> evidence sections.</summary>
    public const string ParentChildHeading = "Parent-Child Chunking";

    /// <summary>Heading of a non-matching section inside the primary evidence document.</summary>
    public const string QuestionsHeading = "Questions";

    /// <summary>Heading of the irrelevant retrieved section.</summary>
    public const string CompositeHeading = "Composite";

    /// <summary>Expected evidence snippet for the primary retrieval section.</summary>
    public const string RetrievalSnippet = "Evidence coverage is primary";

    /// <summary>Retrieved chunk text that contains <see cref="RetrievalSnippet"/>.</summary>
    public const string RetrievalChunkText = "Evidence coverage is primary because the generator cannot use evidence it never sees.";

    /// <summary>Expected evidence snippet for the <see cref="ParentChildHeading"/> section.</summary>
    public const string ChildChunkSnippet = "search child chunks";

    /// <summary>Snippet used for retrieved-but-irrelevant chunks.</summary>
    public const string IrrelevantSnippet = "irrelevant";

    /// <summary>Expected snippet that never appears in any retrieved chunk.</summary>
    public const string UnmatchedSnippet = "MRR rewards pushing the first relevant result higher";

    /// <summary>
    /// Builds a search prediction from its expected and retrieved documents.
    /// </summary>
    /// <param name="query">Query submitted to the RAG search service.</param>
    /// <param name="expectedDocuments">Documents and evidence that should be retrieved.</param>
    /// <param name="retrievedDocuments">Documents actually returned by the search service.</param>
    /// <param name="chunkingStrategy">Chunking strategy used for retrieval.</param>
    public static SearchPrediction Prediction(
        string query,
        IReadOnlyList<SearchDocument> expectedDocuments,
        IReadOnlyList<SearchDocument> retrievedDocuments,
        ChunkingStrategyKind chunkingStrategy = ChunkingStrategyKind.MarkdownSection) =>
        new(query, expectedDocuments, retrievedDocuments, chunkingStrategy);

    /// <summary>
    /// Builds a single expected or retrieved search document.
    /// </summary>
    /// <param name="sourcePath">Vault-relative source path, or a citation label for chunk-addressable evidence.</param>
    /// <param name="heading">Section heading, when available.</param>
    /// <param name="snippet">Evidence snippet used to verify a relevant match.</param>
    /// <param name="score">Retrieved score, when available.</param>
    /// <param name="chunkId">Stored chunk identifier, when the evidence is chunk-addressable.</param>
    /// <param name="documentId">Stored document identifier, when available.</param>
    public static SearchDocument Document(
        string sourcePath,
        string? heading = null,
        string? snippet = null,
        double? score = null,
        string? chunkId = null,
        string? documentId = null) =>
        new(sourcePath, heading, snippet, Score: score, ChunkId: chunkId, DocumentId: documentId);
}
