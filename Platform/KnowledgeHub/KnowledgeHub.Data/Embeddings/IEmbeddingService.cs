namespace KnowledgeHub.Data.Embeddings;

public interface IEmbeddingService
{
    Task<IReadOnlyList<float[]>> GenerateEmbeddingsAsync(IReadOnlyList<string> values, CancellationToken cancellationToken = default);
}
