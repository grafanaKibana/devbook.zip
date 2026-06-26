namespace DevBook.Data.Services;

/// <summary>
/// Path resolution, markdown-file discovery, and ingestion-root traversal guards used by
/// <see cref="IngestionService"/>. Every operation stays within the configured ingestion root.
/// </summary>
internal static class FilePathHelper
{
    internal static string GetSourcePathPrefix(string ingestionRootDirectory, string sourceDirectory)
    {
        var relativePath = NormalizePath(Path.GetRelativePath(ingestionRootDirectory, sourceDirectory));

        return string.Equals(relativePath, ".", StringComparison.Ordinal) ? string.Empty : relativePath.TrimEnd('/');
    }

    internal static string ResolveIngestionRootDirectory(string hostContentRootPath, string configuredContentRootPath)
    {
        if (string.IsNullOrWhiteSpace(configuredContentRootPath))
        {
            throw new InvalidOperationException("Ingestion content root path is required.");
        }

        return Path.IsPathRooted(configuredContentRootPath)
            ? Path.GetFullPath(configuredContentRootPath)
            : Path.GetFullPath(configuredContentRootPath, hostContentRootPath);
    }

    internal static string ResolveSourceDirectory(string ingestionRootDirectory, string sourcePath)
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

    internal static IReadOnlyList<string> GetMarkdownFiles(
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

    internal static string NormalizePath(string path) => path.Replace('\\', '/');

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
}
