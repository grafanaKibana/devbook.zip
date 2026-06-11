namespace DevBook.Data.Services;

public interface IEmbeddingService
{
    Task<IReadOnlyList<float[]>> GenerateEmbeddingsAsync(
        IReadOnlyList<string> values,
        CancellationToken cancellationToken = default);

    Task<float[]> GenerateEmbeddingAsync(
        string value,
        CancellationToken cancellationToken = default);
}