namespace KnowledgeHub.Data.Models;

public sealed record RagSearchRequest(
    string Query,
    int TopK = 5,
    ChunkingStrategyKind ChunkingStrategy = ChunkingStrategyKind.MarkdownSection);
