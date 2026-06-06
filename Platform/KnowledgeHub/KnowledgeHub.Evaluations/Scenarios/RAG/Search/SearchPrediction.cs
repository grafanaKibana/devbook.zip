namespace KnowledgeHub.Evaluations.Scenarios.RAG.Search;

using KnowledgeHub.Data.Models;

public sealed record SearchPrediction(
    string Query,
    IReadOnlyList<SearchDocument> ExpectedDocuments,
    IReadOnlyList<SearchDocument> RetrievedDocuments,
    ChunkingStrategyKind ChunkingStrategy = ChunkingStrategyKind.MarkdownSection,
    RerankingStrategyKind RerankingStrategy = RerankingStrategyKind.CrossEncoderLexical);
