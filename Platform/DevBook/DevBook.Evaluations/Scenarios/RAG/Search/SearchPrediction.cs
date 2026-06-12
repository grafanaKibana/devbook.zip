namespace DevBook.Evaluations.Scenarios.RAG.Search;

using DevBook.Data.Models;

/// <summary>
/// Expected and retrieved documents for one RAG search evaluation query.
/// </summary>
/// <param name="Query">Query submitted to the RAG search service.</param>
/// <param name="ExpectedDocuments">Documents and evidence that should be retrieved.</param>
/// <param name="RetrievedDocuments">Documents actually returned by the search service.</param>
/// <param name="ChunkingStrategy">Chunking strategy used for retrieval.</param>
/// <param name="RerankingStrategy">Reranking strategy used after vector search.</param>
public sealed record SearchPrediction(
    string Query,
    IReadOnlyList<SearchDocument> ExpectedDocuments,
    IReadOnlyList<SearchDocument> RetrievedDocuments,
    ChunkingStrategyKind ChunkingStrategy = ChunkingStrategyKind.MarkdownSection,
    RerankingStrategyKind RerankingStrategy = RerankingStrategyKind.Bm25);
