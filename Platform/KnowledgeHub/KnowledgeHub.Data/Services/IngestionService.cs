namespace KnowledgeHub.Data.Services;

using System.Buffers.Binary;
using System.IO.Hashing;
using System.Text;
using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Options;
using KnowledgeHub.Data.Repositories;
using KnowledgeHub.Data.Services.Chunking;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

public sealed class IngestionService(
    IDocumentRepository documentRepository,
    IChunkRepositoryFactory chunkRepositoryFactory,
    IEnumerable<IChunkingService> chunkingServices,
    IHostEnvironment hostEnvironment,
    IOptions<IngestionOptions> options) : IIngestionService
{
    private readonly IngestionOptions options = options.Value;

    public async Task<IngestionResult> IngestDocumentsAsync(
        IngestionRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var ingestionRootDirectory = ResolveIngestionRootDirectory(hostEnvironment.ContentRootPath, options.ContentRootPath);
        var sourcePath = string.IsNullOrWhiteSpace(request.SourcePath) ? string.Empty : request.SourcePath;
        var sourceDirectory = ResolveSourceDirectory(ingestionRootDirectory, sourcePath);

        if (!Directory.Exists(sourceDirectory))
        {
            throw new DirectoryNotFoundException($"Source directory was not found: '{sourceDirectory}'.");
        }

        var markdownFiles = GetMarkdownFiles(ingestionRootDirectory, sourceDirectory, request.FileName);
        var markdownSnapshots = await ReadMarkdownFileSnapshotsAsync(markdownFiles, ingestionRootDirectory, cancellationToken);
        var createdCount = 0;
        var updatedCount = 0;
        var deletedCount = 0;
        var changedDocuments = new List<Document>();
        var changedDocumentIds = new List<string>();
        var isFolderIngestion = string.IsNullOrWhiteSpace(request.FileName);
        var selectedChunkingServices = GetSelectedChunkingServices(request.ChunkingStrategy);
        var existingDocumentsBySourcePath = new Dictionary<string, Document>(StringComparer.Ordinal);

        if (isFolderIngestion)
        {
            var sourcePathPrefix = GetSourcePathPrefix(ingestionRootDirectory, sourceDirectory);
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
                await chunkRepositoryFactory.Create(chunkingService.Strategy)
                    .DeleteByDocumentIdsAsync(deletedDocumentIds, cancellationToken);
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
                var newDocument = new Document
                {
                    DocumentId = GenerateDocumentId(snapshot.SourcePath),
                    SourcePath = snapshot.SourcePath,
                    Title = snapshot.Title,
                    RawMarkdown = snapshot.RawMarkdown,
                    Frontmatter = snapshot.Frontmatter,
                    PageContent = snapshot.PageContent,
                    SourceHash = snapshot.SourceHash,
                    UpdatedAt = snapshot.UpdatedAt,
                };

                createdCount++;
                changedDocuments.Add(newDocument);
                changedDocumentIds.Add(newDocument.DocumentId);
                continue;
            }

            if (!request.ForceReingest
                && string.Equals(existingDocument.SourceHash, snapshot.SourceHash, StringComparison.Ordinal)
                && string.Equals(existingDocument.Title, snapshot.Title, StringComparison.Ordinal)
                && string.Equals(existingDocument.RawMarkdown, snapshot.RawMarkdown, StringComparison.Ordinal)
                && string.Equals(existingDocument.Frontmatter, snapshot.Frontmatter, StringComparison.Ordinal)
                && string.Equals(existingDocument.PageContent, snapshot.PageContent, StringComparison.Ordinal))
            {
                continue;
            }

            var updatedDocument = new Document
            {
                DocumentId = existingDocument.DocumentId,
                SourcePath = snapshot.SourcePath,
                Title = snapshot.Title,
                RawMarkdown = snapshot.RawMarkdown,
                Frontmatter = snapshot.Frontmatter,
                PageContent = snapshot.PageContent,
                SourceHash = snapshot.SourceHash,
                UpdatedAt = snapshot.UpdatedAt,
            };

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
            await chunkingService.ReplaceDocumentChunksAsync(changedDocuments, cancellationToken);
        }

        return new IngestionResult(
            true,
            markdownSnapshots.Count,
            createdCount,
            updatedCount,
            deletedCount,
            changedDocumentIds);
    }

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
                var markdownParts = SplitFrontmatter(rawMarkdown);
                var normalizedSourcePath = NormalizePath(Path.GetRelativePath(ingestionRootDirectory, item.path));

                if (!ShouldIngest(normalizedSourcePath, markdownParts.Frontmatter))
                {
                    return;
                }

                snapshots[item.index] = new MarkdownFileSnapshot(
                    normalizedSourcePath,
                    Path.GetFileNameWithoutExtension(item.path),
                    rawMarkdown,
                    markdownParts.Frontmatter,
                    markdownParts.PageContent,
                    ComputeXxHash3(rawMarkdown),
                    DateTimeOffset.UtcNow);
            });

        return snapshots.OfType<MarkdownFileSnapshot>().ToArray();
    }

    private static bool ShouldIngest(string normalizedSourcePath, string frontmatter) =>
        !IsTemplatePath(normalizedSourcePath) && HasPublishFlag(frontmatter);

    private static bool IsTemplatePath(string normalizedSourcePath) =>
        normalizedSourcePath
            .Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Any(segment => string.Equals(segment, "Templates", StringComparison.OrdinalIgnoreCase));

    private static bool HasPublishFlag(string frontmatter) =>
        frontmatter
            .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Any(line =>
            {
                var parts = line.Split(':', 2, StringSplitOptions.TrimEntries);
                return parts.Length == 2
                       && string.Equals(parts[0], "dg-publish", StringComparison.OrdinalIgnoreCase)
                       && string.Equals(parts[1].Trim('\'', '"'), "true", StringComparison.OrdinalIgnoreCase);
            });

    private static string GetSourcePathPrefix(string ingestionRootDirectory, string sourceDirectory)
    {
        var relativePath = NormalizePath(Path.GetRelativePath(ingestionRootDirectory, sourceDirectory));

        return string.Equals(relativePath, ".", StringComparison.Ordinal) ? string.Empty : relativePath.TrimEnd('/');
    }

    private static string ResolveIngestionRootDirectory(string hostContentRootPath, string configuredContentRootPath)
    {
        if (string.IsNullOrWhiteSpace(configuredContentRootPath))
        {
            throw new InvalidOperationException("Ingestion content root path is required.");
        }

        return Path.IsPathRooted(configuredContentRootPath)
            ? Path.GetFullPath(configuredContentRootPath)
            : Path.GetFullPath(configuredContentRootPath, hostContentRootPath);
    }

    private static string ResolveSourceDirectory(string ingestionRootDirectory, string sourcePath)
    {
        if (Path.IsPathRooted(sourcePath))
        {
            throw new ArgumentException("SourcePath must be relative to the configured ingestion root.", nameof(sourcePath));
        }

        if (ContainsTraversal(sourcePath))
        {
            throw new ArgumentException("SourcePath must stay within the configured ingestion root.", nameof(sourcePath));
        }

        var sourceDirectory = Path.GetFullPath(Path.Combine(ingestionRootDirectory, sourcePath));
        EnsurePathIsUnderRoot(ingestionRootDirectory, sourceDirectory, nameof(sourcePath));

        return sourceDirectory;
    }

    private static IReadOnlyList<string> GetMarkdownFiles(
        string ingestionRootDirectory,
        string sourceDirectory,
        string? fileName)
    {
        if (!string.IsNullOrWhiteSpace(fileName))
        {
            ValidateFileName(fileName);

            var filePath = Path.Combine(sourceDirectory, fileName);
            var normalizedFilePath = Path.GetFullPath(filePath);

            EnsurePathIsUnderRoot(ingestionRootDirectory, normalizedFilePath, nameof(fileName));

            if (!File.Exists(normalizedFilePath))
            {
                throw new FileNotFoundException($"Markdown file was not found: '{normalizedFilePath}'.", normalizedFilePath);
            }

            return [normalizedFilePath];
        }

        var markdownFiles = Directory
            .EnumerateFiles(sourceDirectory, "*.md", SearchOption.AllDirectories)
            .OrderBy(path => path, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return markdownFiles;
    }

    private static string GenerateDocumentId(string normalizedSourcePath)
    {
        var hash = ComputeXxHash3(normalizedSourcePath).Split(':', 2)[0];

        return $"doc_{hash}";
    }

    private static string ComputeXxHash3(string value)
    {
        var hashBytes = XxHash3.Hash(Encoding.UTF8.GetBytes(value));
        var hashValue = BinaryPrimitives.ReadUInt64BigEndian(hashBytes);

        return Convert.ToHexStringLower(hashBytes) + $":{hashValue}";
    }

    private static MarkdownParts SplitFrontmatter(string rawMarkdown)
    {
        if (!rawMarkdown.StartsWith("---", StringComparison.Ordinal))
        {
            return new MarkdownParts(string.Empty, rawMarkdown);
        }

        using var reader = new StringReader(rawMarkdown);
        var firstLine = reader.ReadLine();
        if (!string.Equals(firstLine, "---", StringComparison.Ordinal))
        {
            return new MarkdownParts(string.Empty, rawMarkdown);
        }

        var frontmatterBuilder = new StringBuilder();
        while (reader.ReadLine() is { } line)
        {
            if (string.Equals(line, "---", StringComparison.Ordinal))
            {
                return new MarkdownParts(frontmatterBuilder.ToString().TrimEnd(), reader.ReadToEnd().TrimStart());
            }

            frontmatterBuilder.AppendLine(line);
        }

        return new MarkdownParts(string.Empty, rawMarkdown);
    }

    private static void ValidateFileName(string fileName)
    {
        if (Path.IsPathRooted(fileName))
        {
            throw new ArgumentException("FileName must be relative to the selected source directory.", nameof(fileName));
        }

        if (!string.Equals(fileName, Path.GetFileName(fileName), StringComparison.Ordinal)
            || fileName.Contains(Path.DirectorySeparatorChar)
            || fileName.Contains(Path.AltDirectorySeparatorChar)
            || ContainsTraversal(fileName))
        {
            throw new ArgumentException("FileName must be a single markdown file name without path segments.", nameof(fileName));
        }

        if (!string.Equals(Path.GetExtension(fileName), ".md", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Only markdown files with the .md extension are supported.", nameof(fileName));
        }
    }

    private static void EnsurePathIsUnderRoot(string ingestionRootDirectory, string candidatePath, string parameterName)
    {
        var normalizedRoot = TrimDirectorySeparator(Path.GetFullPath(ingestionRootDirectory));
        var normalizedRootWithSeparator = AppendDirectorySeparator(normalizedRoot);
        var normalizedCandidate = Path.GetFullPath(candidatePath);

        if (!string.Equals(normalizedCandidate, normalizedRoot, StringComparison.Ordinal)
            && !normalizedCandidate.StartsWith(normalizedRootWithSeparator, StringComparison.Ordinal))
        {
            throw new ArgumentException("The requested path must stay within the configured ingestion root.", parameterName);
        }
    }

    private static bool ContainsTraversal(string path)
    {
        var pathSegments = path.Split(['/', '\\'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        return pathSegments.Any(segment => string.Equals(segment, "..", StringComparison.Ordinal));
    }

    private static string AppendDirectorySeparator(string path)
    {
        return path.EndsWith(Path.DirectorySeparatorChar)
            ? path
            : path + Path.DirectorySeparatorChar;
    }

    private static string TrimDirectorySeparator(string path)
    {
        return path.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
    }

    private static string NormalizePath(string path) => path.Replace('\\', '/');

    private sealed record MarkdownParts(string Frontmatter, string PageContent);

    private sealed record MarkdownFileSnapshot(
        string SourcePath,
        string Title,
        string RawMarkdown,
        string Frontmatter,
        string PageContent,
        string SourceHash,
        DateTimeOffset UpdatedAt);
}
