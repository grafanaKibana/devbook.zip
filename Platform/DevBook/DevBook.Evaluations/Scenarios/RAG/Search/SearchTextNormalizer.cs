namespace DevBook.Evaluations.Scenarios.RAG.Search;

/// <summary>
/// Text and path normalization shared by <see cref="SearchMetricCalculator"/>'s matching logic:
/// path/whitespace normalization, normalized "contains" comparison, Obsidian wiki-link parsing, and
/// source-name extraction. Pure string functions with no evaluation state.
/// </summary>
internal static class SearchTextNormalizer
{
    internal static bool MatchesNormalizedContains(string? expectedValue, string? actualValue)
    {
        if (string.IsNullOrWhiteSpace(expectedValue) || string.IsNullOrWhiteSpace(actualValue))
        {
            return false;
        }

        return NormalizeText(actualValue).Contains(NormalizeText(expectedValue), StringComparison.OrdinalIgnoreCase);
    }

    internal static string NormalizePath(string value)
    {
        return value.Replace('\\', '/').Trim();
    }

    internal static string NormalizeText(string value)
        => string.Join(' ', value.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries)).Trim();

    internal static bool MatchesSourceName(string expectedSourcePath, string retrievedSourcePath)
    {
        return string.Equals(ExtractSourceName(expectedSourcePath), ExtractSourceName(retrievedSourcePath), StringComparison.Ordinal);
    }

    internal static string ExtractSourceName(string value)
    {
        var path = NormalizePath(value);

        return TryParseWikiLink(path, out var wikiSource, out _)
            ? NormalizeSourceName(wikiSource)
            : NormalizeSourceName(path);
    }

    internal static bool TryParseWikiLink(string value, out string source, out string? heading)
    {
        source = value;
        heading = null;

        if (!value.StartsWith("[[", StringComparison.Ordinal) || !value.EndsWith("]]", StringComparison.Ordinal))
        {
            return false;
        }

        var inner = value[2..^2];
        var aliasIndex = inner.IndexOf('|', StringComparison.Ordinal);
        if (aliasIndex >= 0)
        {
            inner = inner[..aliasIndex];
        }

        var headingIndex = inner.IndexOf('#', StringComparison.Ordinal);
        if (headingIndex >= 0)
        {
            source = inner[..headingIndex];
            heading = inner[(headingIndex + 1)..];
            return true;
        }

        source = inner;
        return true;
    }

    internal static string NormalizeSourceName(string value)
    {
        var normalized = NormalizePath(value);
        var fileName = normalized.Split('/', StringSplitOptions.RemoveEmptyEntries).LastOrDefault() ?? normalized;

        return NormalizeText(fileName.EndsWith(".md", StringComparison.OrdinalIgnoreCase) ? fileName[..^3] : fileName)
            .ToUpperInvariant();
    }

    internal static string? NormalizeOptionalText(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : NormalizeText(value).ToUpperInvariant();

    internal static string? Preview(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = NormalizeText(value);
        const int maxLength = 180;

        return normalized.Length <= maxLength ? normalized : normalized[..maxLength] + "…";
    }
}
