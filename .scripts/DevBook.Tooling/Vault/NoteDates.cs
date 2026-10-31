using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using DevBook.Tooling.Infrastructure;

namespace DevBook.Tooling.Vault;

public sealed class NoteDateException(string message) : InvalidOperationException(message);

/// <summary>Prepares source dates before review, separately from immutable rendering.</summary>
public static class NoteDates
{
    private static readonly UTF8Encoding Utf8 = new(false, true);
    private static readonly Dictionary<string, string[]> Keys = new(StringComparer.Ordinal)
    {
        ["created"] = ["created", "created_at", "date"],
        ["modified"] = ["modified", "lastmod", "updated", "last-modified"]
    };
    private static readonly HashSet<string> IgnoredKeys = [.. Keys.Values.SelectMany(values => values), "published", "publishDate"];
    private static readonly Regex Property = new("^(?<key>[A-Za-z][A-Za-z0-9_-]*|\"[^\"]+\"|'[^']+'):\\s*(?<value>.*?)\\s*$", RegexOptions.CultureInvariant);
    private sealed record Metadata(List<string> Lines, int End, Dictionary<string, string> Dates, Dictionary<string, int> Positions, HashSet<int> Ignored);

    public static string Timestamp(string value)
    {
        string raw = value.Trim();
        if (raw.Length >= 2 && raw[0] == raw[^1] && raw[0] is '"' or '\'')
        {
            raw = raw[1..^1];
        }
        if (Regex.IsMatch(raw, @"^\d{4}-\d{2}-\d{2}$", RegexOptions.CultureInvariant)
            && DateOnly.TryParseExact(raw, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateOnly day))
        {
            return Format(new DateTimeOffset(day.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero));
        }
        if (!Regex.IsMatch(raw, @"^\d{4}-\d{2}-\d{2}[Tt ]\d{2}:\d{2}(?::\d{2}(?:[.,]\d+)?)?(?:[Zz]|[+-]\d{2}:?\d{2})$", RegexOptions.CultureInvariant)
            || !DateTimeOffset.TryParse(raw.Replace(',', '.'), CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTimeOffset timestamp))
        {
            throw new NoteDateException("Date properties must be ISO 8601 dates or timestamps with a timezone");
        }
        return Format(timestamp);
    }

    public static string Format(DateTimeOffset value) => value.ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", CultureInfo.InvariantCulture);

    private static List<string> Lines(string text)
    {
        var lines = new List<string>();
        int start = 0;
        for (var index = 0; index < text.Length; index++)
        {
            if (text[index] == '\r' || text[index] == '\n')
            {
                if (text[index] == '\r' && index + 1 < text.Length && text[index + 1] == '\n')
                {
                    index++;
                }
                lines.Add(text[start..(index + 1)]);
                start = index + 1;
            }
        }
        if (start < text.Length)
        {
            lines.Add(text[start..]);
        }
        return lines;
    }

    private static Metadata Frontmatter(byte[] data, IReadOnlySet<string>? fields = null)
    {
        List<string> lines;
        try
        {
            lines = Lines(Utf8.GetString(data));
        }
        catch (DecoderFallbackException error)
        {
            throw new NoteDateException($"Note metadata must be UTF-8: {error.Message}");
        }
        var dates = new Dictionary<string, string>(StringComparer.Ordinal);
        var positions = new Dictionary<string, int>(StringComparer.Ordinal);
        var ignored = new HashSet<int>();
        if (lines.Count == 0 || lines[0].Trim() != "---")
        {
            return new(lines, 0, dates, positions, ignored);
        }
        int end = lines.FindIndex(1, line => line.Trim() == "---");
        if (end < 0)
        {
            throw new NoteDateException("Unclosed note frontmatter");
        }
        var owned = (fields ?? Keys.Keys.ToHashSet(StringComparer.Ordinal)).SelectMany(field => Keys[field]).ToHashSet(StringComparer.Ordinal);
        for (var index = 1; index < end; index++)
        {
            Match match = Property.Match(lines[index].TrimEnd('\r', '\n'));
            if (!match.Success)
            {
                continue;
            }
            string key = match.Groups["key"].Value.Trim('"', '\'');
            if (IgnoredKeys.Contains(key))
            {
                ignored.Add(index);
            }
            if (!owned.Contains(key))
            {
                continue;
            }
            if (dates.ContainsKey(key))
            {
                throw new NoteDateException($"Duplicate date property: {key}");
            }
            string value = Regex.Replace(match.Groups["value"].Value, @"\s+#.*$", "", RegexOptions.CultureInvariant);
            dates[key] = Timestamp(value);
            positions[key] = index;
        }
        return new(lines, end, dates, positions, ignored);
    }

