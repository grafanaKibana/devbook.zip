namespace KnowledgeHub.Data.Repositories;

using KnowledgeHub.Data.Models;

public interface IChunkRepository
{
    Task ReplaceDocumentChunksAsync(string documentId, IReadOnlyCollection<ChunkModel> chunks, CancellationToken cancellationToken = default);

    Task ReplaceDocumentsChunksAsync(
        IReadOnlyCollection<string> documentIds,
        IReadOnlyCollection<ChunkModel> chunks,
        CancellationToken cancellationToken = default);

    Task DeleteByDocumentIdsAsync(IReadOnlyCollection<string> documentIds, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<RagChunkResponse>> VectorSearchAsync(float[] queryVector, int topK, CancellationToken cancellationToken = default);
}
