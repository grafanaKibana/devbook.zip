namespace KnowledgeHub.Data;

using System.Buffers.Binary;
using System.IO.Hashing;
using System.Text;
using KnowledgeHub.Data.Chunking;
using KnowledgeHub.Data.Embeddings;
using Microsoft.EntityFrameworkCore;

internal sealed class ChunkingService<TStrategy>(
    KnowledgeHubDbContext dbContext,
    TStrategy chunkingStrategy,
    IEmbeddingService embeddingService) : IChunkingService
    where TStrategy : class, IChunkingStrategy
{
    public async Task ReplaceDocumentChunksAsync(
        IReadOnlyList<Document> documents,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(documents);

        if (documents.Count == 0)
        {
            return;
        }

        foreach (var document in documents)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var chunkDrafts = chunkingStrategy.Chunk(document);
            var existingChunks = await dbContext.Chunks
                .Where(chunk => chunk.DocumentId == document.DocumentId)
                .ToListAsync(cancellationToken);

            if (existingChunks.Count > 0)
            {
                dbContext.Chunks.RemoveRange(existingChunks);
            }

            if (chunkDrafts.Count == 0)
            {
                continue;
            }

            var embeddings = await embeddingService.GenerateEmbeddingsAsync(
                chunkDrafts.Select(chunk => chunk.Text).ToArray(),
                cancellationToken);

            var newChunks = chunkDrafts
                .Select((chunk, index) => new ChunkModel
                {
                    ChunkId = GenerateChunkId(document.DocumentId, document.SourceHash, index, chunk.Text),
                    DocumentId = document.DocumentId,
                    ChunkText = chunk.Text,
                    Heading = chunk.Heading,
                    ChunkOrder = index,
                    Embedding = embeddings[index],
                    CitationLabel = BuildCitationLabel(document.Title, chunk.Heading),
                })
                .ToArray();

            dbContext.Chunks.AddRange(newChunks);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static string GenerateChunkId(string documentId, string sourceHash, int chunkOrder, string chunkText)
    {
        var hashBytes = XxHash3.Hash(Encoding.UTF8.GetBytes($"{documentId}|{sourceHash}|{chunkOrder}|{chunkText}"));
        var hashValue = BinaryPrimitives.ReadUInt64BigEndian(hashBytes);

        return $"chunk_{documentId}_{chunkOrder:D4}_{Convert.ToHexStringLower(hashBytes)}:{hashValue}";
    }

    private static string BuildCitationLabel(string title, string? heading)
    {
        return string.IsNullOrWhiteSpace(heading)
            ? $"[[{title}]]"
            : $"[[{title}#{heading}]]";
    }
}
