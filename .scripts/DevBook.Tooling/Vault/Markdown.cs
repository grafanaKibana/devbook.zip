using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace DevBook.Tooling.Vault;

public sealed record FrontmatterValue(string Kind, object? Value, int Line)
{
    public IReadOnlyList<object?> Items => Value as IReadOnlyList<object?> ?? [];
    public string Text => Value as string ?? string.Empty;
}

public sealed record NoteDocument(string Path, string Rel, string Content,
    IReadOnlyDictionary<string, FrontmatterValue> Frontmatter, string Body, int BodyStartLine)
{
    public bool IsFolderNote => Frontmatter.TryGetValue("tags", out FrontmatterValue? tags)
        && tags.Kind == "list" && tags.Items.Contains("FolderNote");

    public static NoteDocument Load(string path, string repoRoot) => Parse(File.ReadAllText(path),
        System.IO.Path.GetRelativePath(repoRoot, path).Replace('\\', '/'), System.IO.Path.GetFullPath(path));

    public static NoteDocument Parse(string content, string relativePath, string? path = null)
    {
        (Dictionary<string, FrontmatterValue> frontmatter, string body, int start) = Markdown.SplitFrontmatter(content);
        return new(path ?? relativePath, relativePath, content, frontmatter, body, start);
    }
}

public static class Markdown
{
    public static string[] Lines(string text, bool keepEndings = false)
    {
        if (text.Length == 0)
        {
            return [];
        }
        MatchCollection matches = Regex.Matches(text, @"[^\r\n]*(?:\r\n|\r|\n|$)");
        return matches.Cast<Match>().Where(match => match.Length != 0)
            .Select(match => keepEndings ? match.Value : match.Value.TrimEnd('\r', '\n')).ToArray();
    }

    public static (string Kind, object? Value) ParseScalar(string raw)
    {
        string value = raw.Trim();
        if (value.Length == 0 || value is "null" or "Null" or "NULL" or "~")
        {
            return ("null", null);
        }
        if (value.StartsWith('[') && value.EndsWith(']'))
        {
            var items = new List<object?>();
            var current = new StringBuilder();
            char quote = '\0';
            foreach (char character in value[1..^1])
            {
                if (character is '\'' or '"')
                {
                    if (quote == character)
                    {
                        quote = '\0';
                    }
                    else if (quote == '\0')
                    {
                        quote = character;
                    }
                    current.Append(character);
                }
                else if (character == ',' && quote == '\0')
                {
                    items.Add(ParseScalar(current.ToString()).Value);
                    current.Clear();
                }
                else
                {
                    current.Append(character);
                }
            }
            if (current.Length != 0)
            {
                items.Add(ParseScalar(current.ToString()).Value);
            }
            return ("list", items);
        }
        if (bool.TryParse(value, out bool boolean))
        {
            return ("bool", boolean);
        }
        if (Regex.IsMatch(value, @"^[-+]?\d+(?:\.\d+)?$"))
        {
            return ("number", decimal.Parse(value, CultureInfo.InvariantCulture));
        }
        return ("string", Unquote(value));
    }

    public static string Unquote(string value)
    {
        value = value.Trim();
        return value.Length >= 2 && value[0] == value[^1] && value[0] is '\'' or '"' ? value[1..^1] : value;
    }

