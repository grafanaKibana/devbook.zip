namespace KnowledgeHub.Data.Ingestion;

using System.Buffers.Binary;
using System.IO.Hashing;
using System.Text;
using Hangfire;
using KnowledgeHub.Data.Jobs;
using Microsoft.EntityFrameworkCore;

public sealed class IngestionService(
    KnowledgeHubDbContext dbContext,
    IBackgroundJobClient backgroundJobClient) : IIngestionService
{
    public async Task<IngestionResult> IngestDocumentsAsync(
        IngestionRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.SourcePath))
        {
            throw new ArgumentException("Source path is required.", nameof(request));
        }

        var sourceDirectory = ResolveSourceDirectory(request.SourcePath);

        if (!Directory.Exists(sourceDirectory))
        {
            throw new DirectoryNotFoundException($"Source directory was not found: '{sourceDirectory}'.");
        }

        var markdownFiles = GetMarkdownFiles(sourceDirectory, request.FileName);
        var createdCount = 0;
        var updatedCount = 0;
        var changedDocumentIds = new List<string>();

        foreach (var markdownFile in markdownFiles)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var rawMarkdown = await File.ReadAllTextAsync(markdownFile, cancellationToken);
            var sourceHash = ComputeXxHash3(rawMarkdown);
            var title = Path.GetFileNameWithoutExtension(markdownFile);
            var updatedAt = DateTimeOffset.UtcNow;
            var normalizedSourcePath = NormalizePath(markdownFile);

            var existingDocument = await dbContext.Documents
                .FirstOrDefaultAsync(document => document.SourcePath == normalizedSourcePath, cancellationToken);

            if (existingDocument is null)
            {
                var newDocument = new Document
                {
                    DocumentId = GenerateDocumentId(),
                    SourcePath = normalizedSourcePath,
                    Title = title,
                    RawMarkdown = rawMarkdown,
                    SourceHash = sourceHash,
                    UpdatedAt = updatedAt,
                };

                dbContext.Documents.Add(newDocument);

                createdCount++;
                changedDocumentIds.Add(newDocument.DocumentId);
                continue;
            }

            if (string.Equals(existingDocument.SourceHash, sourceHash, StringComparison.Ordinal)
                && string.Equals(existingDocument.Title, title, StringComparison.Ordinal)
                && string.Equals(existingDocument.RawMarkdown, rawMarkdown, StringComparison.Ordinal))
            {
                continue;
            }

            dbContext.Entry(existingDocument).CurrentValues.SetValues(new Document
            {
                DocumentId = existingDocument.DocumentId,
                SourcePath = normalizedSourcePath,
                Title = title,
                RawMarkdown = rawMarkdown,
                SourceHash = sourceHash,
                UpdatedAt = updatedAt,
            });

            updatedCount++;
            changedDocumentIds.Add(existingDocument.DocumentId);
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        if (changedDocumentIds.Count > 0)
        {
            backgroundJobClient.Enqueue<IDocumentChunkIngestionJob>(
                job => job.ProcessDocumentsAsync(changedDocumentIds.ToArray()));
        }

        return new IngestionResult(
            true,
            markdownFiles.Count,
            createdCount,
            updatedCount,
            changedDocumentIds);
    }

    private static string ResolveSourceDirectory(string sourcePath)
    {
        return Path.IsPathRooted(sourcePath)
            ? sourcePath
            : Path.GetFullPath(sourcePath, Directory.GetCurrentDirectory());
    }

    private static IReadOnlyList<string> GetMarkdownFiles(string sourceDirectory, string? fileName)
    {
        if (!string.IsNullOrWhiteSpace(fileName))
        {
            var filePath = Path.Combine(sourceDirectory, fileName);

            if (!File.Exists(filePath))
            {
                throw new FileNotFoundException($"Markdown file was not found: '{filePath}'.", filePath);
            }

            if (!string.Equals(Path.GetExtension(filePath), ".md", StringComparison.OrdinalIgnoreCase))
            {
                throw new ArgumentException("Only markdown files with the .md extension are supported.", nameof(fileName));
            }

            return [filePath];
        }

        return Directory
            .EnumerateFiles(sourceDirectory, "*.md", SearchOption.AllDirectories)
            .OrderBy(path => path, StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private static string GenerateDocumentId()
    {
        return $"doc_{Guid.CreateVersion7():N}";
    }

    private static string ComputeXxHash3(string value)
    {
        var hashBytes = XxHash3.Hash(Encoding.UTF8.GetBytes(value));
        var hashValue = BinaryPrimitives.ReadUInt64BigEndian(hashBytes);

        return Convert.ToHexStringLower(hashBytes) + $":{hashValue}";
    }

    private static string NormalizePath(string path) => path.Replace('\\', '/');
}