    public static IReadOnlyDictionary<string, string?> Read(byte[] data, IReadOnlySet<string>? fields = null)
    {
        Metadata parsed = Frontmatter(data, fields);
        return Keys.Where(pair => fields is null || fields.Contains(pair.Key)).ToDictionary(pair => pair.Key,
            pair => pair.Value.Select(alias => parsed.Dates.GetValueOrDefault(alias)).FirstOrDefault(value => value is not null), StringComparer.Ordinal);
    }

    public static byte[] MeaningfulContent(byte[] data)
    {
        Metadata parsed = Frontmatter(data);
        IEnumerable<string> lines;
        if (parsed.End > 0 && !Enumerable.Range(1, parsed.End - 1).Any(index => !parsed.Ignored.Contains(index) && !string.IsNullOrWhiteSpace(parsed.Lines[index])))
        {
            lines = parsed.Lines.Skip(parsed.End + 1);
        }
        else
        {
            lines = parsed.Lines.Where((_, index) => !parsed.Ignored.Contains(index));
        }
        return Utf8.GetBytes(string.Concat(lines).Replace("\r\n", "\n", StringComparison.Ordinal));
    }

    private static byte[] WithDates(byte[] data, IReadOnlyDictionary<string, string?> dates)
    {
        if (dates.Keys.Any(key => !Keys.ContainsKey(key)))
        {
            throw new NoteDateException("Only created and modified are owned by this helper");
        }
        Metadata parsed = Frontmatter(data, dates.Keys.ToHashSet(StringComparer.Ordinal));
        string newline = Utf8.GetString(data).Contains("\r\n", StringComparison.Ordinal) ? "\r\n" : "\n";
        List<string> prefix = parsed.End == 0 ? ["---" + newline] : parsed.Lines.Take(parsed.End).ToList();
        List<string> suffix = parsed.End == 0 ? ["---" + newline, .. parsed.Lines] : parsed.Lines.Skip(parsed.End).ToList();
        foreach ((string field, string? value) in dates)
        {
            if (value is null || parsed.Dates.GetValueOrDefault(field) == value)
            {
                continue;
            }
            string line = $"{field}: \"{value}\"{newline}";
            if (parsed.Positions.TryGetValue(field, out int position))
            {
                prefix[position] = line;
            }
            else
            {
                prefix.Add(line);
            }
        }
        return Utf8.GetBytes(string.Concat(prefix.Concat(suffix)));
    }

    /// <summary>Transforms a selected candidate against its actual topic-parent bytes without side effects.</summary>
    public static byte[] Prepare(byte[] candidate, byte[]? parent, DateTimeOffset instant, IReadOnlyList<string>? history = null)
    {
        IReadOnlyDictionary<string, string?> current = Read(candidate);
        IReadOnlyDictionary<string, string?> previous = parent is null
            ? new Dictionary<string, string?> { ["created"] = null, ["modified"] = null }
            : Read(parent);
        string now = Format(instant);
        string created = current["created"] ?? previous["created"] ?? (parent is not null && history is { Count: > 0 } ? Timestamp(history[^1]) : now);
        bool meaningful = parent is null || !MeaningfulContent(candidate).AsSpan().SequenceEqual(MeaningfulContent(parent));
        string modified = meaningful ? now : previous["modified"] ?? current["modified"] ?? (history is { Count: > 0 } ? Timestamp(history[0]) : now);
        return WithDates(candidate, new Dictionary<string, string?> { ["created"] = created, ["modified"] = modified });
    }

    private static ProcessResult RunGit(string root, params string[] args) => new SystemProcessRunner()
        .RunAsync(new ProcessRequest("git", ["--literal-pathspecs", .. args], root)).GetAwaiter().GetResult();

    private static byte[] GitBytes(string root, params string[] args) => RunGit(root, args).EnsureSuccess("Git date operation").Output;

    private static string GitText(string root, params string[] args) => Encoding.UTF8.GetString(GitBytes(root, args)).TrimEnd('\r', '\n');