    public static (Dictionary<string, FrontmatterValue> Values, string Body, int BodyStartLine) SplitFrontmatter(string content)
    {
        string[] lines = Lines(content);
        var values = new Dictionary<string, FrontmatterValue>(StringComparer.Ordinal);
        if (lines.Length == 0 || lines[0].Trim() != "---")
        {
            return (values, content, 1);
        }
        int end = Array.FindIndex(lines, 1, line => line.Trim() == "---");
        if (end < 0)
        {
            return (values, content, 1);
        }
        for (var index = 1; index < end; index++)
        {
            Match match = Regex.Match(lines[index], @"^([A-Za-z][A-Za-z0-9_-]*):(?:\s*(.*))?$");
            if (!match.Success)
            {
                continue;
            }
            string key = match.Groups[1].Value;
            string raw = match.Groups[2].Value;
            int lineNumber = index + 1;
            if (string.IsNullOrWhiteSpace(raw))
            {
                var items = new List<object?>();
                int next = index + 1;
                for (; next < end; next++)
                {
                    Match item = Regex.Match(lines[next], @"^\s+-\s+(.*?)\s*$");
                    if (!item.Success)
                    {
                        break;
                    }
                    items.Add(ParseScalar(item.Groups[1].Value).Value);
                }
                if (items.Count != 0)
                {
                    values[key] = new("list", items, lineNumber);
                    index = next - 1;
                    continue;
                }
            }
            (string kind, object? value) = ParseScalar(raw);
            values[key] = new(kind, value, lineNumber);
        }
        string body = string.Join('\n', lines.Skip(end + 1));
        if (content.EndsWith('\n'))
        {
            body += "\n";
        }
        return (values, body, end + 2);
    }

    public static int LineOf(string content, string needle)
    {
        int offset = content.IndexOf(needle, StringComparison.Ordinal);
        return offset < 0 ? 1 : content.AsSpan(0, offset).Count('\n') + 1;
    }

    public static string StripNonLinkMarkdown(string content, bool preserveInlineCode = false, bool preserveCodeBlocks = false)
    {
        Dictionary<string, string> tokens = new() { ["<!--"] = "\ue000", ["-->"] = "\ue001", ["%%"] = "\ue002" };
        content = Regex.Replace(content, @"(?<!`)(`+)(.*?)\1(?!`)", match =>
        {
            int lineStart = content.LastIndexOf('\n', Math.Max(0, match.Index - 1)) + 1;
            string prefix = ExpandTabs(content[lineStart..match.Index]);
            prefix = Regex.Replace(prefix, @"^(?:(?: {0,3}>[ \t]?)|(?: {0,3}(?:[-+*]|\d+[.)])[ \t]+))+", "");
            if (match.Groups[1].Length >= 3 && Regex.IsMatch(prefix, "^ {0,3}$"))
            {
                return match.Value;
            }
            return tokens.Aggregate(match.Value, (span, token) => span.Replace(token.Key, token.Value));
        }, RegexOptions.Singleline);
        var visible = new StringBuilder();
        string? commentEnd = null;
        (char Marker, int Length)? open = null;
        var tabsdown = new Stack<(char Marker, int Length)>();
        var listIndents = new List<int>();
        foreach (string rawLine in Lines(content, true))
        {
            string raw = rawLine.TrimEnd('\r', '\n');
            string ending = rawLine[raw.Length..];
            string contentLine = open is null ? StripComments(raw, ref commentEnd) : raw;
            string line = NormalizeContainerLine(ExpandTabs(contentLine), listIndents, open is not null);
            Match match = Regex.Match(line, @"^ {0,3}(`{3,}|~{3,})(.*)$");
            if (!match.Success)
            {
                bool indented = line.Length - line.TrimStart(' ').Length >= 4;
                visible.Append((open is not null || indented) && !preserveCodeBlocks ? ending : contentLine + ending);
                continue;
            }
            string fence = match.Groups[1].Value;
            string suffix = match.Groups[2].Value;
            if (open is not null)
            {
                if (fence[0] == open.Value.Marker && fence.Length >= open.Value.Length && string.IsNullOrWhiteSpace(suffix))
                {
                    open = null;
                }
            }
            else if (tabsdown.TryPeek(out var wrapper) && fence[0] == wrapper.Marker && fence.Length >= wrapper.Length && string.IsNullOrWhiteSpace(suffix))
            {
                tabsdown.Pop();
            }
            else if (suffix.Trim().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() == "tabsdown")
            {
                tabsdown.Push((fence[0], fence.Length));
            }
            else
            {
                open = (fence[0], fence.Length);
            }
            visible.Append(ending);
        }
        string result = Regex.Replace(visible.ToString(), @"(?<!`)(`+)(.*?)\1(?!`)",
            match => preserveInlineCode ? match.Groups[2].Value : new string('\n', match.Value.Count(character => character == '\n')), RegexOptions.Singleline);
        return tokens.Aggregate(result, (text, token) => text.Replace(token.Value, token.Key));
    }

