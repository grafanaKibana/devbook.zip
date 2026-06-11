namespace DevBook.Data.Services.Reranking;

using DevBook.Data.Models;

public sealed class NoRerankingStrategy : IRerankingStrategy
{
    public RerankingStrategyKind Strategy => RerankingStrategyKind.NoReranking;

    public Task<IReadOnlyList<RagChunkResponse>> RerankAsync(
        string query,
        IReadOnlyList<RagChunkResponse> candidates,
        int topK,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(candidates);

        return Task.FromResult<IReadOnlyList<RagChunkResponse>>(candidates.Take(topK).ToArray());
    }
}