    private static bool Eligible(string path) => path.StartsWith("Vault/Home/", StringComparison.Ordinal) && path.EndsWith(".md", StringComparison.Ordinal);

    private static byte[] NormalizeNewlines(byte[] data) => Utf8.GetBytes(Utf8.GetString(data).Replace("\r\n", "\n", StringComparison.Ordinal));

    private static string SafeTarget(string root, string relative)
    {
        string fullRoot = Path.GetFullPath(root);
        string target = Path.GetFullPath(Path.Combine(fullRoot, relative));
        if (!Eligible(relative) || !target.StartsWith(fullRoot + Path.DirectorySeparatorChar, StringComparison.Ordinal) || !File.Exists(target) || new FileInfo(target).LinkTarget is not null)
        {
            throw new NoteDateException($"Unsafe note path: {relative}");
        }
        string? directory = Path.GetDirectoryName(target);
        while (directory is not null && directory != fullRoot)
        {
            if (new DirectoryInfo(directory).LinkTarget is not null)
            {
                throw new NoteDateException($"Unsafe note path: {relative}");
            }
            directory = Path.GetDirectoryName(directory);
        }
        return target;
    }

    private static Dictionary<string, byte[]> Index(string root)
    {
        var files = new Dictionary<string, byte[]>(StringComparer.Ordinal);
        string[] rows = Encoding.UTF8.GetString(GitBytes(root, "ls-files", "--stage", "-z", "--", "Vault/Home")).Split('\0', StringSplitOptions.RemoveEmptyEntries);
        foreach (string row in rows)
        {
            string[] parts = row.Split('\t', 2);
            if (parts.Length != 2 || !Eligible(parts[1]))
            {
                continue;
            }
            string[] metadata = parts[0].Split(' ');
            if (metadata.Length != 3 || metadata[2] != "0" || metadata[0] is not ("100644" or "100755"))
            {
                throw new NoteDateException($"Unsupported or unmerged note: {parts[1]}");
            }
            byte[] indexed = GitBytes(root, "cat-file", "blob", metadata[1]);
            string target = SafeTarget(root, parts[1]);
            byte[] actual = File.ReadAllBytes(target);
            if (NormalizeNewlines(actual).AsSpan().SequenceEqual(NormalizeNewlines(indexed)))
            {
                indexed = actual;
            }
            files[parts[1]] = indexed;
        }
        return files;
    }

    private static IReadOnlyList<string> History(string root, string path)
    {
        if (GitText(root, "rev-parse", "--is-shallow-repository") == "true")
        {
            throw new NoteDateException("Full Git history is required to initialize historical note dates; fetch missing history first");
        }
        return GitText(root, "log", "--follow", "--format=%aI", "--", path).Split('\n', StringSplitOptions.RemoveEmptyEntries).Select(Timestamp).ToList();
    }

    private static void Guard(string root, IReadOnlyDictionary<string, byte[]> files)
    {
        foreach ((string path, byte[] expected) in files)
        {
            if (!File.ReadAllBytes(SafeTarget(root, path)).AsSpan().SequenceEqual(expected))
            {
                throw new NoteDateException($"Note has unstaged or concurrent edits: {path}");
            }
        }
    }

    private static IReadOnlyList<string> Apply(string root, IReadOnlyDictionary<string, byte[]> before, IReadOnlyDictionary<string, byte[]> changes, bool stage)
    {
        Guard(root, before);
        string[] changed = changes.Where(pair => !pair.Value.AsSpan().SequenceEqual(before[pair.Key])).Select(pair => pair.Key).ToArray();
        foreach (string path in changed)
        {
            if (!File.ReadAllBytes(SafeTarget(root, path)).AsSpan().SequenceEqual(before[path]))
            {
                throw new NoteDateException($"Concurrent note edit: {path}");
            }
            File.WriteAllBytes(SafeTarget(root, path), changes[path]);
        }
        var expected = before.ToDictionary(pair => pair.Key, pair => pair.Value, StringComparer.Ordinal);
        foreach ((string path, byte[] data) in changes)
        {
            expected[path] = data;
        }
        Guard(root, expected);
        if (changed.Length > 0 && stage)
        {
            GitBytes(root, ["add", "--", .. changed]);
        }
        Guard(root, expected);
        Dictionary<string, byte[]> indexed = Index(root);
        foreach ((string path, byte[] data) in stage ? expected : before)
        {
            if (!indexed.TryGetValue(path, out byte[]? indexedData) || !NormalizeNewlines(indexedData).AsSpan().SequenceEqual(NormalizeNewlines(data)))
            {
                throw new NoteDateException($"Concurrent staged note edit: {path}");
            }
        }
        Guard(root, expected);
        return changed;
    }

