namespace KnowledgeHub.Data.Services;

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

        foreach (var document in documents)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var chunkTexts = SplitFixedSize(document.PageContent);

            if (chunkTexts.Count == 0)
            {
                await chunkRepository.ReplaceDocumentChunksAsync(document.DocumentId, [], cancellationToken);
                continue;
            }

            var embeddings = await embeddingService.GenerateEmbeddingsAsync(chunkTexts, cancellationToken);
            var chunks = chunkTexts
                .Select((text, index) => new ChunkModel
                {
                    ChunkId = GenerateChunkId(document.DocumentId, document.SourceHash, index, text),
                    DocumentId = document.DocumentId,
                    ChunkText = text,
                    Heading = null,
                    ChunkOrder = index,
                    Embedding = embeddings[index],
                    CitationLabel = $"[[{document.Title}]]",
                })
                .ToArray();

            await chunkRepository.ReplaceDocumentChunksAsync(document.DocumentId, chunks, cancellationToken);
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
}