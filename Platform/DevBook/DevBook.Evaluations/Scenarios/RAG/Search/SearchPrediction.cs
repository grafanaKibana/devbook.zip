namespace DevBook.Evaluations.Scenarios.RAG.Search;

using DevBook.Data.Models;

public sealed record SearchPrediction(
    string Query,
    IReadOnlyList<SearchDocument> ExpectedDocuments,
    IReadOnlyList<SearchDocument> RetrievedDocuments,
    ChunkingStrategyKind ChunkingStrategy = ChunkingStrategyKind.MarkdownSection,
    RerankingStrategyKind RerankingStrategy = RerankingStrategyKind.Bm25);
