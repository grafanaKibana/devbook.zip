namespace KnowledgeHub.Data.Models;

public enum RerankingStrategyKind
{
    NoReranking,
    Bm25,
    MaximalMarginalRelevance,
    Llm,
    ReciprocalRankFusion,
}
