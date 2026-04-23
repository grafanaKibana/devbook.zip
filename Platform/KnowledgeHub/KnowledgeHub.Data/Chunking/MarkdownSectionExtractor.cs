namespace KnowledgeHub.Data.Chunking;

using System.Text;
using System.Text.RegularExpressions;

internal static partial class MarkdownSectionExtractor
{
    [GeneratedRegex(@"^#{1,6}\s+(?<heading>.+?)\s*$", RegexOptions.Compiled)]
    private static partial Regex HeadingRegex();

    public static IReadOnlyList<MarkdownSection> Extract(string markdown)
    {
        if (string.IsNullOrWhiteSpace(markdown))
        {
            return [];
        }

        var sections = new List<MarkdownSection>();
        using var reader = new StringReader(markdown);

        string? currentHeading = null;
        var currentContent = new StringBuilder();

        while (reader.ReadLine() is { } line)
        {
            var match = HeadingRegex().Match(line);

            if (match.Success)
            {
                AppendSection(sections, currentHeading, currentContent);
                currentHeading = match.Groups["heading"].Value.Trim();
                continue;
            }

            currentContent.AppendLine(line);
        }

        AppendSection(sections, currentHeading, currentContent);

        return sections;
    }

    private static void AppendSection(List<MarkdownSection> sections, string? heading, StringBuilder content)
    {
        var normalizedContent = Normalize(content.ToString());
        content.Clear();

        if (string.IsNullOrWhiteSpace(normalizedContent))
        {
            return;
        }

        sections.Add(new MarkdownSection(heading, normalizedContent));
    }

    private static string Normalize(string content)
    {
        var lines = content
            .Replace("\r\n", "\n", StringComparison.Ordinal)
            .Split('\n')
            .Select(line => line.TrimEnd())
            .ToArray();

        var normalized = string.Join("\n", lines).Trim();

        return normalized;
    }
}
