namespace DevBook.Data.Services;

using System.Text;

/// <summary>
/// Markdown frontmatter parsing and the publish/template gating that decides whether a file is
/// ingested, used by <see cref="IngestionService"/>.
/// </summary>
internal static class MarkdownHelper
{
    internal static bool ShouldIngest(string normalizedSourcePath, string frontmatter) =>
        !IsTemplatePath(normalizedSourcePath) && HasPublishFlag(frontmatter);

    internal static MarkdownParts SplitFrontmatter(string rawMarkdown)
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

    internal sealed record MarkdownParts(string Frontmatter, string PageContent);
}