    private static string StripComments(string line, ref string? commentEnd)
    {
        var visible = new StringBuilder();
        while (line.Length != 0)
        {
            if (commentEnd is not null)
            {
                int end = line.IndexOf(commentEnd, StringComparison.Ordinal);
                if (end < 0)
                {
                    break;
                }
                line = line[(end + commentEnd.Length)..];
                commentEnd = null;
                continue;
            }
            Match opener = Regex.Match(line, @"<!--|%%");
            if (!opener.Success)
            {
                visible.Append(line);
                break;
            }
            visible.Append(line.AsSpan(0, opener.Index));
            line = line[(opener.Index + opener.Length)..];
            commentEnd = opener.Value == "<!--" ? "-->" : "%%";
        }
        return visible.ToString();
    }

    public static string ExpandTabs(string text)
    {
        var expanded = new StringBuilder();
        foreach (char character in text)
        {
            expanded.Append(character == '\t' ? new string(' ', 4 - expanded.Length % 4) : character.ToString());
        }
        return expanded.ToString();
    }

    public static string NormalizeContainerLine(string line, List<int> listIndents, bool inCode = false)
    {
        line = Regex.Replace(line, @"^(?: {0,3}>[ \t]?)+", "");
        if (inCode)
        {
            foreach (int indent in listIndents.AsEnumerable().Reverse())
            {
                if (line.StartsWith(new string(' ', indent), StringComparison.Ordinal))
                {
                    line = line[indent..];
                    break;
                }
            }
        }
        else
        {
            Match item = Regex.Match(line, @"^( *)(?:[-+*]|\d+[.)])([ \t]+)(.*)$");
            if (item.Success)
            {
                int markerIndent = item.Groups[1].Length;
                listIndents.RemoveAll(indent => indent > markerIndent);
                listIndents.Add(item.Groups[3].Index);
                line = item.Groups[3].Value;
            }
            else
            {
                int leading = line.Length - line.TrimStart(' ').Length;
                while (listIndents.Count != 0 && line.Trim().Length != 0 && leading < listIndents[^1])
                {
                    listIndents.RemoveAt(listIndents.Count - 1);
                }
                if (listIndents.Count != 0 && leading >= listIndents[^1])
                {
                    line = line[listIndents[^1]..];
                }
            }
        }
        return Regex.Replace(line, @"^(?: {0,3}>[ \t]?)+", "");
    }

    public static string NormalizeHeadingContainers(string content)
    {
        content = Regex.Replace(content, @"^[ ]{0,3}<(?<tag>[A-Za-z][\w-]*)\b[^>]*>.*?^[ ]{0,3}</\k<tag>>[ \t]*(?=\r?$)",
            match => new string('\n', match.Value.Count(character => character == '\n')), RegexOptions.Multiline | RegexOptions.Singleline | RegexOptions.IgnoreCase);
        var indents = new List<int>();
        return string.Join('\n', Lines(content).Select(line => Regex.Replace(NormalizeContainerLine(ExpandTabs(line), indents),
            @"^(?:(?: {0,3}>[ \t]?)|(?: {0,3}(?:[-+*]|\d+[.)])[ \t]+))+", "")));
    }

    public static string VisibleHeadingText(string heading)
    {
        heading = Regex.Replace(heading, @"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]", match => match.Groups[2].Success ? match.Groups[2].Value : System.IO.Path.GetFileName(match.Groups[1].Value));
        heading = Regex.Replace(heading, @"!?\[([^\]]*)\]\([^)]*\)", "$1");
        heading = Regex.Replace(heading, @"~~(.+?)~~", "$1");
        heading = Regex.Replace(heading, @"(\*\*|__)(.+?)\1", "$2");
        heading = Regex.Replace(heading, @"(?<!\*)\*([^*\n]+)\*(?!\*)", "$1");
        heading = Regex.Replace(heading, @"(?<!_)_([^_\n]+)_(?!_)", "$1");
        return Regex.Replace(heading, @"\\([\\`*_{}\[\]()#+\-.!|>~])", "$1");
    }
}
