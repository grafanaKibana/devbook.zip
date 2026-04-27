namespace KnowledgeHub.Data.Jobs;

using KnowledgeHub.Data.Options;
using KnowledgeHub.Data.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

public sealed class DocumentChunkIngestionJob(
    KnowledgeHubDbContext dbContext,
    ChunkingService chunkingService,
    IOptions<ChunkingOptions> options)
{
    private readonly ChunkingOptions options = options.Value;

    public async Task ProcessDocumentsAsync(string[] documentIds)
    {
        ArgumentNullException.ThrowIfNull(documentIds);

        var distinctDocumentIds = documentIds
            .Where(documentId => !string.IsNullOrWhiteSpace(documentId))
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        if (distinctDocumentIds.Length == 0)
        {
            return;
        }

        var batchSize = Math.Max(1, options.DocumentBatchSize);

        foreach (var batch in distinctDocumentIds.Chunk(batchSize))
        {
            var documents = await dbContext.Documents
                .Where(document => batch.Contains(document.DocumentId))
                .OrderBy(document => document.DocumentId)
                .ToListAsync();

            if (documents.Count == 0)
            {
                continue;
            }

            await chunkingService.ReplaceDocumentChunksAsync(documents);
        }
    }
}
