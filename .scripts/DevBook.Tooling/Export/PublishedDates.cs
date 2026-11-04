using System.Globalization;
using System.Text;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Export;

public static class PublishedDates
{
    private static readonly UTF8Encoding Utf8 = new(false, true);
    private static readonly Regex Property = new(@"\G([A-Za-z][A-Za-z0-9_-]*):[ \t]*([^\r\n]*)");

    public static void Restore(SyncerContext context, JsonObject original)
    {
        var restored = new List<string>();
        foreach (string path in context.GitPaths("diff", "--cached", "--name-only", "-z", "--diff-filter=M", "--", "Web/content"))
        {
            if (!path.StartsWith("Web/content/", StringComparison.Ordinal) || !path.EndsWith(".md", StringComparison.Ordinal))
            {
                continue;
            }
            string source = "Vault/Home/" + path["Web/content/".Length..];
            if (!original.Obj("sources").ContainsKey(source)
                || original.Obj("outputs")[path] is not JsonObject baseline)
            {
                continue;
            }
            Syncer.EnsureRegularPath(context.Root, source);
            Syncer.EnsureRegularPath(context.Root, path);
            byte[] previous = context.GitBytes("cat-file", "blob", baseline.Str("sha"));
            byte[] current = File.ReadAllBytes(Path.Combine(context.Root, path));
            byte[] input = File.ReadAllBytes(Path.Combine(context.Root, source));
            if (OnlyPublishedChanged(previous, current, input))
            {
                File.WriteAllBytes(Path.Combine(context.Root, path), previous);
                restored.Add(path);
            }
        }
        if (restored.Count != 0)
        {
            context.GitBytes(["add", "--", .. restored]);
        }
    }

    private static bool OnlyPublishedChanged(byte[] previous, byte[] current, byte[] source)
    {
        try
        {
            string oldText = Utf8.GetString(previous);
            string newText = Utf8.GetString(current);
            return TryFrontmatter(Utf8.GetString(source), out Dictionary<string, Match> input)
                && !input.Keys.Any(key => key is "published" or "publishDate" or "date")
                && TryFrontmatter(oldText, out Dictionary<string, Match> oldFields)
                && TryFrontmatter(newText, out Dictionary<string, Match> newFields)
                && oldFields.TryGetValue("published", out Match? oldPublished)
                && newFields.TryGetValue("published", out Match? newPublished)
                && Timestamp(oldPublished.Groups[2].Value) && Timestamp(newPublished.Groups[2].Value)
                && oldText.Remove(oldPublished.Groups[2].Index, oldPublished.Groups[2].Length)
                    == newText.Remove(newPublished.Groups[2].Index, newPublished.Groups[2].Length);
        }
        catch (DecoderFallbackException)
        {
            return false;
        }
    }

    private static bool Timestamp(string value) => DateTimeOffset.TryParseExact(value,
        "yyyy-MM-dd'T'HH:mm:ss.fff'Z'", CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out _);

    private static bool TryFrontmatter(string text, out Dictionary<string, Match> fields)
    {
        fields = new Dictionary<string, Match>(StringComparer.Ordinal);
        if (text.StartsWith('\uFEFF'))
        {
            return false;
        }
        if (!text.StartsWith("---", StringComparison.Ordinal))
        {
            return true;
        }
        Match frontmatter = Regex.Match(text, @"\A---\r?\n(?<fields>.*?)^---(?:\r?\n|\z)", RegexOptions.Singleline | RegexOptions.Multiline);
        if (!frontmatter.Success)
        {
            return false;
        }
        bool list = false;
        Group body = frontmatter.Groups["fields"];
        foreach (Match line in Regex.Matches(body.Value, @"[^\r\n]+"))
        {
            if (string.IsNullOrWhiteSpace(line.Value) || line.Value.TrimStart().StartsWith('#'))
            {
                continue;
            }
            if (list && Regex.IsMatch(line.Value, @"^\s+-\s+[^\r\n]*$"))
            {
                continue;
            }
            Match field = Property.Match(text, body.Index + line.Index);
            if (!field.Success || !fields.TryAdd(field.Groups[1].Value, field))
            {
                return false;
            }
            string value = field.Groups[2].Value;
            if (value.Length != 0 && ("|>&*!%@`".Contains(value[0])
                || value[0] is '\'' or '"' && !Regex.IsMatch(value, """^(?:'[^']*'|"[^"\\]*")$""")
                || value[0] == '[' && !value.EndsWith(']') || value[0] == '{' && !value.EndsWith('}')))
            {
                return false;
            }
            list = value.Length == 0;
        }
        return true;
    }
}
