namespace DevBook.Data.Models;

/// <summary>
/// Selects how vector-search candidates are reordered before returning results.
/// </summary>
public enum RerankingStrategyKind
{
    /// <summary>
    /// Keeps the original MongoDB Atlas Vector Search order and scores.
    /// </summary>
    NoReranking,

    /// <summary>
    /// Reorders candidates by BM25 lexical overlap between the query and chunk text.
    /// </summary>
    Bm25,

    /// <summary>
    /// Reorders candidates to balance query relevance with result diversity.
    /// </summary>
    MaximalMarginalRelevance,

    /// <summary>
    /// Uses a <see cref="Microsoft.Agents.AI.AIAgent"/> to score candidate usefulness for the query.
    /// </summary>
    Llm,

    /// <summary>
    /// Combines vector rank and BM25 lexical rank with reciprocal rank fusion.
    /// </summary>
    ReciprocalRankFusion,
}
