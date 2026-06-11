namespace DevBook.Data.Services.Reranking;

using DevBook.Data.Models;

public interface IRerankingStrategy
{
    RerankingStrategyKind Strategy { get; }

    Task<IReadOnlyList<RagChunkResponse>> RerankAsync(
        string query,
        IReadOnlyList<RagChunkResponse> candidates,
        int topK,
        CancellationToken cancellationToken = default);
}