    /// <summary>Local commit adapter: callers hold the shared export lock and all-source staging guard.</summary>
    public static Dictionary<string, byte[]> PrepareLocal(string root, DateTimeOffset? now = null, IReadOnlyDictionary<string, byte[]>? expectedHashes = null)
    {
        root = Path.GetFullPath(root);
        DateTimeOffset instant = now ?? DateTimeOffset.UtcNow;
        Dictionary<string, byte[]> files = Index(root);
        if (expectedHashes is not null)
        {
            foreach ((string path, byte[] data) in files)
            {
                if (!expectedHashes.TryGetValue(path, out byte[]? expected) || !SHA256.HashData(data).AsSpan().SequenceEqual(expected))
                {
                    throw new NoteDateException($"Source changed before date preparation: {path}");
                }
            }
        }
        Guard(root, files);
        ProcessResult head = RunGit(root, "rev-parse", "--verify", "HEAD");
        string revision = head.ExitCode == 0 ? head.Stdout.Trim() : "";
        string cachePath = GitText(root, "rev-parse", "--git-path", "note-dates-pending.json");
        cachePath = Path.GetFullPath(cachePath, root);
        var cache = new JsonObject();
        if (File.Exists(cachePath))
        {
            try
            {
                cache = JsonNode.Parse(File.ReadAllText(cachePath)) as JsonObject ?? throw new JsonException("Expected object");
                foreach ((_, JsonNode? entry) in cache)
                {
                    if (entry is not JsonObject || entry["head"] is not JsonValue headValue || !headValue.TryGetValue<string>(out _)
                        || !Regex.IsMatch(entry["fingerprint"]?.GetValue<string>() ?? "", "^[0-9a-f]{64}$", RegexOptions.CultureInvariant))
                    {
                        throw new JsonException("Invalid cache entry");
                    }
                    Timestamp(entry["modified"]!.GetValue<string>());
                }
            }
            catch (Exception error) when (error is JsonException or InvalidOperationException or IOException)
            {
                throw new NoteDateException("Invalid pending note-date cache");
            }
        }
        foreach (string key in cache.Select(pair => pair.Key).Where(key => !files.ContainsKey(key)).ToList())
        {
            cache.Remove(key);
        }
        var renames = new Dictionary<string, string>(StringComparer.Ordinal);
        string[] rows = Encoding.UTF8.GetString(GitBytes(root, "diff", "--cached", "--name-status", "-z", "-M")).Split('\0');
        for (var index = 0; index < rows.Length && rows[index].Length > 0;)
        {
            if (rows[index].StartsWith('R') || rows[index].StartsWith('C'))
            {
                if (rows[index].StartsWith('R'))
                {
                    renames[rows[index + 2]] = rows[index + 1];
                }
                index += 3;
            }
            else
            {
                index += 2;
            }
        }
        var changes = new Dictionary<string, byte[]>(StringComparer.Ordinal);
        foreach ((string path, byte[] data) in files)
        {
            string source = renames.GetValueOrDefault(path, path);
            ProcessResult prior = RunGit(root, "show", "HEAD:" + source);
            byte[]? parent = prior.ExitCode == 0 ? prior.Output : null;
            IReadOnlyDictionary<string, string?> currentDates = Read(data);
            IReadOnlyDictionary<string, string?> previousDates = parent is null ? new Dictionary<string, string?> { ["created"] = null, ["modified"] = null } : Read(parent);
            IReadOnlyList<string>? history = null;
            bool changed = parent is null || !MeaningfulContent(data).AsSpan().SequenceEqual(MeaningfulContent(parent));
            string fingerprint = Convert.ToHexStringLower(SHA256.HashData(MeaningfulContent(data)));
            if (parent is not null && (currentDates["created"] is null && previousDates["created"] is null || !changed && currentDates["modified"] is null && previousDates["modified"] is null))
            {
                history = History(root, source);
            }
            DateTimeOffset operationInstant = instant;
            if (changed)
            {
                JsonNode? saved = cache[path];
                if (saved?["head"]?.GetValue<string>() == revision && saved["fingerprint"]?.GetValue<string>() == fingerprint)
                {
                    operationInstant = DateTimeOffset.Parse(Timestamp(saved["modified"]!.GetValue<string>()), CultureInfo.InvariantCulture);
                }
                cache[path] = new JsonObject { ["head"] = revision, ["fingerprint"] = fingerprint, ["modified"] = Format(operationInstant) };
            }
            else
            {
                cache.Remove(path);
            }
            changes[path] = Prepare(data, parent, operationInstant, history);
        }
        IReadOnlyList<string> changedPaths = Apply(root, files, changes, true);
        string temporary = cachePath + ".tmp";
        File.WriteAllText(temporary, cache.ToJsonString() + "\n", new UTF8Encoding(false));
        File.Move(temporary, cachePath, true);
        return changedPaths.ToDictionary(path => path, path => SHA256.HashData(changes[path]), StringComparer.Ordinal);
    }

