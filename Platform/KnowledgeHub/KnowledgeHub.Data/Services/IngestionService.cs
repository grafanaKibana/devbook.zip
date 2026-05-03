namespace KnowledgeHub.Data.Services;

using System.Buffers.Binary;
using System.IO.Hashing;
using System.Text;
using Hangfire;
using KnowledgeHub.Data.Jobs;
using KnowledgeHub.Data.Models;
using KnowledgeHub.Data.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

public sealed class IngestionService(
    KnowledgeHubDbContext dbContext,
    IBackgroundJobClient backgroundJobClient,
    IHostEnvironment hostEnvironment,
    IOptions<IngestionOptions> options)
{
    private readonly IngestionOptions options = options.Value;

    public async Task<IngestionResult> IngestDocumentsAsync(
        IngestionRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (string.IsNullOrWhiteSpace(request.SourcePath))
        {
            throw new ArgumentException("Source path is required.", nameof(request));
        }

        var ingestionRootDirectory = ResolveIngestionRootDirectory(hostEnvironment.ContentRootPath, options.ContentRootPath);
        var sourceDirectory = ResolveSourceDirectory(ingestionRootDirectory, request.SourcePath);

        if (!Directory.Exists(sourceDirectory))
        {
            throw new DirectoryNotFoundException($"Source directory was not found: '{sourceDirectory}'.");
        }

        var markdownFiles = GetMarkdownFiles(ingestionRootDirectory, sourceDirectory, request.FileName);
        var createdCount = 0;
        var updatedCount = 0;
        var changedDocumentIds = new List<string>();

        foreach (var markdownFile in markdownFiles)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var rawMarkdown = await File.ReadAllTextAsync(markdownFile, cancellationToken);
            var markdownParts = SplitFrontmatter(rawMarkdown);
            var sourceHash = ComputeXxHash3(rawMarkdown);
            var title = Path.GetFileNameWithoutExtension(markdownFile);
            var updatedAt = DateTimeOffset.UtcNow;
            var normalizedSourcePath = NormalizePath(Path.GetRelativePath(ingestionRootDirectory, markdownFile));

            var existingDocument = await dbContext.Documents
                .FirstOrDefaultAsync(document => document.SourcePath == normalizedSourcePath, cancellationToken);

            if (existingDocument is null)
            {
                var newDocument = new Document
                {
                    DocumentId = GenerateDocumentId(normalizedSourcePath),
                    SourcePath = normalizedSourcePath,
                    Title = title,
                    RawMarkdown = rawMarkdown,
                    Frontmatter = markdownParts.Frontmatter,
                    PageContent = markdownParts.PageContent,
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
                && string.Equals(existingDocument.RawMarkdown, rawMarkdown, StringComparison.Ordinal)
                && string.Equals(existingDocument.Frontmatter, markdownParts.Frontmatter, StringComparison.Ordinal)
                && string.Equals(existingDocument.PageContent, markdownParts.PageContent, StringComparison.Ordinal))
            {
                continue;
            }

            dbContext.Entry(existingDocument).CurrentValues.SetValues(new Document
            {
                DocumentId = existingDocument.DocumentId,
                SourcePath = normalizedSourcePath,
                Title = title,
                RawMarkdown = rawMarkdown,
                Frontmatter = markdownParts.Frontmatter,
                PageContent = markdownParts.PageContent,
                SourceHash = sourceHash,
                UpdatedAt = updatedAt,
            });

            updatedCount++;
            changedDocumentIds.Add(existingDocument.DocumentId);
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        if (changedDocumentIds.Count > 0)
        {
            backgroundJobClient.Enqueue<DocumentChunkIngestionJob>(
                job => job.ProcessDocumentsAsync(changedDocumentIds.ToArray()));
        }

        return new IngestionResult(
            true,
            markdownFiles.Count,
            createdCount,
            updatedCount,
            changedDocumentIds);
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
        var normalizedRoot = AppendDirectorySeparator(Path.GetFullPath(ingestionRootDirectory));
        var normalizedCandidate = Path.GetFullPath(candidatePath);

        if (!normalizedCandidate.StartsWith(normalizedRoot, StringComparison.Ordinal))
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

    private static string NormalizePath(string path) => path.Replace('\\', '/');

    private sealed record MarkdownParts(string Frontmatter, string PageContent);
}
