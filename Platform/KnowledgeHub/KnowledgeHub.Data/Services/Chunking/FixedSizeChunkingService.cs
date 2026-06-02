namespace KnowledgeHub.Data.Services.Chunking;

using System.Buffers.Binary;
using System.IO.Hashing;
using System.Text;
using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Options;
using KnowledgeHub.Data.Repositories;
using Microsoft.Extensions.Options;

public sealed class FixedSizeChunkingService(
    IChunkRepository chunkRepository,
    IOptions<ChunkingOptions> options,
    IEmbeddingService embeddingService) : IChunkingService
{
    private readonly ChunkingOptions options = options.Value;

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

            var chunkTexts = SplitFixedSize(document.PageContent);

            if (chunkTexts.Count == 0)
            {
                emptyDocumentIds.Add(document.DocumentId);
                continue;
            }

            chunkDrafts.AddRange(chunkTexts.Select((text, index) => new ChunkDraft(document, text, index)));
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
            chunkDrafts.Select(draft => draft.ChunkText).ToArray(),
            cancellationToken);

        var newChunks = chunkDrafts
            .Select((draft, index) => new ChunkModel
            {
                ChunkId = GenerateChunkId(draft.Document.DocumentId, draft.Document.SourceHash, draft.ChunkOrder, draft.ChunkText),
                DocumentId = draft.Document.DocumentId,
                ChunkText = draft.ChunkText,
                Heading = null,
                ChunkOrder = draft.ChunkOrder,
                Embedding = embeddings[index],
                CitationLabel = $"[[{draft.Document.Title}]]",
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

    private IReadOnlyList<string> SplitFixedSize(string content)
    {
        var normalizedContent = content.Trim();
        if (string.IsNullOrWhiteSpace(normalizedContent))
        {
            return [];
        }

        var maxChunkLength = Math.Max(1, options.MaxChunkLength);
        var overlapLength = Math.Clamp(options.OverlapLength, 0, Math.Max(0, maxChunkLength - 1));
        var chunks = new List<string>();
        var start = 0;

        while (start < normalizedContent.Length)
        {
            var remainingLength = normalizedContent.Length - start;
            var length = Math.Min(maxChunkLength, remainingLength);
            var endExclusive = start + length;

            if (endExclusive < normalizedContent.Length)
            {
                var splitIndex = FindWhitespaceBoundary(normalizedContent, start, endExclusive);
                if (splitIndex > start)
                {
                    endExclusive = splitIndex;
                }
            }

            var text = normalizedContent[start..endExclusive].Trim();
            if (!string.IsNullOrWhiteSpace(text))
            {
                chunks.Add(text);
            }

            if (endExclusive >= normalizedContent.Length)
            {
                break;
            }

            start = Math.Max(endExclusive - overlapLength, start + 1);
        }

        return chunks;
    }

    private static int FindWhitespaceBoundary(string content, int start, int endExclusive)
    {
        for (var index = endExclusive; index > start; index--)
        {
            if (char.IsWhiteSpace(content[index - 1]))
            {
                return index;
            }
        }

        return endExclusive;
    }

    private static string GenerateChunkId(string documentId, string sourceHash, int chunkOrder, string chunkText)
    {
        var hashBytes = XxHash3.Hash(Encoding.UTF8.GetBytes($"{documentId}|{sourceHash}|{chunkOrder}|{chunkText}"));
        var hashValue = BinaryPrimitives.ReadUInt64BigEndian(hashBytes);

        return $"chunk_{documentId}_{chunkOrder:D4}_{Convert.ToHexStringLower(hashBytes)}:{hashValue}";
    }

    private sealed record ChunkDraft(Document Document, string ChunkText, int ChunkOrder);
}