    public static Dictionary<string, byte[]> BackfillCreated(string root, bool write = false)
    {
        Dictionary<string, byte[]> files = Index(root);
        var changes = new Dictionary<string, byte[]>(StringComparer.Ordinal);
        var before = new Dictionary<string, byte[]>(StringComparer.Ordinal);
        foreach ((string path, byte[] indexed) in files)
        {
            byte[] data = File.ReadAllBytes(SafeTarget(root, path));
            Metadata metadata = Frontmatter(data, new HashSet<string>(StringComparer.Ordinal) { "created" });
            if (metadata.Dates.ContainsKey("created"))
            {
                continue;
            }
            before[path] = indexed;
            Guard(root, new Dictionary<string, byte[]> { [path] = indexed });
            ProcessResult previous = RunGit(root, "show", "HEAD:" + path);
            if (previous.ExitCode != 0 || !NormalizeNewlines(previous.Output).AsSpan().SequenceEqual(NormalizeNewlines(data)))
            {
                throw new NoteDateException($"Creation-date backfill requires a clean committed source: {path}");
            }
            string? created = Read(data, new HashSet<string>(StringComparer.Ordinal) { "created" })["created"];
            if (created is null)
            {
                IReadOnlyList<string> history = History(root, path);
                created = history.Count > 0 ? history[^1] : throw new NoteDateException($"No Git creation history is available: {path}");
            }
            changes[path] = WithDates(data, new Dictionary<string, string?> { ["created"] = created });
        }
        string[] changed = changes.Where(pair => !pair.Value.AsSpan().SequenceEqual(before[pair.Key])).Select(pair => pair.Key).ToArray();
        if (write)
        {
            Apply(root, before, changes, false);
        }
        else
        {
            Guard(root, before);
        }
        return changed.ToDictionary(path => path, path => SHA256.HashData(changes[path]), StringComparer.Ordinal);
    }

    public static Task<int> RunAsync(string[] args)
    {
        if (args.Contains("--help") || args.Contains("-h"))
        {
            Console.WriteLine("Backfill canonical created metadata from Git without staging. --backfill-created [--write] [--repo-root <checkout>]");
            return Task.FromResult(0);
        }
        try
        {
            string? root = null;
            for (var index = 0; index < args.Length; index++)
            {
                if (args[index] == "--repo-root" && index + 1 < args.Length)
                {
                    root = Path.GetFullPath(args[++index]);
                }
                else if (args[index] is not ("--write" or "--backfill-created"))
                {
                    throw new ArgumentException($"Unknown or incomplete argument: {args[index]}");
                }
            }
            if (!args.Contains("--backfill-created"))
            {
                throw new ArgumentException("--backfill-created is required");
            }
            root ??= Repository.FindRoot();
            Dictionary<string, byte[]> changes = BackfillCreated(root, args.Contains("--write"));
            Console.WriteLine(JsonSerializer.Serialize(new { mode = args.Contains("--write") ? "write" : "dry-run", changed = changes.Keys }, new JsonSerializerOptions { WriteIndented = true }));
            return Task.FromResult(0);
        }
        catch (Exception error) when (error is InvalidOperationException or IOException or ArgumentException)
        {
            Console.Error.WriteLine($"[note-dates] {error.Message}");
            return Task.FromResult(1);
        }
    }
}
