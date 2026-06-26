namespace DevBook.Data.Services;

using System.Diagnostics;
using DevBook.Data.Models;
using DevBook.Data.Options;
using DevBook.Data.Repositories;
using DevBook.Data.Services.Chunking;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

/// <summary>
/// Ingests publishable Markdown notes into MongoDB document and chunk collections.
/// </summary>
/// <param name="documentRepository">Repository used to upsert and delete document records.</param>
/// <param name="chunkRepositoryFactory">Factory used to delete chunks for removed documents.</param>
/// <param name="chunkingServices">Chunking services used to replace chunks for changed documents.</param>
/// <param name="hostEnvironment">Host environment used to resolve the ingestion root.</param>
/// <param name="options">Ingestion root and concurrency options.</param>
public sealed class IngestionService(
    IDocumentRepository documentRepository,
    IChunkRepositoryFactory chunkRepositoryFactory,
    IEnumerable<IChunkingService> chunkingServices,
    IHostEnvironment hostEnvironment,
    IOptions<IngestionOptions> options,
    ILogger<IngestionService>? logger = null) : IIngestionService
{
    private readonly IngestionOptions options = options.Value;
    private readonly ILogger<IngestionService> logger = logger ?? NullLogger<IngestionService>.Instance;

    /// <summary>
    /// Scans markdown files, upserts changed documents, deletes missing documents, and refreshes chunks.
    /// </summary>
    /// <param name="request">The request to process.</param>
    /// <param name="cancellationToken">Token used to cancel the operation.</param>
    /// <returns>Counts for processed, created, updated, deleted, and skipped documents.</returns>
    public async Task<IngestionResult> IngestDocumentsAsync(
        IngestionRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var ingestionRootDirectory = FilePathHelper.ResolveIngestionRootDirectory(hostEnvironment.ContentRootPath, options.ContentRootPath);
        var sourcePath = string.IsNullOrWhiteSpace(request.SourcePath) ? string.Empty : request.SourcePath;
        var sourceDirectory = FilePathHelper.ResolveSourceDirectory(ingestionRootDirectory, sourcePath);

        if (!Directory.Exists(sourceDirectory))
        {
            throw new DirectoryNotFoundException($"Source directory was not found: '{sourceDirectory}'.");
        }

        var markdownFiles = FilePathHelper.GetMarkdownFiles(ingestionRootDirectory, sourceDirectory, request.FileName);
        var markdownSnapshots = await ReadMarkdownFileSnapshotsAsync(markdownFiles, ingestionRootDirectory, cancellationToken);
        var createdCount = 0;
        var updatedCount = 0;
        var deletedCount = 0;
        var changedDocuments = new List<Document>();
        var changedDocumentIds = new List<string>();
        var isFolderIngestion = string.IsNullOrWhiteSpace(request.FileName);
        var selectedChunkingServices = GetSelectedChunkingServices(request.ChunkingStrategy);
        var existingDocumentsBySourcePath = new Dictionary<string, Document>(StringComparer.Ordinal);
        var totalStopwatch = Stopwatch.StartNew();

        logger.LogInformation(
            "Starting ingestion for SourcePath {SourcePath}, FileName {FileName}, ForceReingest {ForceReingest}, ChunkingStrategies {ChunkingStrategies}.",
            string.IsNullOrWhiteSpace(sourcePath) ? "<root>" : sourcePath,
            string.IsNullOrWhiteSpace(request.FileName) ? "<all>" : request.FileName,
            request.ForceReingest,
            string.Join(", ", selectedChunkingServices.Select(service => service.Strategy)));

        if (isFolderIngestion)
        {
            var sourcePathPrefix = FilePathHelper.GetSourcePathPrefix(ingestionRootDirectory, sourceDirectory);
            var existingDocuments = await documentRepository.GetBySourcePathPrefixAsync(sourcePathPrefix, cancellationToken);
            existingDocumentsBySourcePath = existingDocuments.ToDictionary(document => document.SourcePath, StringComparer.Ordinal);
            var currentSourcePaths = markdownSnapshots
                .Select(snapshot => snapshot.SourcePath)
                .ToHashSet(StringComparer.Ordinal);
            var deletedDocumentIds = existingDocuments
                .Where(document => !currentSourcePaths.Contains(document.SourcePath))
                .Select(document => document.DocumentId)
                .ToArray();

            foreach (var chunkingService in selectedChunkingServices)
            {
                var deleteStopwatch = Stopwatch.StartNew();
                await chunkRepositoryFactory.Create(chunkingService.Strategy)
                    .DeleteByDocumentIdsAsync(deletedDocumentIds, cancellationToken);

                logger.LogInformation(
                    "Deleted chunks for {DeletedDocumentCount} missing documents from {ChunkingStrategy} collection in {ElapsedMilliseconds} ms.",
                    deletedDocumentIds.Length,
                    chunkingService.Strategy,
                    deleteStopwatch.ElapsedMilliseconds);
            }

            await documentRepository.DeleteByIdsAsync(deletedDocumentIds, cancellationToken);

            deletedCount = deletedDocumentIds.Length;
        }

        foreach (var snapshot in markdownSnapshots)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var existingDocument = isFolderIngestion
                ? existingDocumentsBySourcePath.GetValueOrDefault(snapshot.SourcePath)
                : await documentRepository.GetBySourcePathAsync(snapshot.SourcePath, cancellationToken);

            if (existingDocument is null)
            {
                var newDocument = CreateDocument(snapshot, HashingHelper.GenerateDocumentId(snapshot.SourcePath));

                createdCount++;
                changedDocuments.Add(newDocument);
                changedDocumentIds.Add(newDocument.DocumentId);
                continue;
            }

            if (!request.ForceReingest
                && string.Equals(existingDocument.SourceHash, snapshot.SourceHash, StringComparison.Ordinal)
                && string.Equals(existingDocument.Title, snapshot.Title, StringComparison.Ordinal))
            {
                continue;
            }

            var updatedDocument = CreateDocument(snapshot, existingDocument.DocumentId);

            updatedCount++;
            changedDocuments.Add(updatedDocument);
            changedDocumentIds.Add(existingDocument.DocumentId);
        }

        if (changedDocuments.Count > 0)
        {
            await documentRepository.BulkUpsertAsync(changedDocuments, cancellationToken);
        }

        foreach (var chunkingService in selectedChunkingServices)
        {
            var chunkingStopwatch = Stopwatch.StartNew();
            await chunkingService.ReplaceDocumentChunksAsync(changedDocuments, cancellationToken);

            logger.LogInformation(
                "Refreshed chunks for {ChangedDocumentCount} changed documents in {ChunkingStrategy} collection in {ElapsedMilliseconds} ms.",
                changedDocuments.Count,
                chunkingService.Strategy,
                chunkingStopwatch.ElapsedMilliseconds);
        }

        logger.LogInformation(
            "Completed ingestion for SourcePath {SourcePath}, FileName {FileName} in {ElapsedMilliseconds} ms. Processed {ProcessedCount}, created {CreatedCount}, updated {UpdatedCount}, deleted {DeletedCount}, skipped {SkippedCount}.",
            string.IsNullOrWhiteSpace(sourcePath) ? "<root>" : sourcePath,
            string.IsNullOrWhiteSpace(request.FileName) ? "<all>" : request.FileName,
            totalStopwatch.ElapsedMilliseconds,
            markdownSnapshots.Count,
            createdCount,
            updatedCount,
            deletedCount,
            markdownSnapshots.Count - createdCount - updatedCount);

        return new IngestionResult(
            true,
            markdownSnapshots.Count,
            createdCount,
            updatedCount,
            deletedCount,
            changedDocumentIds);
    }

    private static Document CreateDocument(MarkdownFileSnapshot snapshot, string documentId) =>
        new()
        {
            DocumentId = documentId,
            SourcePath = snapshot.SourcePath,
            Title = snapshot.Title,
            RawMarkdown = snapshot.RawMarkdown,
            Frontmatter = snapshot.Frontmatter,
            PageContent = snapshot.PageContent,
            SourceHash = snapshot.SourceHash,
            UpdatedAt = snapshot.UpdatedAt,
        };

    private IReadOnlyList<IChunkingService> GetSelectedChunkingServices(ChunkingStrategyKind? requestedStrategy)
    {
        var services = chunkingServices.ToArray();

        if (requestedStrategy is null)
        {
            return services;
        }

        var selected = services
            .Where(service => service.Strategy == requestedStrategy.Value)
            .ToArray();

        if (selected.Length == 0)
        {
            throw new InvalidOperationException($"Chunking strategy '{requestedStrategy}' is not registered.");
        }

        return selected;
    }

    private async Task<IReadOnlyList<MarkdownFileSnapshot>> ReadMarkdownFileSnapshotsAsync(
        IReadOnlyList<string> markdownFiles,
        string ingestionRootDirectory,
        CancellationToken cancellationToken)
    {
        var snapshots = new MarkdownFileSnapshot?[markdownFiles.Count];

        await Parallel.ForEachAsync(
            markdownFiles.Select((path, index) => new { path, index }),
            new ParallelOptions
            {
                MaxDegreeOfParallelism = Math.Max(1, options.MaxFileReadConcurrency),
                CancellationToken = cancellationToken,
            },
            async (item, token) =>
            {
                var rawMarkdown = await File.ReadAllTextAsync(item.path, token);
                var markdownParts = MarkdownHelper.SplitFrontmatter(rawMarkdown);
                var normalizedSourcePath = FilePathHelper.NormalizePath(Path.GetRelativePath(ingestionRootDirectory, item.path));

                if (!MarkdownHelper.ShouldIngest(normalizedSourcePath, markdownParts.Frontmatter))
                {
                    return;
                }

                snapshots[item.index] = new MarkdownFileSnapshot(
                    normalizedSourcePath,
                    Path.GetFileNameWithoutExtension(item.path),
                    rawMarkdown,
                    markdownParts.Frontmatter,
                    markdownParts.PageContent,
                    HashingHelper.ComputeXxHash3(rawMarkdown),
                    DateTimeOffset.UtcNow);
            });

        return snapshots.OfType<MarkdownFileSnapshot>().ToArray();
    }

    private sealed record MarkdownFileSnapshot(
        string SourcePath,
        string Title,
        string RawMarkdown,
        string Frontmatter,
        string PageContent,
        string SourceHash,
        DateTimeOffset UpdatedAt);
}
