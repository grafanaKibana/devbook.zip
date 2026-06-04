namespace KnowledgeHub.Data.Services.Chunking;

using System.Buffers.Binary;
using System.IO.Hashing;
using System.Text;
using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Repositories;

public sealed class ChunkingService(
    IChunkRepository chunkRepository,
    IEmbeddingService embeddingService,
    IChunkingStrategy chunkingStrategy) : IChunkingService
{
    public ChunkingStrategyKind Strategy => chunkingStrategy.Strategy;

    public async Task ReplaceDocumentChunksAsync(
        IReadOnlyList<Document> documents,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(documents);

        if (documents.Count == 0)
        {
            return;
        }

        var emptyDocumentIds = new List<string>();
        var chunkDrafts = new List<ChunkDraft>();

        foreach (var document in documents)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var documentChunks = chunkingStrategy.Chunk(document);

            if (documentChunks.Count == 0)
            {
                emptyDocumentIds.Add(document.DocumentId);
                continue;
            }

            chunkDrafts.AddRange(documentChunks.Select((chunk, index) => new ChunkDraft(document, chunk, index)));
        }

        foreach (var documentId in emptyDocumentIds)
        {
            await chunkRepository.ReplaceDocumentChunksAsync(documentId, [], cancellationToken);
        }

        if (chunkDrafts.Count == 0)
        {
            return;
        }

        var embeddings = await embeddingService.GenerateEmbeddingsAsync(
            chunkDrafts.Select(draft => draft.Chunk.Text).ToArray(),
            cancellationToken);

        var newChunks = chunkDrafts
            .Select((draft, index) => new ChunkModel
            {
                ChunkId = GenerateChunkId(draft.Document.DocumentId, draft.Document.SourceHash, draft.ChunkOrder, draft.Chunk.Text),
                DocumentId = draft.Document.DocumentId,
                ChunkText = draft.Chunk.Text,
                Heading = draft.Chunk.Heading,
                ChunkOrder = draft.ChunkOrder,
                Embedding = embeddings[index],
                CitationLabel = BuildCitationLabel(draft.Document.Title, draft.Chunk.Heading),
            })
            .GroupBy(chunk => chunk.DocumentId)
            .ToDictionary(group => group.Key, group => (IReadOnlyCollection<ChunkModel>)group.ToArray());

        foreach (var document in documents)
        {
            if (newChunks.TryGetValue(document.DocumentId, out var documentChunks))
            {
                await chunkRepository.ReplaceDocumentChunksAsync(document.DocumentId, documentChunks, cancellationToken);
            }
        }
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

    private sealed record ChunkDraft(Document Document, ChunkContent Chunk, int ChunkOrder);
}
